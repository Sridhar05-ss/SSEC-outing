import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const FaceTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<string>("");
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load face-api.js models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Loading face-api.js models...');
        // Use CDN models instead of local files
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        setModelsLoaded(true);
        console.log('All face-api.js models loaded.');
      } catch (err) {
        setCameraError("Failed to load face recognition models.");
        console.error('Model loading error:', err);
      }
    };
    loadModels();

    // Cleanup function
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setCameraError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      setCameraError("Camera not available or permission denied.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsDetecting(false);
    setDetectionResult("");
  };

  const startDetection = () => {
    if (!modelsLoaded) {
      setCameraError("Models not loaded yet. Please wait.");
      return;
    }
    if (!videoRef.current || !canvasRef.current) {
      setCameraError("Video or canvas not available.");
      return;
    }
    
    setIsDetecting(true);
    setDetectionResult("Detecting faces...");
    
    // Start detection loop
    detectionIntervalRef.current = setInterval(detectFaces, 100);
  };

  const stopDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsDetecting(false);
    setDetectionResult("");
  };

  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      const detections = await faceapi.detectAllFaces(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptors();
      
      // Draw detections on canvas
      const displaySize = { width: videoRef.current.width, height: videoRef.current.height };
      faceapi.matchDimensions(canvasRef.current, displaySize);
      
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvasRef.current.getContext('2d');
      
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
      }
      
      // Update detection result
      if (detections.length > 0) {
        setDetectionResult(`Detected ${detections.length} face(s)`);
      } else {
        setDetectionResult("No faces detected");
      }
    } catch (error) {
      console.error("Detection error:", error);
      setDetectionResult("Detection error occurred");
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontWeight: 700, color: '#1848c1', marginBottom: 24 }}>Face Recognition Test</h1>
      
      <div style={{ marginBottom: 24 }}>
        <p>This page allows you to test the face recognition functionality of the application.</p>
        <p>Click "Start Camera" to begin, then "Start Detection" to detect faces in real-time.</p>
      </div>
      
      {/* Controls */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button 
          onClick={startCamera}
          disabled={!!stream}
          style={{ 
            background: '#2563eb', 
            color: 'white', 
            border: 'none', 
            borderRadius: 6, 
            padding: '10px 20px', 
            fontWeight: 500, 
            cursor: stream ? 'not-allowed' : 'pointer',
            opacity: stream ? 0.7 : 1
          }}
        >
          Start Camera
        </button>
        
        <button 
          onClick={stopCamera}
          disabled={!stream}
          style={{ 
            background: '#ef4444', 
            color: 'white', 
            border: 'none', 
            borderRadius: 6, 
            padding: '10px 20px', 
            fontWeight: 500, 
            cursor: !stream ? 'not-allowed' : 'pointer',
            opacity: !stream ? 0.7 : 1
          }}
        >
          Stop Camera
        </button>
        
        <button 
          onClick={startDetection}
          disabled={!stream || !modelsLoaded || isDetecting}
          style={{ 
            background: '#10b981', 
            color: 'white', 
            border: 'none', 
            borderRadius: 6, 
            padding: '10px 20px', 
            fontWeight: 500, 
            cursor: (!stream || !modelsLoaded || isDetecting) ? 'not-allowed' : 'pointer',
            opacity: (!stream || !modelsLoaded || isDetecting) ? 0.7 : 1
          }}
        >
          Start Detection
        </button>
        
        <button 
          onClick={stopDetection}
          disabled={!isDetecting}
          style={{ 
            background: '#f97316', 
            color: 'white', 
            border: 'none', 
            borderRadius: 6, 
            padding: '10px 20px', 
            fontWeight: 500, 
            cursor: !isDetecting ? 'not-allowed' : 'pointer',
            opacity: !isDetecting ? 0.7 : 1
          }}
        >
          Stop Detection
        </button>
      </div>
      
      {/* Status indicators */}
      <div style={{ marginBottom: 24 }}>
        {!modelsLoaded && (
          <div style={{ color: '#3b82f6', marginBottom: 8 }}>Loading face recognition models...</div>
        )}
        {cameraError && (
          <div style={{ color: '#ef4444', marginBottom: 8 }}>{cameraError}</div>
        )}
        {detectionResult && (
          <div style={{ color: '#10b981', marginBottom: 8, fontWeight: 500 }}>{detectionResult}</div>
        )}
      </div>
      
      {/* Video and Canvas */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          width={640}
          height={480}
          autoPlay
          style={{ 
            borderRadius: 8, 
            background: '#000',
            display: stream ? 'block' : 'none'
          }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0,
            display: stream && isDetecting ? 'block' : 'none'
          }}
        />
        {!stream && (
          <div style={{ 
            width: 640, 
            height: 480, 
            background: '#f1f5f9', 
            borderRadius: 8, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '2px dashed #94a3b8'
          }}>
            <p>Camera feed will appear here</p>
          </div>
        )}
      </div>
      
      {/* Instructions */}
      <div style={{ marginTop: 24, padding: 16, background: '#f1f5f9', borderRadius: 8 }}>
        <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Instructions:</h3>
        <ol style={{ paddingLeft: 20 }}>
          <li>Click "Start Camera" to access your webcam</li>
          <li>Allow camera permissions when prompted by your browser</li>
          <li>Position your face in front of the camera</li>
          <li>Click "Start Detection" to begin face detection</li>
          <li>Detected faces will be highlighted with bounding boxes and landmarks</li>
          <li>Click "Stop Detection" to pause detection</li>
          <li>Click "Stop Camera" to turn off the camera</li>
        </ol>
      </div>
    </div>
  );
};

export default FaceTest;