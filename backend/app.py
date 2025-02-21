
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
import base64
import time
import os

app = Flask(__name__)
CORS(app)

mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0:
        angle = 360 - angle
    return angle

def extract_angles(landmarks):
    angles = {
        "Right Elbow": calculate_angle(
            [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y],
            [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y],
            [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].y]
        ),
        "Left Elbow": calculate_angle(
            [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y],
            [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y],
            [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
        ),
        "Right Knee": calculate_angle(
            [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y],
            [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y],
            [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
        ),
        "Left Knee": calculate_angle(
            [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y],
            [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y],
            [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
        ),
        "Right Hip": calculate_angle(
            [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y],
            [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y],
            [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
        ),
        "Left Hip": calculate_angle(
            [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y],
            [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y],
            [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
        )
    }
    return angles


def calculate_target_angles(pose_name):
    # Define possible file extensions and their corresponding paths
    extensions = ['.png', '.jpg', '.jpeg']
    base_path = os.path.join(os.path.dirname(__file__), 'refs')
    
    # Try different possible filenames
    possible_paths = [
        os.path.join(base_path, f"{pose_name}{ext}") for ext in extensions
    ]
    
    # Add special case for "Tree Pose"
    if pose_name == "Tree Pose":
        possible_paths.append(os.path.join(base_path, "tree-pose.jpg"))
        
    else:
        possible_paths.append(os.path.join(base_path, pose_name+".jpg"))
    
    # Try each possible path
    for reference_path in possible_paths:
        try:
            if os.path.exists(reference_path):
                reference_image = cv2.imread(reference_path)
                if reference_image is not None:
                    with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
                        reference_rgb = cv2.cvtColor(reference_image, cv2.COLOR_BGR2RGB)
                        reference_results = pose.process(reference_rgb)
                        
                        if not reference_results.pose_landmarks:
                            print(f"No pose detected in reference image: {reference_path}")
                            continue
                            
                        reference_angles = extract_angles(reference_results.pose_landmarks.landmark)
                        print(f"Successfully calculated angles for {pose_name} using {reference_path}")
                        return reference_angles
                        
        except Exception as e:
            print(f"Error processing reference image {reference_path}: {str(e)}")
            continue
    
    print(f"Could not find or process any reference image for pose: {pose_name}")
    print(f"Tried paths: {possible_paths}")
    return None

def generate_feedback(user_angles, target_angles, threshold=15):
    feedback = []
    if not target_angles:
        return ["Reference pose not found, ensure correct pose selection."]
    
    for joint, user_angle in user_angles.items():
        target_angle = target_angles.get(joint)
        if target_angle is None:
            continue

        angle_difference = user_angle - target_angle

        if abs(angle_difference) > threshold:
            if angle_difference < 0:
                feedback.append(f"Try raising your {joint.lower()} a bit.")
            else:
                feedback.append(f"Try lowering your {joint.lower()} slightly.")
        elif abs(angle_difference) > threshold / 2:
            feedback.append(f"Almost perfect! Just fine-tune your {joint.lower()}.")

    if not feedback:
        feedback.append("Great job! Your pose is well-aligned.")
    
    return feedback

def is_pose_correct(user_angles, target_angles, threshold=10, required_match_ratio=0.7):
    if not target_angles:
        return False

    correct_joints = sum(
        1 for joint, target_angle in target_angles.items()
        if abs(user_angles.get(joint, 0) - target_angle) <= threshold
    )

    match_ratio = correct_joints / len(target_angles)
    
    return match_ratio >= required_match_ratio  # Ensures at least 70% keypoints match

@app.route('/analyze_pose', methods=['POST'])
def analyze_pose():
    data = request.json
    frame_data = data.get('frame')
    pose_name = data.get('pose')
    
    try:
        # Get target angles for the selected pose
        target_angles = calculate_target_angles(pose_name)
        if target_angles is None:
            return jsonify({
                'feedback': ['Could not calculate target angles for this pose'],
                'isCorrect': False,
            })

        # Decode base64 image
        nparr = np.frombuffer(base64.b64decode(frame_data.split(',')[1]), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
            results = pose.process(frame_rgb)

            # **New Condition: Ensure Full Body is Visible**
            if not results.pose_landmarks or len(results.pose_landmarks.landmark) < 15:  
                return jsonify({
                    'feedback': ['Make sure your whole body is visible to the camera.'],
                    'isCorrect': False,
                })

            # Extract angles and compare with target pose
            user_angles = extract_angles(results.pose_landmarks.landmark)
            feedback = generate_feedback(user_angles, target_angles)
            is_correct = is_pose_correct(user_angles, target_angles)

            # Draw pose landmarks on frame
            annotated_frame = frame.copy()
            mp_drawing.draw_landmarks(
                annotated_frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=3, circle_radius=3),
                mp_drawing.DrawingSpec(color=(255, 0, 0), thickness=3, circle_radius=2)
            )
            
            # Convert frame back to base64
            _, buffer = cv2.imencode('.jpg', annotated_frame)
            frame_with_landmarks = base64.b64encode(buffer).decode('utf-8')
            
            return jsonify({
                'feedback': feedback,
                'isCorrect': is_correct,
                'frameWithLandmarks': f"data:image/jpeg;base64,{frame_with_landmarks}"
            })
            
    except Exception as e:
        print(f"Error processing frame: {str(e)}")
        return jsonify({
            'feedback': ['Error processing frame'],
            'isCorrect': False,
        })


if __name__ == '__main__':
    app.run(debug=True)
