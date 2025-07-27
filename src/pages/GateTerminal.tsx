import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Camera, 
  Clock, 
  CheckCircle, 
  XCircle,
  User,
  Scan,
  LogOut,
  LogIn,
  AlertTriangle
} from "lucide-react";
import * as faceapi from "face-api.js";
import { db } from "../lib/firebase";
import { ref, get, set, query, orderByChild, equalTo, limitToLast } from "firebase/database";

type ScanStatus = "idle" | "scanning" | "success" | "denied" | "processing";

interface RecognitionResult {
  name: string;
  id: string;
  department: string;
  role: string;
  mode: string; // "Hosteller" or "DayScholar"
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

const GateTerminal = () => {
  console.log('🎯 GATE TERMINAL COMPONENT LOADED');
  console.log('🔧 DEBUG: Component is running');
  console.log('🔧 DEBUG: Current time:', new Date().toISOString());
  
  // Add a simple alert to test if the component loads
  useEffect(() => {
    console.log('🔧 DEBUG: useEffect triggered');
    alert('GateTerminal component loaded! Check console for logs.');
  }, []);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [accessLog, setAccessLog] = useState<AccessLog | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [autoCaptureInterval, setAutoCaptureInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastRecognizedFace, setLastRecognizedFace] = useState<string | null>(null);
  const [faceDetectionCount, setFaceDetectionCount] = useState(0);
  const [message, setMessage] = useState("");

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
        console.error('Model loading error:', err);
        setMessage("Failed to load face recognition models.");
      }
    };
    loadModels();
  }, []);

  // Auto-reset after showing result
  useEffect(() => {
    if (scanStatus === "success" || scanStatus === "denied") {
      const timer = setTimeout(() => {
        setScanStatus("idle");
        setRecognitionResult(null);
        setAccessLog(null);
        setMessage("");
        // Restart auto-capture after showing result
        if (cameraStream) {
          startAutoCapture();
        }
      }, 5000); // Show result for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [scanStatus, cameraStream]);

  // Stop camera stream helper
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (autoCaptureInterval) {
      clearInterval(autoCaptureInterval);
      setAutoCaptureInterval(null);
    }
  };

  // Clean up camera on unmount or when not scanning
  useEffect(() => {
    if (scanStatus !== "scanning") {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanStatus]);

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
        ctx.drawImage(videoRef.current!, 0, 0, 640, 480);
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

  // Face recognition function
  const performFaceRecognition = async (capturedDataUrl: string) => {
    console.log('🔍 FACE RECOGNITION STARTED');
    setScanStatus("processing");
    setMessage("Processing face recognition...");

    try {
      // 1. Detect face and extract descriptor from captured image
      const img = await faceapi.fetchImage(capturedDataUrl);
      const detection = await faceapi.detectSingleFace(
        img, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setScanStatus("denied");
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

      // 3. If no staff found, check students with optimized approach
      if (!foundPerson) {
        console.log('No staff match found, checking students...');
        
        // Get the list of departments first to optimize fetching
        const deptListRef = ref(db, "students");
        const deptListSnap = await get(deptListRef);
        
        if (deptListSnap.exists()) {
          const departments = Object.keys(deptListSnap.val());
          console.log(`Found ${departments.length} departments to check`);
          
          // Create a cache for face descriptors to improve performance
          const faceDescriptorCache = new Map();
          
          // Process departments in parallel for better performance
          const checkDepartment = async (dept) => {
            console.log(`Checking department: ${dept}`);
            const deptRef = ref(db, `students/${dept}`);
            const deptSnap = await get(deptRef);
            
            if (deptSnap.exists()) {
              const students = deptSnap.val();
              console.log(`Found ${Object.keys(students).length} students in ${dept}`);
              
              // Process students in chunks for better performance
              const studentEntries = Object.entries(students as Record<string, Student>);
              const chunkSize = 10; // Process 10 students at a time
              
              for (let i = 0; i < studentEntries.length; i += chunkSize) {
                const chunk = studentEntries.slice(i, i + chunkSize);
                
                // Process each chunk in parallel
                await Promise.all(chunk.map(async ([studentId, student]) => {
                  if (student.faceDescriptor && Array.isArray(student.faceDescriptor)) {
                    // Check if descriptor is already in cache
                    let storedDescriptor;
                    if (faceDescriptorCache.has(studentId)) {
                      storedDescriptor = faceDescriptorCache.get(studentId);
                    } else {
                      storedDescriptor = new Float32Array(student.faceDescriptor);
                      faceDescriptorCache.set(studentId, storedDescriptor);
                    }
                    
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
                      console.log(`Found potential match: ${student.Name || student.name} with distance ${distance}`);
                    }
                  }
                }));
                
                // If we found a match with high confidence, break early
                if (foundPerson && minDistance < 0.4) {
                  console.log(`Found high confidence match, breaking early`);
                  break;
                }
              }
            }
          };
          
          // Check departments in parallel with Promise.all for better performance
          await Promise.all(departments.map(checkDepartment));
        }
      }

      if (foundPerson) {
        // Check if this is the same face as last time (to prevent double recognition)
        const faceKey = `${foundPerson.id}-${foundPerson.role}`;
        if (faceKey === lastRecognizedFace) {
          setScanStatus("denied");
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
        setScanStatus("denied");
        setMessage("Face not recognized. Please contact administration.");
      }
    } catch (error) {
      console.error('Face recognition error:', error);
      setScanStatus("denied");
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
      setScanStatus("success");
      setMessage(`Staff ${status === "OUT" ? "exit" : "entry"} recorded for ${staff.name}`);
      console.log('=== STAFF ACCESS HANDLING COMPLETE ===');

    } catch (error) {
      console.error('❌ Error handling staff access:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setScanStatus("denied");
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

      // Determine which collection to use based on student mode
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const collectionName = student.mode === "Hosteller" ? "outing" : "new_attend";
      
      // For hostellers, use the structure shown in the image
      // Format: outing/YYYY-MM-DD/STUDENT_ID/current/...
      const attendRef = student.mode === "Hosteller" 
        ? ref(db, `${collectionName}/${today}/${student.id}/current`)
        : ref(db, `${collectionName}/${today}/${student.id}`);
        
      console.log(`Using database path: ${student.mode === "Hosteller" ? 
        `${collectionName}/${today}/${student.id}/current` : 
        `${collectionName}/${today}/${student.id}`}`);
      
      console.log(`=== SAVING TO ${collectionName.toUpperCase()} COLLECTION ===`);
      console.log('Path:', student.mode === "Hosteller" ? 
        `${collectionName}/${today}/${student.id}/current` : 
        `${collectionName}/${today}/${student.id}`);
      console.log('Student ID:', student.id);
      console.log('Student Name:', student.name);
      console.log('Student Mode:', student.mode);
      
      const attendSnap = await get(attendRef);
      console.log('Existing data check:', attendSnap.exists() ? 'EXISTS' : 'NOT EXISTS');
      
      let inTime = "";
      let outTime = "";
      let status: string = "IN";
      
      if (!attendSnap.exists() || !attendSnap.val().in) {
        // First scan, set IN
        inTime = new Date().toISOString();
        
        // Create data structure based on student mode
        let dataToSave;
        
        if (student.mode === "Hosteller") {
          // Format data according to the image structure for hostellers
          // Exactly match the format shown in the image
          dataToSave = {
            department: student.department,
            in: inTime.split('T')[1].substring(0, 8), // Format: HH:MM:SS
            in_time: inTime.split('T')[1].substring(0, 8), // Format: HH:MM:SS
            in_timestamp: inTime,
            name: student.name,
            out_time: "",
            out_timestamp: "",
            username: student.id,
            status: "IN",
            outingApproved: !!approvedRequest
          };
          
          console.log('Saving hosteller data with format:', dataToSave);
        } else {
          // Regular format for non-hostellers
          dataToSave = {
            id: student.id,
            name: student.name,
            department: student.department,
            mode: student.mode,
            in: inTime,
            out: "",
            status: "IN",
            outingApproved: !!approvedRequest
          };
        }
        
        console.log('Saving first scan data:', dataToSave);
        
        try {
          await set(attendRef, dataToSave);
          console.log(`✅ Successfully saved to ${collectionName} collection`);
          
          // Verify the save
          const verifySnap = await get(attendRef);
          if (verifySnap.exists()) {
            console.log('✅ Verification successful:', verifySnap.val());
          } else {
            console.log('❌ Verification failed - data not found');
          }
        } catch (error) {
          console.error(`❌ Error saving to ${collectionName}:`, error);
          throw error;
        }
        status = "IN";
      } else if (attendSnap.exists() && (student.mode === "Hosteller" ? !attendSnap.val().out_timestamp : !attendSnap.val().out)) {
        // Second scan, set OUT
        inTime = student.mode === "Hosteller" ? attendSnap.val().in_timestamp : attendSnap.val().in;
        outTime = new Date().toISOString();
        
        let dataToSave;
        
        if (student.mode === "Hosteller") {
          // Format data according to the image structure for hostellers
          // Preserve all existing data and add out information
          dataToSave = {
            ...attendSnap.val(),
            out: outTime.split('T')[1].substring(0, 8), // Format: HH:MM:SS as shown in image
            out_time: outTime.split('T')[1].substring(0, 8), // Format: HH:MM:SS
            out_timestamp: outTime,
            status: "OUT",
            outingApproved: !!approvedRequest
          };
          
          console.log('Updating hosteller data with OUT status:', dataToSave);
        } else {
          // Regular format for non-hostellers
          dataToSave = {
            id: student.id,
            name: student.name,
            department: student.department,
            mode: student.mode,
            in: inTime,
            out: outTime,
            status: "OUT",
            outingApproved: !!approvedRequest
          };
        }
        
        console.log('Saving second scan data:', dataToSave);
        
        try {
          await set(attendRef, dataToSave);
          console.log(`✅ Successfully updated ${collectionName} collection`);
        } catch (error) {
          console.error(`❌ Error updating ${collectionName}:`, error);
          throw error;
        }
        status = "OUT";
      }
      setScanStatus("success");
      setMessage(`Student ${status === "OUT" ? "exit" : "entry"} recorded for ${student.name}`);
      
      console.log('=== STUDENT ACCESS HANDLING COMPLETE ===');

    } catch (error) {
      console.error('❌ Error handling student access:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setScanStatus("denied");
      setMessage("Error processing student access. Please try again.");
    }
  };

  const handleStartScan = async () => {
    console.log('🚀 START SCAN BUTTON CLICKED');
    // Clear all temporary data
    setRecognitionResult(null);
    setAccessLog(null);
    setMessage("");
    setFaceDetectionCount(0);
    setLastRecognizedFace(null);
    setScanStatus("scanning");

    // Request camera access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: "user"
        } 
      });
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start auto-capture after video starts playing
        videoRef.current.onloadedmetadata = () => {
          startAutoCapture();
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setScanStatus("denied");
      setMessage("Camera access denied. Please allow camera permissions.");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Test Firebase write permissions
  const testFirebaseWrite = async () => {
    try {
      console.log('=== TESTING FIREBASE WRITE PERMISSIONS ===');
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const testData = {
        department: "TEST",
        name: "Test User",
        username: "test123",
        role: "staff",
        mode: "Staff",
        in: new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        }),
        in_timestamp: new Date().toISOString(),
        out: "inside",
        created_at: new Date().toISOString(),
        test: true,
        message: "Firebase write test to attendance collection"
      };
      
      const testRef = ref(db, `new_attendance_logs/${today}/staff/test123/0`);
      console.log('Attempting to write test data to new_attendance_logs collection...');
      console.log('Test path:', `new_attendance_logs/${today}/staff/test123/0`);
      console.log('Test data:', testData);
      
      await set(testRef, testData);
      console.log('✅ Firebase write test to new_attendance_logs collection successful!');
      
      // Verify the write
      const verifySnapshot = await get(testRef);
      if (verifySnapshot.exists()) {
        console.log('✅ Test data verified in new_attendance_logs collection:', verifySnapshot.val());
        setMessage("Firebase write test to new_attendance_logs collection successful!");
      } else {
        console.log('❌ Test data not found in new_attendance_logs collection');
        setMessage("Firebase write test failed - data not found in new_attendance_logs collection");
      }
    } catch (error) {
      console.error('❌ Firebase write test failed:', error);
      setMessage(`Firebase write test failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-gate text-gate-foreground p-4">
      <div style={{ background: 'yellow', color: 'black', fontWeight: 'bold', fontSize: 24, textAlign: 'center', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        Hello from Gate Terminal!
      </div>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Sree Sakthi Engineering College</h1>
              <p className="text-white/80">Gate Security Terminal</p>
            </div>
          </div>
        </div>

        {/* Time Display */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-white/80" />
              <span className="text-white/80">Current Time</span>
            </div>
            <div className="text-4xl font-bold text-white mb-1">
              {formatTime(currentTime)}
            </div>
            <div className="text-white/80">
              {formatDate(currentTime)}
            </div>
          </CardContent>
        </Card>

        {/* Main Scanner Interface */}
        {scanStatus === "idle" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-32 h-32 mx-auto bg-white/20 rounded-full flex items-center justify-center">
                <Camera className="h-16 w-16 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Face Recognition Ready</h2>
                <p className="text-white/80 mb-6">
                  Position yourself in front of the camera and click start
                </p>
                <Button 
                  variant="gate" 
                  size="xl"
                  onClick={handleStartScan}
                  className="bg-white text-gate-primary hover:bg-white/90"
                  disabled={!modelsLoaded}
                >
                  <Scan className="h-5 w-5" />
                  {modelsLoaded ? "Start Scanner" : "Loading Models..."}
                </Button>
                {!modelsLoaded && (
                  <p className="text-white/60 text-sm mt-2">Loading face recognition models...</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scanning State */}
        {scanStatus === "scanning" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-32 h-32 mx-auto bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-32 h-32 object-cover rounded-full border-2 border-white"
                  style={{ background: '#000' }}
                  muted
                />
              </div>
              <canvas ref={canvasRef} width={640} height={480} style={{ display: 'none' }} />
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Scanning...</h2>
                <p className="text-white/80">
                  Please look directly at the camera
                </p>
                <div className="flex justify-center mt-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing State */}
        {scanStatus === "processing" && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-32 h-32 mx-auto bg-white/20 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Processing...</h2>
                <p className="text-white/80">
                  {message || "Checking pass approval..."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {scanStatus === "success" && recognitionResult && accessLog && (
          <Card className="bg-green-600/90 backdrop-blur-sm border-green-400/50">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-32 h-32 mx-auto bg-green-500/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-16 w-16 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">ACCESS GRANTED</h2>
                <div className="bg-white/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <User className="h-5 w-5 text-white" />
                    <span className="text-xl font-semibold text-white">{recognitionResult.name}</span>
                  </div>
                  <p className="text-white/90">ID: {recognitionResult.id}</p>
                  <p className="text-white/90">{recognitionResult.department}</p>
                  <p className="text-white/90">{recognitionResult.mode}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {accessLog.direction === "out" ? (
                      <LogOut className="h-4 w-4 text-white" />
                    ) : (
                      <LogIn className="h-4 w-4 text-white" />
                    )}
                    <span className="text-white/90 font-semibold">
                      {accessLog.direction === "out" ? "EXIT" : "ENTRY"}
                    </span>
                  </div>
                  {accessLog.outingApproved && (
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-300" />
                      <span className="text-yellow-300 text-sm">Outing Approved</span>
                    </div>
                  )}
                </div>
                <p className="text-white/80 text-sm mt-4">
                  {accessLog.reason} at {formatTime(currentTime)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Denied State */}
        {scanStatus === "denied" && (
          <Card className="bg-red-600/90 backdrop-blur-sm border-red-400/50">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-32 h-32 mx-auto bg-red-500/30 rounded-full flex items-center justify-center">
                <XCircle className="h-16 w-16 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">ACCESS DENIED</h2>
                <p className="text-white/90 text-lg">
                  {message || "Face not recognized"}
                </p>
                <p className="text-white/80 text-sm">
                  Please contact security or try again
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Firebase Button */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-white font-semibold mb-2">Debug Tools:</h3>
                <p className="text-white/80 text-sm">Test Firebase connection and permissions</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => console.log('🧪 TEST BUTTON CLICKED')}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  Test Console
                </Button>
                <Button 
                  onClick={testFirebaseWrite}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  Test Firebase Write
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-2">Instructions:</h3>
            <ul className="text-white/80 text-sm space-y-1">
              <li>• Stand 2-3 feet from the camera</li>
              <li>• Look directly at the camera</li>
              <li>• Remove any face coverings</li>
              <li>• Face will be auto-captured when detected</li>
              <li>• Hosteller: First scan = Exit, Second scan = Entry</li>
              <li>• DayScholar: First scan = Entry, Second scan = Exit</li>
              <li>• Staff: Alternating IN/OUT based on current status</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GateTerminal;