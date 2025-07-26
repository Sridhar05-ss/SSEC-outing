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
          await checkPassApprovalAndLogAccess(foundPerson);
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
      // Staff can always access - determine direction based on time of day
      const currentHour = new Date().getHours();
      const direction = currentHour < 12 ? "in" : "out"; // Morning = in, Afternoon/Evening = out

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

      // Save to Firebase - Staff logs by date
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      console.log('Saving staff access log to Firebase:', accessLogData);
      await set(ref(db, `Attendance_Log_staffs/${today}/${accessLogData.id}`), accessLogData);
      console.log(`Staff access log saved successfully to Firebase at Attendance_Log_staffs/${today}/${accessLogData.id}`);

      setScanStatus("success");
      setMessage(`Staff access ${direction === "out" ? "granted" : "granted"} for ${staff.name}`);

    } catch (error) {
      console.error('Error handling staff access:', error);
      setScanStatus("denied");
      setMessage("Error processing staff access. Please try again.");
    }
  };

  // Check pass approval and log access
  const checkPassApprovalAndLogAccess = async (student: RecognitionResult) => {
    try {
      // Get the latest pass request for this student
      const passRequestsRef = ref(db, "passRequests");
      const q = query(
        passRequestsRef, 
        orderByChild("username"), 
        equalTo(student.id), 
        limitToLast(1)
      );
      
      const snapshot = await get(q);
      let approvedRequest: PassRequest | null = null;

      if (snapshot.exists()) {
        const requests = snapshot.val();
        const latestRequest = Object.values(requests)[0] as PassRequest;
        
        // Check if request is approved
        if (latestRequest.status === "warden_approved" || latestRequest.status === "approved") {
          approvedRequest = latestRequest;
        }
      }

      // Determine entry/exit based on student mode
      const isHosteller = student.mode === "Hosteller";
      const direction = isHosteller ? "out" : "in"; // Hosteller: first scan = out, DayScholar: first scan = in

      // Create access log
      const accessLogData: AccessLog = {
        id: Date.now().toString(),
        studentId: student.id,
        name: student.name,
        department: student.department,
        mode: student.mode,
        direction,
        timestamp: new Date().toISOString(),
        status: approvedRequest ? "granted" : "denied",
        reason: approvedRequest ? `Approved ${approvedRequest.type} request` : "No approved pass request",
        passRequestId: approvedRequest?.id
      };

      setAccessLog(accessLogData);

      // Save to Firebase - Student logs by date and roll number
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const studentRollNumber = student.id; // This should be the roll number
      
      console.log('Saving student access log to Firebase:', accessLogData);
      await set(ref(db, `Attendance_Log/${today}/${studentRollNumber}`), accessLogData);
      console.log(`Student access log saved successfully to Firebase at Attendance_Log/${today}/${studentRollNumber}`);

      if (approvedRequest) {
        setScanStatus("success");
        setMessage(`Access ${direction === "out" ? "granted" : "granted"} for ${student.name}`);
      } else {
        setScanStatus("denied");
        setMessage(`Access denied. No approved pass request for ${student.name}`);
      }

    } catch (error) {
      console.error('Error checking pass approval:', error);
      setScanStatus("denied");
      setMessage("Error checking pass approval. Please try again.");
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
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GateTerminal;