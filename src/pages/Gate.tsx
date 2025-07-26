import React, { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import { db } from "../lib/firebase";
import { ref, get } from "firebase/database";

const Gate: React.FC = () => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [showVisitorPass, setShowVisitorPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [scannerActive, setScannerActive] = useState(false);

  // Load face-api.js models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Use CDN models instead of local files
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
        setModelsLoaded(true);
      } catch (err) {
        setMessage("Failed to load face recognition models.");
      }
    };
    loadModels();
  }, []);

  const handleStartCamera = () => {
    setCameraOpen(true);
    setMessage("");
    setShowVisitorPass(false);
    setCameraError("");
    navigator.mediaDevices.getUserMedia({ video: true }).then(s => {
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    }).catch(() => setCameraError("Camera not available or permission denied."));
  };

  const closeCamera = () => {
    setCameraOpen(false);
    setMessage("");
    setShowVisitorPass(false);
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  // Real face recognition logic
  const recognizeFace = async (capturedDataUrl: string) => {
    setLoading(true);
    let found = null;
    let minDistance = 1.0;
    let bestName = "";
    try {
      // 1. Detect face and extract descriptor from captured image
      const img = await faceapi.fetchImage(capturedDataUrl);
      const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        setMessage("No face detected. Try again.");
        setLoading(false);
        return;
      }
      const queryDescriptor = detection.descriptor;
      // 2. Fetch all staff and student face descriptors from Firebase
      const staffSnap = await get(ref(db, "staff"));
      const studentsSnap = await get(ref(db, "students"));
      const staff = staffSnap.val() ? Object.values(staffSnap.val()) : [];
      // 3. Compare with staff
      for (const s of staff) {
        if ((s as any).faceDescriptor && Array.isArray((s as any).faceDescriptor)) {
          const storedDescriptor = new Float32Array((s as any).faceDescriptor);
          const distance = faceapi.euclideanDistance(queryDescriptor, storedDescriptor);
          if (distance < minDistance) {
            minDistance = distance;
            bestName = (s as any).name;
          }
        }
      }
      // 4. Compare with students
      if (studentsSnap.exists()) {
        const studentsByDept = studentsSnap.val();
        for (const dept of Object.values(studentsByDept)) {
          for (const stu of Object.values(dept)) {
            if ((stu as any).faceDescriptor && Array.isArray((stu as any).faceDescriptor)) {
              const storedDescriptor = new Float32Array((stu as any).faceDescriptor);
              const distance = faceapi.euclideanDistance(queryDescriptor, storedDescriptor);
              if (distance < minDistance) {
                minDistance = distance;
                bestName = (stu as any).Name || (stu as any).name;
              }
            }
          }
        }
      }
      setLoading(false);
      if (minDistance < 0.5 && bestName) {
        setMessage(`Welcome, ${bestName}!`);
        setShowVisitorPass(false);
      } else {
        setMessage("Face not recognized. Please fill visitor pass.");
        setShowVisitorPass(true);
      }
    } catch (err) {
      setMessage("Recognition error. Try again.");
      setLoading(false);
    }
  };

  const handleScanFace = async () => {
    if (!modelsLoaded) {
      setMessage("Face recognition models not loaded yet.");
      return;
    }
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        await recognizeFace(dataUrl);
      }
    }
  };

  // Visitor pass form state
  const [visitorName, setVisitorName] = useState("");
  const [visitorReason, setVisitorReason] = useState("");
  const handleVisitorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Visitor pass created for ${visitorName} (Reason: ${visitorReason})`);
    setVisitorName("");
    setVisitorReason("");
    setShowVisitorPass(false);
    setMessage("");
    closeCamera();
  };

  const handleStartScanner = () => {
    setScannerActive(true);
    handleStartCamera();
  };
  const handleEndScanner = () => {
    setScannerActive(false);
    closeCamera();
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', background: 'white', borderRadius: 18, boxShadow: '0 8px 32px #0001', padding: 32, marginTop: 40 }}>
      <h2 style={{fontWeight: 700, color: '#1848c1', marginBottom: 24, fontSize: 28}}>Gate Terminal</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          onClick={handleStartScanner}
          disabled={scannerActive}
          style={{ background: scannerActive ? '#a5b4fc' : '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 600, fontSize: 18, cursor: scannerActive ? 'not-allowed' : 'pointer', opacity: scannerActive ? 0.7 : 1 }}>
          Start Scanner
        </button>
        <button
          onClick={handleEndScanner}
          disabled={!scannerActive}
          style={{ background: !scannerActive ? '#e5e7eb' : '#ef4444', color: !scannerActive ? '#9ca3af' : 'white', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 600, fontSize: 18, cursor: !scannerActive ? 'not-allowed' : 'pointer', opacity: !scannerActive ? 0.7 : 1 }}>
          End Scanner
        </button>
      </div>
      {scannerActive && cameraOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <video ref={videoRef} width={480} height={360} autoPlay style={{ borderRadius: 8, background: '#000', marginBottom: 12 }} />
          <canvas ref={canvasRef} width={480} height={360} style={{ display: 'none' }} />
          {cameraError && <div style={{ color: 'red', margin: 8 }}>{cameraError}</div>}
          <button onClick={handleScanFace} disabled={loading} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, padding: '10px 24px', fontWeight: 500, fontSize: 16, marginTop: 8, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>Scan Face</button>
          {message && <div style={{ marginTop: 16, fontWeight: 600, color: message.includes('Welcome') ? '#15803d' : '#b91c1c', fontSize: 18 }}>{message}</div>}
          {showVisitorPass && (
            <form onSubmit={handleVisitorSubmit} style={{ marginTop: 24, background: '#f1f5fb', borderRadius: 12, padding: 24, width: 320 }}>
              <h4 style={{ fontWeight: 700, color: '#2563eb', marginBottom: 12 }}>Visitor Pass</h4>
              <input placeholder="Visitor Name" value={visitorName} onChange={e => setVisitorName(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 16, marginBottom: 12 }} />
              <input placeholder="Reason for Visit" value={visitorReason} onChange={e => setVisitorReason(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 16, marginBottom: 12 }} />
              <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 500, fontSize: 16, width: '100%' }}>Submit</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default Gate; 