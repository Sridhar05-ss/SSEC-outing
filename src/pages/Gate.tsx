import React, { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import { db } from "../lib/firebase";
import { ref, get, set, query, orderByChild, equalTo, limitToLast } from "firebase/database";

// Types for face recognition and access
interface RecognitionResult {
  name: string;
  id: string;
  department: string;
  role: string;
  mode: string;
  photo?: string;
  faceDescriptor?: number[];
}

interface Student {
  Name?: string;
  name?: string;
  username?: string;
  department?: string;
  mode?: string;
  faceDescriptor?: number[];
}

interface PassRequest {
  id: string;
  username: string;
  name: string;
  type: "outing" | "homevisit";
  status: "pending" | "hod_approved" | "warden_approved" | "approved" | "rejected";
  date: string;
  arrivalTime: string;
  reason: string;
  createdAt: string;
}

interface AccessLog {
  id: string;
  studentId?: string;
  staffId?: string;
  name: string;
  department: string;
  mode: string;
  direction: "in" | "out";
  timestamp: string;
  status: "granted" | "denied";
  reason?: string;
  passRequestId?: string;
  outingApproved?: boolean;
  outingRequestId?: string;
  role?: "student" | "staff";
}

const Gate: React.FC = () => {
  console.log('🎯 GATE COMPONENT LOADED');
  console.log('🔧 DEBUG: Component is running');
  console.log('🔧 DEBUG: Current time:', new Date().toISOString());
  
  // Add a simple alert to test if the component loads
  useEffect(() => {
    console.log('🔧 DEBUG: useEffect triggered');
    alert('Gate component loaded! Check console for logs.');
  }, []);
  
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
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [accessLog, setAccessLog] = useState<AccessLog | null>(null);
  const [lastRecognizedFace, setLastRecognizedFace] = useState<string | null>(null);
  const [faceDetectionCount, setFaceDetectionCount] = useState(0);
  const [autoCaptureInterval, setAutoCaptureInterval] = useState<NodeJS.Timeout | null>(null);

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

  // Get current attendance status for a person
  const getCurrentAttendanceStatus = async (personId: string, role: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const collectionPath = `new_attend/${today}/${personId}`;
      
      console.log('Checking attendance status at path:', collectionPath);
      const snapshot = await get(ref(db, collectionPath));
      const result = { 
        exists: snapshot.exists(), 
        data: snapshot.exists() ? snapshot.val() : null,
        collection: "new_attend"
      };
      console.log('Attendance status result:', result);
      return result;
    } catch (error) {
      console.error('Error getting attendance status:', error);
      return { exists: false, data: null, collection: null };
    }
  };

  // Auto-capture function
  const startAutoCapture = () => {
    console.log('📷 AUTO-CAPTURE STARTED');
    if (!modelsLoaded || !videoRef.current || !canvasRef.current) {
      console.log('❌ Auto-capture failed: models or video not ready');
      return;
    }

    const interval = setInterval(async () => {
      try {
        const ctx = canvasRef.current!.getContext('2d');
        if (!ctx) return;

        // Capture frame
        ctx.drawImage(videoRef.current!, 0, 0, 480, 360);
        const dataUrl = canvasRef.current!.toDataURL('image/png');

        // Detect face
        const img = await faceapi.fetchImage(dataUrl);
        const detection = await faceapi.detectSingleFace(
          img, 
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptor();

        if (detection) {
          console.log('👤 FACE DETECTED - Count:', faceDetectionCount + 1);
          setFaceDetectionCount(prev => prev + 1);
          
          // If face detected for 3 consecutive frames, trigger recognition
          if (faceDetectionCount >= 2) {
            console.log('🎯 TRIGGERING FACE RECOGNITION');
            clearInterval(interval);
            setAutoCaptureInterval(null);
            await performFaceRecognition(dataUrl);
          }
        } else {
          if (faceDetectionCount > 0) {
            console.log('❌ FACE LOST - Resetting count');
          }
          setFaceDetectionCount(0);
        }
      } catch (error) {
        console.error('Auto-capture error:', error);
      }
    }, 500); // Check every 500ms

    setAutoCaptureInterval(interval);
  };

  const handleStartCamera = () => {
    setCameraOpen(true);
    setMessage("");
    setShowVisitorPass(false);
    setCameraError("");
    setRecognitionResult(null);
    setAccessLog(null);
    setFaceDetectionCount(0);
    setLastRecognizedFace(null);
    
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 480, 
        height: 360,
        facingMode: "user"
      } 
    }).then(s => {
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
        
        // Start auto-capture after video starts playing
        videoRef.current.onloadedmetadata = () => {
          startAutoCapture();
        };
      }
    }).catch(() => setCameraError("Camera not available or permission denied."));
  };

  const closeCamera = () => {
    setCameraOpen(false);
    setMessage("");
    setShowVisitorPass(false);
    setRecognitionResult(null);
    setAccessLog(null);
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (autoCaptureInterval) {
      clearInterval(autoCaptureInterval);
      setAutoCaptureInterval(null);
    }
  };

  // Face recognition function
  const performFaceRecognition = async (capturedDataUrl: string) => {
    console.log('🔍 FACE RECOGNITION STARTED');
    setLoading(true);
    setMessage("Processing face recognition...");

    try {
      // 1. Detect face and extract descriptor from captured image
      const img = await faceapi.fetchImage(capturedDataUrl);
      const detection = await faceapi.detectSingleFace(
        img, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setLoading(false);
        setMessage("No face detected. Please try again.");
        return;
      }

      const queryDescriptor = detection.descriptor;
      let foundPerson: RecognitionResult | null = null;
      let minDistance = 0.6; // Threshold for face recognition

      // 2. First check staff
      const staffSnap = await get(ref(db, "Attendance_Log_staffs"));
      if (staffSnap.exists()) {
        const staff = staffSnap.val();
        for (const [staffId, staffMember] of Object.entries(staff as Record<string, any>)) {
          if (staffMember.faceDescriptor && Array.isArray(staffMember.faceDescriptor)) {
            const storedDescriptor = new Float32Array(staffMember.faceDescriptor);
            const distance = faceapi.euclideanDistance(queryDescriptor, storedDescriptor);
            
            if (distance < minDistance) {
              minDistance = distance;
              foundPerson = {
                name: staffMember.name || "Unknown",
                id: staffId,
                department: staffMember.department || "Unknown",
                role: "staff",
                mode: "Staff",
                faceDescriptor: staffMember.faceDescriptor
              };
            }
          }
        }
      }

      // 3. If no staff found, check students
      if (!foundPerson) {
        const studentsSnap = await get(ref(db, "students"));
        
        if (studentsSnap.exists()) {
          const studentsByDept = studentsSnap.val();
          
          // Search through all departments
          for (const [dept, students] of Object.entries(studentsByDept)) {
            for (const [studentId, student] of Object.entries(students as Record<string, Student>)) {
              if (student.faceDescriptor && Array.isArray(student.faceDescriptor)) {
                const storedDescriptor = new Float32Array(student.faceDescriptor);
                const distance = faceapi.euclideanDistance(queryDescriptor, storedDescriptor);
                
                if (distance < minDistance) {
                  minDistance = distance;
                  foundPerson = {
                    name: student.Name || student.name || "Unknown",
                    id: studentId,
                    department: dept,
                    role: "student",
                    mode: student.mode || "Hosteller",
                    faceDescriptor: student.faceDescriptor
                  };
                }
              }
            }
          }
        }
      }

      if (foundPerson) {
        // Check if this is the same face as last time (to prevent double recognition)
        const faceKey = `${foundPerson.id}-${foundPerson.role}`;
        if (faceKey === lastRecognizedFace) {
          setLoading(false);
          setMessage("Face already processed. Please wait.");
          return;
        }

        setLastRecognizedFace(faceKey);
        setRecognitionResult(foundPerson);
        
        console.log('Recognized person:', foundPerson);
        console.log('Person role:', foundPerson.role);
        
        // Handle staff and students differently
        if (foundPerson.role === "staff") {
          console.log('Processing as staff...');
          await handleStaffAccess(foundPerson);
        } else {
          console.log('Processing as student...');
          await handleStudentAccess(foundPerson);
        }
      } else {
        setLoading(false);
        setMessage("Face not recognized. Please contact administration.");
        setShowVisitorPass(true);
      }
    } catch (error) {
      console.error('Face recognition error:', error);
      setLoading(false);
      setMessage("Recognition error. Please try again.");
    }
  };

  // Handle staff access (staff can always enter/exit)
  const handleStaffAccess = async (staff: RecognitionResult) => {
    try {
      console.log('=== STAFF ACCESS HANDLING START ===');
      console.log('Staff details:', staff);
      
      // Create access log for staff
      const accessLogData: AccessLog = {
        id: Date.now().toString(),
        staffId: staff.id,
        name: staff.name,
        department: staff.department,
        mode: "Staff",
        direction: "in",
        timestamp: new Date().toISOString(),
        status: "granted",
        reason: "Staff access granted"
      };

      setAccessLog(accessLogData);

      // Save to new_attend collection
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const attendRef = ref(db, `new_attend/${today}/${staff.id}`);
      console.log('=== SAVING STAFF TO NEW_ATTEND COLLECTION ===');
      console.log('Path:', `new_attend/${today}/${staff.id}`);
      console.log('Staff ID:', staff.id);
      console.log('Staff Name:', staff.name);
      
      const attendSnap = await get(attendRef);
      console.log('Existing data check:', attendSnap.exists() ? 'EXISTS' : 'NOT EXISTS');
      
      let inTime = "";
      let outTime = "";
      let status = "IN";
      
      if (!attendSnap.exists() || !attendSnap.val().in) {
        // First scan, set IN
        inTime = new Date().toISOString();
        const dataToSave = {
          id: staff.id,
          name: staff.name,
          department: staff.department,
          in: inTime,
          out: "",
          status: "IN"
        };
        console.log('Saving first scan data:', dataToSave);
        
        try {
          await set(attendRef, dataToSave);
          console.log('✅ Successfully saved staff to new_attend collection');
          
          // Verify the save
          const verifySnap = await get(attendRef);
          if (verifySnap.exists()) {
            console.log('✅ Staff verification successful:', verifySnap.val());
          } else {
            console.log('❌ Staff verification failed - data not found');
          }
        } catch (error) {
          console.error('❌ Error saving staff to new_attend:', error);
          throw error;
        }
        status = "IN";
      } else if (attendSnap.exists() && !attendSnap.val().out) {
        // Second scan, set OUT
        inTime = attendSnap.val().in;
        outTime = new Date().toISOString();
        const dataToSave = {
          id: staff.id,
          name: staff.name,
          department: staff.department,
          in: inTime,
          out: outTime,
          status: "OUT"
        };
        console.log('Saving second scan data:', dataToSave);
        
        try {
          await set(attendRef, dataToSave);
          console.log('✅ Successfully updated staff in new_attend collection');
        } catch (error) {
          console.error('❌ Error updating staff in new_attend:', error);
          throw error;
        }
        status = "OUT";
      }
      setLoading(false);
      setMessage(`Staff ${status === "OUT" ? "exit" : "entry"} recorded for ${staff.name}`);
      console.log('=== STAFF ACCESS HANDLING COMPLETE ===');

    } catch (error) {
      console.error('❌ Error handling staff access:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setLoading(false);
      setMessage("Error processing staff access. Please try again.");
    }
  };

  // Handle student access with proper IN/OUT logic
  const handleStudentAccess = async (student: RecognitionResult) => {
    try {
      console.log('=== STUDENT ACCESS HANDLING START ===');
      console.log('Student details:', student);
      
      // Get current attendance status
      const attendanceStatus = await getCurrentAttendanceStatus(student.id, "student");
      console.log('Current attendance status:', attendanceStatus);
      
      // Check for approved outing request (only for hostellers)
      let approvedRequest: PassRequest | null = null;
      if (student.mode === "Hosteller") {
        console.log('Checking for approved outing request...');
        const passRequestsRef = ref(db, "passRequests");
        const q = query(
          passRequestsRef, 
          orderByChild("username"), 
          equalTo(student.id), 
          limitToLast(1)
        );
        
        const snapshot = await get(q);
        if (snapshot.exists()) {
          const requests = snapshot.val();
          const latestRequest = Object.values(requests)[0] as PassRequest;
          console.log('Latest pass request:', latestRequest);
          
          // Check if request is approved
          if (latestRequest.status === "warden_approved" || latestRequest.status === "approved") {
            approvedRequest = latestRequest;
            console.log('✅ Approved request found:', approvedRequest);
          } else {
            console.log('❌ Request not approved, status:', latestRequest.status);
          }
        } else {
          console.log('No pass requests found for student');
        }
      }

      // Create access log
      const accessLogData: AccessLog = {
        id: Date.now().toString(),
        studentId: student.id,
        name: student.name,
        department: student.department,
        mode: student.mode,
        direction: "in",
        timestamp: new Date().toISOString(),
        status: "granted",
        reason: "Student access",
        passRequestId: approvedRequest?.id,
        outingApproved: !!approvedRequest,
        outingRequestId: approvedRequest?.id
      };

      setAccessLog(accessLogData);

      // Save to new_attend collection
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const attendRef = ref(db, `new_attend/${today}/${student.id}`);
      console.log('=== SAVING TO NEW_ATTEND COLLECTION ===');
      console.log('Path:', `new_attend/${today}/${student.id}`);
      console.log('Student ID:', student.id);
      console.log('Student Name:', student.name);
      
      const attendSnap = await get(attendRef);
      console.log('Existing data check:', attendSnap.exists() ? 'EXISTS' : 'NOT EXISTS');
      
      let inTime = "";
      let outTime = "";
      let status: string = "IN";
      
      if (!attendSnap.exists() || !attendSnap.val().in) {
        // First scan, set IN
        inTime = new Date().toISOString();
        const dataToSave = {
          id: student.id,
          name: student.name,
          department: student.department,
          in: inTime,
          out: "",
          status: "IN"
        };
        console.log('Saving first scan data:', dataToSave);
        
        try {
          await set(attendRef, dataToSave);
          console.log('✅ Successfully saved to new_attend collection');
          
          // Verify the save
          const verifySnap = await get(attendRef);
          if (verifySnap.exists()) {
            console.log('✅ Verification successful:', verifySnap.val());
          } else {
            console.log('❌ Verification failed - data not found');
          }
        } catch (error) {
          console.error('❌ Error saving to new_attend:', error);
          throw error;
        }
        status = "IN";
      } else if (attendSnap.exists() && !attendSnap.val().out) {
        // Second scan, set OUT
        inTime = attendSnap.val().in;
        outTime = new Date().toISOString();
        const dataToSave = {
          id: student.id,
          name: student.name,
          department: student.department,
          in: inTime,
          out: outTime,
          status: "OUT"
        };
        console.log('Saving second scan data:', dataToSave);
        
        try {
          await set(attendRef, dataToSave);
          console.log('✅ Successfully updated new_attend collection');
        } catch (error) {
          console.error('❌ Error updating new_attend:', error);
          throw error;
        }
        status = "OUT";
      }
      setLoading(false);
      setMessage(`Student ${status === "OUT" ? "exit" : "entry"} recorded for ${student.name}`);
      
      console.log('=== STUDENT ACCESS HANDLING COMPLETE ===');

    } catch (error) {
      console.error('❌ Error handling student access:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setLoading(false);
      setMessage("Error processing student access. Please try again.");
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
        ctx.drawImage(videoRef.current, 0, 0, 480, 360);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        await performFaceRecognition(dataUrl);
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
      <div style={{ background: 'red', color: 'white', fontWeight: 'bold', fontSize: 24, textAlign: 'center', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        HELLO FROM GATE.TSX - IF YOU SEE THIS, YOU ARE EDITING THE CORRECT FILE!
      </div>
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
          {message && <div style={{ marginTop: 16, fontWeight: 600, color: message.includes('recorded') ? '#15803d' : message.includes('Welcome') ? '#15803d' : '#b91c1c', fontSize: 18 }}>{message}</div>}
          {recognitionResult && accessLog && (
            <div style={{ marginTop: 16, background: '#f0f9ff', borderRadius: 8, padding: 16, border: '1px solid #0ea5e9' }}>
              <h4 style={{ fontWeight: 600, color: '#0c4a6e', marginBottom: 8 }}>Access Recorded</h4>
              <p style={{ margin: 4, color: '#0c4a6e' }}><strong>Name:</strong> {recognitionResult.name}</p>
              <p style={{ margin: 4, color: '#0c4a6e' }}><strong>ID:</strong> {recognitionResult.id}</p>
              <p style={{ margin: 4, color: '#0c4a6e' }}><strong>Department:</strong> {recognitionResult.department}</p>
              <p style={{ margin: 4, color: '#0c4a6e' }}><strong>Role:</strong> {recognitionResult.role}</p>
              <p style={{ margin: 4, color: '#0c4a6e' }}><strong>Status:</strong> {accessLog.direction === "out" ? "EXIT" : "ENTRY"}</p>
            </div>
          )}
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