
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const POSE_IMAGES = {
  "Tree Pose": "/poses/tree-pose.jpg",
  "Chair Pose": "/poses/Chair Pose.png",
  "Cobra Pose": "/poses/Cobra Pose.png",
  "Child Pose": "/poses/Child Pose.png",
  "Cat Pose": "/poses/Cat Pose.png",
  "Crane Pose": "/poses/Crane Pose.png",
  "Dolphin Pose": "/poses/Dolphin Pose.png",
  "Extended Side Angle Pose": "/poses/Extended Side Angle Pose.png",
  "Extended Triangular Pose": "/poses/Extended Triangular Pose.png",
  "Featured Peacock Pose": "/poses/Featured Peacock Pose.png",
  "Firefly Pose": "/poses/Firefly Pose.png",
  "Wall Pose": "/poses/Wall Pose.png",
  "Plow Pose": "/poses/Plow Pose.png",
  "Balasana": "/poses/Balasana.png",
  "Dhanurasana": "/poses/Dhanurasana.png",
  "Garudasana": "/poses/Garudasana.png",
  "Halasana": "/poses/Halasana.png",
  "Hanumasana": "/poses/Hanumasana.png",
  "Malasana": "/poses/Malasana.png",
  "Marjaryasana": "/poses/Marjaryasana.png",
  "Savasana": "/poses/Savasana.png",
  "Trikonasana": "/poses/Trikonasana.jpeg",
  "Ustrasana": "/poses/Ustrasana.jpeg",
  "Virabhadrasana": "/poses/Virabhadrasana.png",
  "Virasana": "/poses/Virasanaa.png",
  "Adho mukha svanasana": "poses/Adho mukha svanasana.png",
  "Adho mukha vrakshasana": "poses/Adho mukha vrakshasana.webp",
  "Alonasana":"poses/Alonasana.jpeg",
  "Anjaneyasana":"poses/Anjaneyasana.png",
  "Ardha chandrasana":"poses/Ardha chandrasana.png",
  "Ardha navasana":"poses/Ardha navasana.png",
  "Ardha pincha mayurasana":"poses/Ardha pincha mayurasana.jpeg",
  "Ashta chandrasana":"poses/Ashta chandrasana.jpeg",
  "Baddha konasana":"poses/Baddha konasana.png",
  "Godnesspose":"poses/Godnesspose.png",
  "Navasana":"poses/Navasana.jpeg",
  "Padangusthasana":"poses/Padangusthasana.png",
  "Paripurna Navasana":"poses/Paripurna Navasana.png",
  "Parsva virabhadrasana":"poses/Parsva virabhadrasana.jpeg",
  "Phalakasana":"poses/Phalakasana.jpeg",
  "Salamba bhujangasana":"poses/Salamba bhujangasana.png",
  "Salamba sarvangasana":"poses/Salamba sarvangasana.png",
  "Setu bandha sarvangasana":"poses/Setu bandha sarvangasana.png",
  "Setu Bandhasana":"poses/Setu Bandhasana.png",
  "Sukhagomukhasana":"poses/Sukhagomukhasana.png",
  "Urdhva dhanurasana":"poses/Urdhva dhanurasana.png",
  "Urdhva Mukha Svanasana":"poses/Urdhva Mukha Svanasana.jpg",
  "Uthitha Hasta Padangusthasana":"poses/Uthitha Hasta Padangusthasana.jpg",
  "Utkatasana":"poses/Utkatasana.png",
  "Vakrasana":"poses/Vakrasana.png",
  "Vasisthasana":"poses/Vasisthasana.jpg"
};

const Index = () => {
  const { toast } = useToast();
  const [selectedPose, setSelectedPose] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentHoldTime, setCurrentHoldTime] = useState(0);
  const [bestHoldTime, setBestHoldTime] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holdStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        captureFrame();
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsRecording(true);
      setElapsedTime(0);
      setCurrentHoldTime(0);
      setBestHoldTime(0);
      holdStartTimeRef.current = null;

      toast({
        title: "Camera Started",
        description: "Your camera feed is now active. Strike your pose!",
      });
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setElapsedTime(0);
      setCurrentHoldTime(0);
      holdStartTimeRef.current = null;
    }
    toast({
      title: "Session Ended",
      description: `Best hold time: ${bestHoldTime.toFixed(1)} seconds`,
    });
  };

  const handlePoseSelect = (value: string) => {
    setSelectedPose(value);
    setFeedback([]);
    setBestHoldTime(0);
    setCurrentHoldTime(0);
    holdStartTimeRef.current = null;
    toast({
      title: "Pose Selected",
      description: `Selected: ${value}. Get ready to strike the pose!`,
    });
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedPose) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const imageData = canvasRef.current.toDataURL('image/jpeg');

    try {
      const response = await fetch('http://localhost:5000/analyze_pose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frame: imageData,
          pose: selectedPose,
        }),
      });

      const data = await response.json();
      const currentFeedback = data.feedback || [];
      setFeedback(currentFeedback);

      if (data.isCorrect) {
        if (holdStartTimeRef.current === null) {
          holdStartTimeRef.current = Date.now();
        }
        const currentHold = (Date.now() - holdStartTimeRef.current) / 1000;
        setCurrentHoldTime(currentHold);
        setBestHoldTime(prev => Math.max(prev, currentHold));
      } else {
        holdStartTimeRef.current = null;
        setCurrentHoldTime(0);
      }

      if (data.frameWithLandmarks) {
        const videoElement = document.createElement('img');
        videoElement.src = data.frameWithLandmarks;
        if (videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            videoElement.onload = () => {
              ctx.drawImage(videoElement, 0, 0, canvasRef.current.width, canvasRef.current.height);
              
              // Calculate dynamic height for the overlay based on feedback
              const overlayHeight = currentFeedback.length > 0 ? 
                currentFeedback.length * 30 + 40 : // Height for feedback items
                60; // Minimum height
              
              // Add semi-transparent background for instructions
              ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
              ctx.fillRect(10, 10, 300, overlayHeight);
              
              // Add title
              ctx.font = 'bold 16px Arial';
              ctx.fillStyle = 'white';
              ctx.fillText('Instructions:', 20, 35);
              
              // Add feedback or success message
              if (currentFeedback.length > 0) {
                ctx.font = '14px Arial';
                currentFeedback.forEach((item, index) => {
                  ctx.fillText(`• ${item}`, 20, 60 + index * 25);
                });
              } else if (data.isCorrect) {
                ctx.fillText('Great! Hold this pose', 20, 60);
              } else {
                ctx.fillText('Adjust your position to match the reference pose', 20, 60);
              }
            };
          }
        }
      }
    } catch (error) {
      console.error('Error analyzing pose:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">AI Yoga Assistant</h1>
          <p className="text-gray-600">Perfect your yoga poses with real-time feedback</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Reference Pose</h2>
            {selectedPose ? (
              <img
                id="reference-image"
                src={POSE_IMAGES[selectedPose]}
                alt={selectedPose}
                className="rounded-lg w-full h-auto object-contain"
              />
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Select a pose to view the reference</p>
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-6">
            <Select onValueChange={handlePoseSelect} value={selectedPose}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a pose" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(POSE_IMAGES).map((pose) => (
                  <SelectItem key={pose} value={pose}>
                    {pose}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-4">
              <Button 
                onClick={startCamera} 
                disabled={!selectedPose || isRecording}
                className="flex-1"
              >
                Start Practice
              </Button>
              <Button 
                onClick={stopCamera} 
                disabled={!isRecording} 
                variant="destructive"
                className="flex-1"
              >
                End Session
              </Button>
            </div>

            <canvas 
              ref={canvasRef} 
              className="rounded-lg w-full h-auto bg-black"
              style={{ display: isRecording ? 'block' : 'none' }}
            />
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="rounded-lg w-full h-auto bg-black"
              style={{ display: isRecording ? 'none' : 'block' }}
            />

            {isRecording && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Elapsed Time</p>
                    <p className="text-xl font-semibold">{elapsedTime}s</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Current Hold</p>
                    <p className="text-xl font-semibold">{currentHoldTime.toFixed(1)}s</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Best Hold</p>
                    <p className="text-xl font-semibold">{bestHoldTime.toFixed(1)}s</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
