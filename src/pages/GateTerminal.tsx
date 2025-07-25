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
  Scan
} from "lucide-react";

type ScanStatus = "idle" | "scanning" | "success" | "denied";

interface RecognitionResult {
  name: string;
  id: string;
  department: string;
  role: string;
  photo?: string;
}

const GateTerminal = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-reset after showing result
  useEffect(() => {
    if (scanStatus === "success" || scanStatus === "denied") {
      const timer = setTimeout(() => {
        setScanStatus("idle");
        setRecognitionResult(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [scanStatus]);

  // Stop camera stream helper
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
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

  const handleStartScan = async () => {
    // Clear all temporary data
    setRecognitionResult(null);
    setScanStatus("scanning");

    // Request camera access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      // Simulate face recognition process
      setTimeout(() => {
        const isSuccess = Math.random() > 0.2; // 80% success rate for demo
        if (isSuccess) {
          const mockResults = [
            { name: "Dr. Rajesh Kumar", id: "ST001", department: "Computer Science", role: "Professor" },
            { name: "Priya Sharma", id: "20CS101", department: "Computer Science", role: "Student" },
            { name: "Prof. Anita Singh", id: "ST002", department: "Electronics", role: "Associate Professor" },
            { name: "Rahul Patel", id: "20EC205", department: "Electronics", role: "Student" },
          ];
          const result = mockResults[Math.floor(Math.random() * mockResults.length)];
          setRecognitionResult(result);
          setScanStatus("success");
        } else {
          setScanStatus("denied");
        }
      }, 2000);
    } catch (err) {
      // Camera access denied
      setScanStatus("denied");
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
                  Position yourself in front of the camera and click scan
                </p>
                <Button 
                  variant="gate" 
                  size="xl"
                  onClick={handleStartScan}
                  className="bg-white text-gate-primary hover:bg-white/90"
                >
                  <Scan className="h-5 w-5" />
                  Start Scan
                </Button>
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

        {/* Success State */}
        {scanStatus === "success" && recognitionResult && (
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
                  <p className="text-white/90">{recognitionResult.role}</p>
                </div>
                <p className="text-white/80 text-sm mt-4">
                  Welcome! Entry logged at {formatTime(currentTime)}
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
                  Face not recognized
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
              <li>• Wait for the scan to complete</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GateTerminal;