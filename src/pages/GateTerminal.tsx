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
      let collectionPath = "";
      
      if (role === "staff") {
        collectionPath = `attendance/${today}/staff/${personId}`;
      } else {
        collectionPath = `attendance/${today}/students/${personId}`;
      }
      
      console.log('Checking attendance status at path:', collectionPath);
      const snapshot = await get(ref(db, collectionPath));
      const result = { 
        exists: snapshot.exists(), 
        data: snapshot.exists() ? snapshot.val() : null,
        collection: role === "staff" ? "staff" : "student"
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
    if (!modelsLoaded || !videoRef.current || !canvasRef.current) return;

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
          setFaceDetectionCount(prev => prev + 1);
          
          // If face detected for 3 consecutive frames, trigger recognition
          if (faceDetectionCount >= 2) {
            clearInterval(interval);
            setAutoCaptureInterval(null);
            await performFaceRecognition(dataUrl);
          }
        } else {
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
      const staffSnap = await get(ref(db, "staff"));
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
      
      // Get current attendance status
      const attendanceStatus = await getCurrentAttendanceStatus(staff.id, "staff");
      console.log('Current attendance status:', attendanceStatus);
      
      // Determine direction based on current status
      let direction: "in" | "out";
      let inTime = "";
      let outTime = "";
      let inTimestamp = "";
      let outTimestamp = "";
      
      if (!attendanceStatus.exists || !attendanceStatus.data) {
        // First entry of the day
        direction = "in";
        inTime = new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });
        inTimestamp = new Date().toISOString();
        console.log('First entry - setting IN time:', inTime);
      } else {
        // Check if they have an out time
        const existingData = attendanceStatus.data;
        console.log('Existing data:', existingData);
        if (!existingData.out || existingData.out === "inside") {
          // They're going out
          direction = "out";
          outTime = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          });
          outTimestamp = new Date().toISOString();
          console.log('Going OUT - setting OUT time:', outTime);
        } else {
          // They're coming back in
          direction = "in";
          inTime = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          });
          inTimestamp = new Date().toISOString();
          console.log('Coming back IN - setting IN time:', inTime);
        }
      }

      // Create access log for staff
      const accessLogData: AccessLog = {
        id: Date.now().toString(),
        staffId: staff.id,
        name: staff.name,
        department: staff.department,
        mode: "Staff",
        direction,
        timestamp: new Date().toISOString(),
        status: "granted",
        reason: "Staff access granted"
      };

      setAccessLog(accessLogData);

      // Save to NEW attendance collection
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const logIndex = attendanceStatus.exists ? Object.keys(attendanceStatus.data).length : 0;
      
      const logData = {
        department: staff.department,
        name: staff.name,
        username: staff.id,
        role: "staff",
        mode: "Staff",
        ...(inTime && { in: inTime, in_timestamp: inTimestamp }),
        ...(outTime && { out: outTime, out_timestamp: outTimestamp }),
        ...(!outTime && { out: "inside" }),
        created_at: new Date().toISOString()
      };

      console.log('=== SAVING STAFF LOG TO NEW ATTENDANCE COLLECTION ===');
      console.log('Date:', today);
      console.log('Staff ID:', staff.id);
      console.log('Log Index:', logIndex);
      console.log('Log Data:', logData);
      console.log('Firebase Path:', `attendance/${today}/staff/${staff.id}/${logIndex}`);
      
      try {
        await set(ref(db, `attendance/${today}/staff/${staff.id}/${logIndex}`), logData);
        console.log('✅ Staff access log saved successfully to NEW attendance collection!');
        
        // Verify the save by reading it back
        const verifyRef = ref(db, `attendance/${today}/staff/${staff.id}/${logIndex}`);
        const verifySnapshot = await get(verifyRef);
        if (verifySnapshot.exists()) {
          console.log('✅ Verification successful - data exists in NEW attendance collection');
          console.log('Verified data:', verifySnapshot.val());
        } else {
          console.log('❌ Verification failed - data not found in NEW attendance collection');
        }
      } catch (firebaseError) {
        console.error('❌ Firebase write error:', firebaseError);
        console.error('Error details:', {
          message: firebaseError.message,
          code: firebaseError.code,
          stack: firebaseError.stack
        });
        throw firebaseError;
      }

      setScanStatus("success");
      setMessage(`Staff ${direction === "out" ? "exit" : "entry"} recorded for ${staff.name}`);
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

      // Determine direction based on student mode and current status
      let direction: "in" | "out";
      let status: "granted" | "denied" = "granted";
      let reason = "";
      let inTime = "";
      let outTime = "";
      let inTimestamp = "";
      let outTimestamp = "";

      if (student.mode === "Hosteller") {
        console.log('Processing as HOSTELLER');
        // Hosteller logic: First scan = out, Second scan = in
        if (!attendanceStatus.exists || !attendanceStatus.data) {
          direction = "out";
          if (!approvedRequest) {
            status = "denied";
            reason = "No approved outing request";
            console.log('❌ Access denied - no approved outing request');
          } else {
            reason = `Approved ${approvedRequest.type} request`;
            outTime = new Date().toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            });
            outTimestamp = new Date().toISOString();
            console.log('✅ Hosteller going OUT - setting OUT time:', outTime);
          }
        } else {
          direction = "in";
          reason = "Returning to hostel";
          inTime = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          });
          inTimestamp = new Date().toISOString();
          console.log('✅ Hosteller returning IN - setting IN time:', inTime);
        }
      } else {
        console.log('Processing as DAY SCHOLAR');
        // DayScholar logic: First scan = in, Second scan = out
        if (!attendanceStatus.exists || !attendanceStatus.data) {
          direction = "in";
          reason = "Day scholar entry";
          inTime = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          });
          inTimestamp = new Date().toISOString();
          console.log('✅ Day scholar entering IN - setting IN time:', inTime);
        } else {
          direction = "out";
          reason = "Day scholar exit";
          outTime = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          });
          outTimestamp = new Date().toISOString();
          console.log('✅ Day scholar going OUT - setting OUT time:', outTime);
        }
      }

      // Create access log
      const accessLogData: AccessLog = {
        id: Date.now().toString(),
        studentId: student.id,
        name: student.name,
        department: student.department,
        mode: student.mode,
        direction,
        timestamp: new Date().toISOString(),
        status,
        reason,
        passRequestId: approvedRequest?.id,
        outingApproved: !!approvedRequest,
        outingRequestId: approvedRequest?.id
      };

      setAccessLog(accessLogData);

      // Save to Firebase in the correct format
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const logIndex = attendanceStatus.exists ? Object.keys(attendanceStatus.data).length : 0;
      
      const logData = {
        department: student.department,
        name: student.name,
        username: student.id,
        role: "student",
        mode: student.mode,
        ...(inTime && { in: inTime, in_timestamp: inTimestamp }),
        ...(outTime && { out: outTime, out_timestamp: outTimestamp }),
        ...(!outTime && { out: "inside" }),
        created_at: new Date().toISOString()
      };
      
      console.log('=== SAVING STUDENT LOG TO NEW ATTENDANCE COLLECTION ===');
      console.log('Date:', today);
      console.log('Student ID:', student.id);
      console.log('Log Index:', logIndex);
      console.log('Log Data:', logData);
      console.log('Firebase Path:', `attendance/${today}/students/${student.id}/${logIndex}`);
      
      try {
        await set(ref(db, `attendance/${today}/students/${student.id}/${logIndex}`), logData);
        console.log('✅ Student access log saved successfully to NEW attendance collection!');
        
        // Verify the save by reading it back
        const verifyRef = ref(db, `attendance/${today}/students/${student.id}/${logIndex}`);
        const verifySnapshot = await get(verifyRef);
        if (verifySnapshot.exists()) {
          console.log('✅ Verification successful - data exists in NEW attendance collection');
          console.log('Verified data:', verifySnapshot.val());
        } else {
          console.log('❌ Verification failed - data not found in NEW attendance collection');
        }
      } catch (firebaseError) {
        console.error('❌ Firebase write error:', firebaseError);
        console.error('Error details:', {
          message: firebaseError.message,
          code: firebaseError.code,
          stack: firebaseError.stack
        });
        throw firebaseError;
      }

      if (status === "granted") {
        setScanStatus("success");
        setMessage(`Access ${direction === "out" ? "granted" : "granted"} for ${student.name}`);
      } else {
        setScanStatus("denied");
        setMessage(`Access denied. ${reason}`);
      }
      
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
      
      const testRef = ref(db, `attendance/${today}/staff/test123/0`);
      console.log('Attempting to write test data to NEW attendance collection...');
      console.log('Test path:', `attendance/${today}/staff/test123/0`);
      console.log('Test data:', testData);
      
      await set(testRef, testData);
      console.log('✅ Firebase write test to attendance collection successful!');
      
      // Verify the write
      const verifySnapshot = await get(testRef);
      if (verifySnapshot.exists()) {
        console.log('✅ Test data verified in attendance collection:', verifySnapshot.val());
        setMessage("Firebase write test to attendance collection successful!");
      } else {
        console.log('❌ Test data not found in attendance collection');
        setMessage("Firebase write test failed - data not found in attendance collection");
      }
    } catch (error) {
      console.error('❌ Firebase write test failed:', error);
      setMessage(`Firebase write test failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-gate text-gate-foreground p-4">
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
              <Button 
                onClick={testFirebaseWrite}
                variant="outline"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Test Firebase Write
              </Button>
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