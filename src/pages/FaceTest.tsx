import React, { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { db } from "../lib/firebase";
import { ref, get, set } from "firebase/database";

// Interface for student data from Firebase
interface Student {
  Name?: string;
  name?: string;
  username?: string;
  department?: string;
  mode?: string;
  faceDescriptor?: number[];
}

// Interface for staff data from Firebase
interface Staff {
  name?: string;
  department?: string;
  faceDescriptor?: number[];
}

const FaceTest: React.FC = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[] | null>(null);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('Loading face-api.js models...');
        // Use CDN models instead of local files
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        setModelsLoaded(true);
        console.log('All face-api.js models loaded successfully!');
      } catch (err) {
        console.error('Model loading error:', err);
        setMessage("Failed to load face recognition models. Check console for details.");
      }
    };
    loadModels();
  }, []);

  // Handle video element when stream is available
  useEffect(() => {
    if (stream && videoRef.current && cameraOpen) {
      console.log("Setting up video element with stream...");
      videoRef.current.srcObject = stream;
      
      videoRef.current.onloadstart = () => console.log("Video load started");
      videoRef.current.onloadeddata = () => console.log("Video data loaded");
      videoRef.current.oncanplay = () => console.log("Video can play");
      videoRef.current.onloadedmetadata = () => {
        console.log("Video metadata loaded, starting playback...");
        videoRef.current!.play().then(() => {
          console.log("Video playback started");
          setMessage("Camera started successfully!");
        }).catch(err => {
          console.error("Video play error:", err);
          setMessage("Video playback failed: " + err.message);
        });
      };
      
      videoRef.current.onerror = (error) => {
        console.error('Video error:', error);
        setMessage("Video stream error. Please try again.");
      };
    }
  }, [stream, cameraOpen]);

  const startCamera = async () => {
    setMessage("Starting camera...");
    console.log("Attempting to start camera...");
    
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported");
      }

      // List available devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log("Available video devices:", videoDevices);

      if (videoDevices.length === 0) {
        throw new Error("No camera devices found");
      }

      // Try basic camera access first
      console.log("Requesting camera access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false
      });
      
      console.log("Camera stream obtained:", mediaStream);
      
      // Store the stream - useEffect will handle video setup
      setStream(mediaStream);
      setCameraOpen(true);
      setMessage("Camera stream obtained! Setting up video...");
    } catch (error) {
      console.error('Camera error:', error);
      
      if (error.name === 'NotAllowedError') {
        setMessage("Camera access denied. Please allow camera permissions and refresh the page.");
      } else if (error.name === 'NotFoundError') {
        setMessage("No camera found. Please check your camera connection.");
      } else if (error.name === 'NotReadableError') {
        setMessage("Camera is in use by another application. Please close other apps using the camera.");
      } else {
        setMessage(`Camera error: ${error.message}. Please check permissions and try again.`);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
    setMessage("");
  };

  const captureFace = async () => {
    if (!modelsLoaded) {
      setMessage("Models not loaded yet. Please wait.");
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      setMessage("Camera not ready.");
      return;
    }

    setLoading(true);
    try {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) {
        setMessage("Canvas context not available.");
        return;
      }

      // Capture frame from video
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      const dataUrl = canvasRef.current.toDataURL('image/png');

      // Detect face and extract descriptor
      const img = await faceapi.fetchImage(dataUrl);
      const detection = await faceapi.detectSingleFace(
        img, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setMessage("No face detected. Please ensure your face is clearly visible.");
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      setCapturedDescriptor(descriptor);
      setMessage(`Face captured successfully! Descriptor length: ${descriptor.length}`);
      
      console.log('Captured face descriptor:', descriptor);
      
    } catch (error) {
      console.error('Face capture error:', error);
      setMessage("Error capturing face. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const testRecognition = async () => {
    if (!capturedDescriptor) {
      setMessage("No face captured yet. Please capture a face first.");
      return;
    }

    setLoading(true);
    try {
      // Test against stored faces
      const studentsSnap = await get(ref(db, "students"));
      const staffSnap = await get(ref(db, "staff"));
      
      let foundMatches = 0;
      let totalFaces = 0;

      // Check students
      if (studentsSnap.exists()) {
        const studentsByDept = studentsSnap.val();
        for (const [dept, students] of Object.entries(studentsByDept)) {
          for (const [studentId, student] of Object.entries(students as Record<string, Student>)) {
            if (student.faceDescriptor && Array.isArray(student.faceDescriptor)) {
              totalFaces++;
              const storedDescriptor = new Float32Array(student.faceDescriptor);
              const distance = faceapi.euclideanDistance(
                new Float32Array(capturedDescriptor), 
                storedDescriptor
              );
              
              if (distance < 0.6) {
                foundMatches++;
                console.log(`Match found: ${student.Name || student.name || "Unknown"} (Student) - Distance: ${distance}`);
              }
            }
          }
        }
      }

      // Check staff
      if (staffSnap.exists()) {
        const staff = staffSnap.val();
        for (const [staffId, staffMember] of Object.entries(staff as Record<string, Staff>)) {
          if (staffMember.faceDescriptor && Array.isArray(staffMember.faceDescriptor)) {
            totalFaces++;
            const storedDescriptor = new Float32Array(staffMember.faceDescriptor);
            const distance = faceapi.euclideanDistance(
              new Float32Array(capturedDescriptor), 
              storedDescriptor
            );
            
            if (distance < 0.6) {
              foundMatches++;
              console.log(`Match found: ${staffMember.name || "Unknown"} (Staff) - Distance: ${distance}`);
            }
          }
        }
      }

      setMessage(`Recognition test complete! Found ${foundMatches} matches out of ${totalFaces} stored faces. Check console for details.`);
      
    } catch (error) {
      console.error('Recognition test error:', error);
      setMessage("Error testing recognition. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const saveTestFace = async () => {
    if (!capturedDescriptor) {
      setMessage("No face captured yet.");
      return;
    }

    const testId = prompt("Enter a test ID for this face:");
    if (!testId) return;

    try {
      await set(ref(db, `testFaces/${testId}`), {
        id: testId,
        name: `Test User ${testId}`,
        faceDescriptor: capturedDescriptor,
        timestamp: new Date().toISOString()
      });
      setMessage(`Test face saved with ID: ${testId}`);
    } catch (error) {
      console.error('Save error:', error);
      setMessage("Error saving test face.");
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1 style={{ color: '#2563eb', marginBottom: 20 }}>Face Recognition Test</h1>
      
      <div style={{ marginBottom: 20 }}>
        <h3>Status:</h3>
        <p>Models Loaded: {modelsLoaded ? "✅ Yes" : "❌ No"}</p>
        <p>Camera: {cameraOpen ? "✅ Active" : "❌ Inactive"}</p>
        <p>Face Captured: {capturedDescriptor ? "✅ Yes" : "❌ No"}</p>
        <p>Camera Stream: {stream ? "✅ Connected" : "❌ Not Connected"}</p>
        <p>Video Ready: {videoRef.current?.readyState === 4 ? "✅ Yes" : "❌ No"}</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button 
          onClick={cameraOpen ? stopCamera : startCamera}
          style={{ 
            background: cameraOpen ? '#ef4444' : '#2563eb', 
            color: 'white', 
            border: 'none', 
            padding: '10px 20px', 
            borderRadius: 8, 
            marginRight: 10,
            cursor: 'pointer'
          }}
        >
          {cameraOpen ? 'Stop Camera' : 'Start Camera'}
        </button>
        
        <button 
          onClick={() => {
            console.log("Manual camera test...");
            navigator.mediaDevices.getUserMedia({video: true})
              .then(stream => {
                console.log("Manual test: Camera works!", stream);
                setMessage("Manual test: Camera access successful!");
              })
              .catch(err => {
                console.error("Manual test: Camera error", err);
                setMessage(`Manual test failed: ${err.message}`);
              });
          }}
          style={{ 
            background: '#f59e0b', 
            color: 'white', 
            border: 'none', 
            padding: '10px 20px', 
            borderRadius: 8, 
            marginRight: 10,
            cursor: 'pointer'
          }}
        >
          Test Camera
        </button>

        {cameraOpen && (
          <button 
            onClick={captureFace}
            disabled={loading}
            style={{ 
              background: '#10b981', 
              color: 'white', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: 8, 
              marginRight: 10,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Capturing...' : 'Capture Face'}
          </button>
        )}

        {capturedDescriptor && (
          <>
            <button 
              onClick={testRecognition}
              disabled={loading}
              style={{ 
                background: '#f59e0b', 
                color: 'white', 
                border: 'none', 
                padding: '10px 20px', 
                borderRadius: 8, 
                marginRight: 10,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              Test Recognition
            </button>
            <button 
              onClick={saveTestFace}
              style={{ 
                background: '#8b5cf6', 
                color: 'white', 
                border: 'none', 
                padding: '10px 20px', 
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              Save as Test Face
            </button>
          </>
        )}
      </div>

      {message && (
        <div style={{ 
          padding: 10, 
          marginBottom: 20, 
          borderRadius: 8, 
          background: message.includes('error') || message.includes('failed') ? '#fef2f2' : '#f0fdf4',
          color: message.includes('error') || message.includes('failed') ? '#dc2626' : '#16a34a',
          border: `1px solid ${message.includes('error') || message.includes('failed') ? '#fecaca' : '#bbf7d0'}`
        }}>
          {message}
        </div>
      )}

      {cameraOpen && (
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <video 
            ref={videoRef} 
            width={640} 
            height={480} 
            autoPlay 
            style={{ borderRadius: 8, background: '#000' }}
          />
          <canvas ref={canvasRef} width={640} height={480} style={{ display: 'none' }} />
        </div>
      )}

      {capturedDescriptor && (
        <div style={{ marginTop: 20 }}>
          <h3>Captured Face Descriptor:</h3>
          <p>Length: {capturedDescriptor.length} values</p>
          <p>First 10 values: [{capturedDescriptor.slice(0, 10).join(', ')}...]</p>
        </div>
      )}

      <div style={{ marginTop: 30, padding: 20, background: '#f8fafc', borderRadius: 8 }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Click "Start Camera" to begin</li>
          <li>Position your face clearly in the camera</li>
          <li>Click "Capture Face" to extract face descriptor</li>
          <li>Click "Test Recognition" to compare with stored faces</li>
          <li>Check browser console for detailed results</li>
        </ol>
      </div>
    </div>
  );
};

export default FaceTest; 