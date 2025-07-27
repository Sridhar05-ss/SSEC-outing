import React, { useRef, useState, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import { db } from "../lib/firebase";
import { ref, get, set, query, orderByChild, equalTo, limitToLast } from "firebase/database";
import { 
  Camera, 
  Scan, 
  User, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Activity,
  Zap,
  Eye,
  Users,
  Building2,
  GraduationCap,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  Settings,
  Bell,
  Sparkles,
  LogOut
} from "lucide-react";
import { fakeAuth } from "../lib/fakeAuth";

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

interface AttendanceData {
  personId: string;
  status: 'in' | 'out';
  timestamp: string;
  role: string;
}

interface StudentData {
  name?: string;
  Name?: string;
  username?: string;
  department?: string;
  mode?: string;
  faceDescriptor?: number[];
  id?: string;
}

interface StaffData {
  name?: string;
  Name?: string;
  username?: string;
  department?: string;
  mode?: string;
  faceDescriptor?: number[];
  id?: string;
}

interface OutingRequest {
  id: string;
  status: string;
  date: string;
  arrivalTime: string;
}

const Gate: React.FC = () => {
  console.log('🎯 GATE COMPONENT LOADED');
  console.log('🔧 DEBUG: Component is running');
  console.log('🔧 DEBUG: Current time:', new Date().toISOString());
  
  // Component initialization
  useEffect(() => {
    console.log('🔧 DEBUG: useEffect triggered');
  }, []);
  
  const [cameraOpen, setCameraOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [showVisitorPass, setShowVisitorPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fullVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [accessLog, setAccessLog] = useState<AccessLog | null>(null);
  const [lastRecognizedFace, setLastRecognizedFace] = useState<string | null>(null);
  const [faceDetectionCount, setFaceDetectionCount] = useState(0);
  const [autoCaptureInterval, setAutoCaptureInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Cooldown tracking for face recognition
  const [faceCooldowns, setFaceCooldowns] = useState<Map<string, number>>(new Map());
  const COOLDOWN_DURATION = 30 * 1000; // 30 seconds in milliseconds
  
  // Welcome message state
  const [welcomeMessage, setWelcomeMessage] = useState<string>("");
  const [showWelcome, setShowWelcome] = useState(false);

  // New state for enhanced UI
  const [visitorName, setVisitorName] = useState("");
  const [visitorReason, setVisitorReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showParticles, setShowParticles] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState<'idle' | 'scanning' | 'processing' | 'success' | 'error'>('idle');
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceDetectionMessage, setFaceDetectionMessage] = useState("");

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check camera support on mount
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.log('❌ Camera not supported in this browser');
          setCameraError('Camera not supported in this browser');
          return;
        }
        
        // Check if we can access camera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the test stream
        console.log('✅ Camera access available');
      } catch (error) {
        console.log('❌ Camera access denied:', error);
        setCameraError('Camera access denied. Please allow camera permissions.');
      }
    };
    
    checkCameraSupport();
  }, []);

  // Monitor video element availability
  useEffect(() => {
    if (showCameraPreview) {
      const checkVideoElement = () => {
        if (videoRef.current) {
          console.log('✅ DEBUG: Video element is now available');
        } else {
          console.log('❌ DEBUG: Video element still not available');
        }
      };
      
      // Check immediately and after a short delay
      checkVideoElement();
      const timer = setTimeout(checkVideoElement, 500);
      
      return () => clearTimeout(timer);
    }
  }, [showCameraPreview]);

  // Real-time face detection
  const startFaceDetection = useCallback(() => {
    const getActiveVideo = () => {
      // Use full video if scanner is active, otherwise use preview video
      return scannerActive && fullVideoRef.current ? fullVideoRef.current : videoRef.current;
    };

    if (!getActiveVideo() || !modelsLoaded) {
      console.log('❌ DEBUG: Cannot start face detection - missing video or models');
      return;
    }

    console.log('🔄 DEBUG: Starting face detection...');

    const detectFaces = async () => {
      try {
        const activeVideo = getActiveVideo();
        if (!activeVideo) {
          console.log('❌ DEBUG: No active video for face detection');
          return;
        }
        
        // Check if video is ready
        if (activeVideo.readyState < 2) {
          console.log('⏳ DEBUG: Video not ready yet, waiting...');
          return;
        }
        
        const detections = await faceapi.detectAllFaces(activeVideo, new faceapi.TinyFaceDetectorOptions());
        
        if (detections.length > 0) {
          console.log(`✅ DEBUG: Detected ${detections.length} face(s)`);
          setFaceDetected(true);
          setFaceDetectionMessage("Scanning...");
          setSystemStatus('scanning');
        } else {
          console.log('❌ DEBUG: No faces detected');
          setFaceDetected(false);
          setFaceDetectionMessage("No face detected");
          setSystemStatus('idle');
        }
      } catch (error) {
        console.error('❌ DEBUG: Face detection error:', error);
        setFaceDetected(false);
        setFaceDetectionMessage("Detection error");
      }
    };

    // Run face detection every 1000ms (more reliable)
    const interval = setInterval(detectFaces, 1000);
    
    return () => clearInterval(interval);
  }, [scannerActive, modelsLoaded]);

  // Start face detection when camera is ready
  useEffect(() => {
    if (cameraOpen && modelsLoaded) {
      const cleanup = startFaceDetection();
      return cleanup;
    }
  }, [cameraOpen, modelsLoaded, startFaceDetection]);

  // Load face-api.js models on mount
  useEffect(() => {
    // Add global error handler for circular reference errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = typeof args[0] === 'string' ? args[0] : args.join(' ');
      if (errorMessage.includes('circular structure') || 
          errorMessage.includes('Converting circular structure') ||
          errorMessage.includes('cyclic object value') ||
          errorMessage.includes('JSON.stringify')) {
        console.log('🔄 Circular reference error caught and suppressed');
        return;
      }
      originalConsoleError.apply(console, args);
    };
    
    // Add global error handler for unhandled promise rejections
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      if (event.reason && 
          ((typeof event.reason === 'string' && 
            (event.reason.includes('circular structure') || 
             event.reason.includes('Converting circular structure') ||
             event.reason.includes('cyclic object value'))) ||
           (event.reason instanceof Error && 
            (event.reason.message.includes('circular structure') || 
             event.reason.message.includes('Converting circular structure') ||
             event.reason.message.includes('cyclic object value'))))) {
        console.log('🔄 Unhandled circular reference rejection caught and suppressed');
        event.preventDefault();
      }
    };
    
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    
    const loadModels = async () => {
      try {
        console.log('🔧 DEBUG: Loading face-api.js models...');
        
        // Use CDN URLs for models
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        
        // Load all required models
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        
        console.log('✅ DEBUG: All models loaded successfully');
        setModelsLoaded(true);
      } catch (error) {
        console.error('❌ DEBUG: Error loading models:', error);
        setModelsLoaded(false);
        setMessage('Failed to load face recognition models. Please refresh the page.');
      }
    };

    loadModels();
    
    // Restore original console.error and remove event listeners
    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    };
  }, []);

  // Cooldown management functions
  const isFaceInCooldown = (faceId: string): boolean => {
    const lastSeen = faceCooldowns.get(faceId);
    if (!lastSeen) return false;
    return Date.now() - lastSeen < COOLDOWN_DURATION;
  };

  const addFaceToCooldown = (faceId: string) => {
    setFaceCooldowns(prev => new Map(prev).set(faceId, Date.now()));
  };

  const getRemainingCooldownTime = (faceId: string): number => {
    const lastSeen = faceCooldowns.get(faceId);
    if (!lastSeen) return 0;
    const remaining = COOLDOWN_DURATION - (Date.now() - lastSeen);
    return Math.max(0, remaining);
  };

  // Sound effects
  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  };

  const playErrorSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(100, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  };

  const playWelcomeSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Play a pleasant welcome melody
      const frequencies = [523, 659, 784, 1047]; // C, E, G, C
      const duration = 0.15;
      
      frequencies.forEach((freq, index) => {
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * duration);
      });
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + frequencies.length * duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + frequencies.length * duration);
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  };

  // Welcome message display
  const showWelcomeMessage = (name: string) => {
    setWelcomeMessage(`Welcome, ${name}!`);
    setShowWelcome(true);
    playWelcomeSound();
    
    setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
  };

  // Get current attendance status
  const getCurrentAttendanceStatus = async (personId: string, role: string) => {
    try {
      const attendanceRef = ref(db, 'attendance');
      const attendanceQuery = query(
        attendanceRef,
        orderByChild('personId'),
        equalTo(personId),
        limitToLast(1)
      );
      
      const snapshot = await get(attendanceQuery);
      if (snapshot.exists()) {
        const attendanceData = Object.values(snapshot.val())[0] as AttendanceData;
        return attendanceData.status === 'in';
      }
      return false;
    } catch (error) {
      console.error('Error getting attendance status:', error);
      return false;
    }
  };

  // Auto-capture functionality
  const startAutoCapture = () => {
    const getActiveVideo = () => {
      // Use full video if scanner is active, otherwise use preview video
      return scannerActive && fullVideoRef.current ? fullVideoRef.current : videoRef.current;
    };
    
    if (!getActiveVideo() || !canvasRef.current || !modelsLoaded) {
      console.log('❌ DEBUG: Cannot start auto-capture - missing requirements');
      return;
    }
    
    console.log('🔄 DEBUG: Starting auto-capture...');

    const interval = setInterval(async () => {
      const activeVideo = getActiveVideo();
      if (!activeVideo || !canvasRef.current) return;
      
      try {
        const canvas = canvasRef.current;
        const video = activeVideo;
        const context = canvas.getContext('2d');
        
        if (!context) {
          console.log('❌ DEBUG: No canvas context');
          return;
        }

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Detect faces for recognition
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();
        
        if (detections.length > 0) {
          console.log(`👤 DEBUG: Detected ${detections.length} face(s) for recognition`);
          setFaceDetectionCount(prev => prev + 1);
          
                  // Capture the frame for recognition with improved handling
        try {
          // Create a clean canvas to avoid circular references
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempContext = tempCanvas.getContext('2d');
          
          if (!tempContext) {
            console.error('❌ DEBUG: Failed to get temporary canvas context');
            return;
          }
          
          // Draw the current frame to the temporary canvas
          tempContext.drawImage(canvas, 0, 0);
          const capturedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.8); // Use lower quality for smaller size
          
          // Add a small delay to prevent rapid successive calls
          setTimeout(async () => {
            try {
              // Pass the clean data URL directly to face recognition
              await performFaceRecognition(capturedDataUrl);
              
              // Clean up to prevent memory leaks
              URL.revokeObjectURL(capturedDataUrl);
            } catch (error) {
              console.error('❌ DEBUG: Face recognition failed in auto-capture:', error);
              // Don't rethrow to prevent stopping the auto-capture process
            }
          }, 500);
        } catch (error) {
          console.error('❌ DEBUG: Failed to capture frame:', error);
        }
          } else {
          console.log('❌ DEBUG: No faces detected for recognition');
        }
      } catch (error) {
        console.error('❌ DEBUG: Auto-capture error:', error);
      }
    }, 3000); // Check every 3 seconds (more reliable)

    setAutoCaptureInterval(interval);
    console.log('✅ DEBUG: Auto-capture started');
  };

  // Camera management
  const handleStartCamera = async () => {
    try {
      console.log('📹 DEBUG: Starting camera...');
      setCameraError("");
      setSystemStatus('scanning');
      setShowCameraPreview(true);
      
      // Check if media devices are supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }
      
      // Wait for video element to be available (now always rendered)
      let attempts = 0;
      const maxAttempts = 20;
      
      while (!videoRef.current && attempts < maxAttempts) {
        console.log(`🔄 DEBUG: Waiting for video element... Attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 250));
        attempts++;
      }
      
      if (!videoRef.current) {
        console.error('❌ DEBUG: Video element still not available after all attempts');
        
        // Try to create video element programmatically as fallback
        console.log('🔄 DEBUG: Attempting to create video element programmatically...');
        const videoElement = document.createElement('video');
        videoElement.width = 320;
        videoElement.height = 240;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.muted = true;
        videoElement.className = 'rounded-xl shadow-lg border-2 border-blue-200 transition-all duration-300';
        
        // Find the camera preview container and append the video
        const cameraContainer = document.querySelector('[data-camera-preview]');
        if (cameraContainer) {
          cameraContainer.appendChild(videoElement);
          videoRef.current = videoElement;
          console.log('✅ DEBUG: Video element created programmatically');
        } else {
          throw new Error('Video element not available - please refresh the page');
        }
      }
      
      console.log('✅ DEBUG: Video element found');
      
      // Request camera permissions with fallback options
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            facingMode: 'user'
          }
        });
      } catch (streamError) {
        console.log('⚠️ DEBUG: Primary camera request failed, trying fallback...');
        // Fallback to basic video constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      
      console.log('✅ DEBUG: Camera stream obtained');
      
      // Set up video elements one by one to avoid conflicts
      const setupVideoElement = async (videoElement: HTMLVideoElement, elementName: string) => {
        return new Promise<void>((resolve, reject) => {
          videoElement.srcObject = mediaStream;
          
          videoElement.onloadedmetadata = () => {
            console.log(`✅ DEBUG: ${elementName} metadata loaded`);
            videoElement.play().then(() => {
              console.log(`✅ DEBUG: ${elementName} started playing`);
              resolve();
            }).catch((playError) => {
              console.error(`❌ DEBUG: ${elementName} play error:`, playError);
              reject(new Error(`${elementName} playback failed: ${playError.message}`));
            });
          };
          
          videoElement.onerror = (error) => {
            console.error(`❌ DEBUG: ${elementName} error:`, error);
            reject(new Error(`${elementName} setup failed`));
          };
          
          // Set a timeout in case the video doesn't load
          setTimeout(() => {
            reject(new Error(`${elementName} setup timeout`));
          }, 5000);
        });
      };
      
      // Setup video elements sequentially
      try {
        if (videoRef.current) {
          await setupVideoElement(videoRef.current, 'Preview Video');
        }
        if (fullVideoRef.current) {
          await setupVideoElement(fullVideoRef.current, 'Full Video');
        }
        
        setStream(mediaStream);
        setCameraOpen(true);
        setMessage('Camera activated successfully');
            startAutoCapture();
        console.log('✅ DEBUG: Camera setup completed successfully');
        
      } catch (setupError) {
        console.error('❌ DEBUG: Video setup error:', setupError);
        // Clean up the stream if setup failed
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }
        throw setupError;
      }
      
    } catch (error) {
      console.error('❌ DEBUG: Camera error:', error);
      setCameraError(`Failed to access camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSystemStatus('error');
      setShowCameraPreview(false);
      
      // Clean up any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const restartAutoCapture = () => {
    if (autoCaptureInterval) {
      clearInterval(autoCaptureInterval);
      setAutoCaptureInterval(null);
    }
        startAutoCapture();
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (autoCaptureInterval) {
      clearInterval(autoCaptureInterval);
      setAutoCaptureInterval(null);
    }
    setCameraOpen(false);
    setShowCameraPreview(false);
    setSystemStatus('idle');
    console.log('📹 DEBUG: Camera closed');
  };

  // Face recognition processing
  const performFaceRecognition = async (capturedDataUrl: string) => {
    if (!modelsLoaded) {
      console.log('❌ DEBUG: Models not loaded');
      setMessage('Face recognition models not loaded. Please refresh the page.');
      playErrorSound();
      setSystemStatus('error');
        return;
      }

    // Prevent multiple simultaneous recognition attempts
    if (isProcessing) {
      console.log('⏳ DEBUG: Already processing, skipping...');
        return;
      }

    try {
      console.log('🔍 DEBUG: Performing face recognition...');
      setIsProcessing(true);
      setSystemStatus('processing');
      
      // Create an image element from the captured data
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Prevent CORS issues
      
      // Create a clean canvas to avoid circular references
      const cleanCanvas = document.createElement('canvas');
      const cleanContext = cleanCanvas.getContext('2d');
      cleanCanvas.width = 320;
      cleanCanvas.height = 240;
      
      // Load the captured data into a clean image with improved error handling
      await new Promise<void>((resolve, reject) => {
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        
        // Set a timeout to prevent hanging promises
        const timeout = setTimeout(() => {
          reject(new Error('Image loading timeout'));
        }, 5000);
        
        tempImg.onload = () => {
          try {
            if (!cleanContext) {
              clearTimeout(timeout);
              reject(new Error('Canvas context is null'));
              return;
            }
            
            // Draw to clean canvas and get a fresh data URL
            cleanContext.drawImage(tempImg, 0, 0, 320, 240);
            const cleanDataUrl = cleanCanvas.toDataURL('image/jpeg', 0.8); // Use lower quality for smaller size
            
            // Load the clean data URL into the final image
            img.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            img.onerror = (err) => {
              clearTimeout(timeout);
              reject(new Error('Failed to load clean image: ' + err));
            };
            img.src = cleanDataUrl;
          } catch (error) {
            clearTimeout(timeout);
            reject(error);
          }
        };
        
        tempImg.onerror = (err) => {
          clearTimeout(timeout);
          reject(new Error('Failed to load captured image: ' + err));
        };
        
        // Use a short timeout before setting src to avoid race conditions
        setTimeout(() => {
          tempImg.src = capturedDataUrl;
        }, 50);
      });
      
      // Detect faces and get descriptors
      const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      if (detections.length === 0) {
        console.log('❌ DEBUG: No faces detected in captured image');
        setMessage('No face detected. Please position your face in the camera.');
        playErrorSound();
        setSystemStatus('error');
        return;
      }
      
      console.log(`✅ DEBUG: Found ${detections.length} face(s) in captured image`);
      
      const faceDescriptor = detections[0].descriptor;
      
      // Search in students database with optimized approach
      console.log('Searching for student match with optimized approach...');
      
      // Get the list of departments first to optimize fetching
      const deptListRef = ref(db, 'students');
      const deptListSnap = await get(deptListRef);
      let bestMatch: StudentData | null = null;
      let bestDistance = 0.6; // Threshold for face recognition
      
      if (deptListSnap.exists()) {
        const departments = Object.keys(deptListSnap.val());
        console.log(`Found ${departments.length} departments to check`);
        
        // Process departments in parallel for better performance
        const checkDepartmentPromises = departments.map(async (dept) => {
          console.log(`Checking department: ${dept}`);
          const deptRef = ref(db, `students/${dept}`);
          const deptSnap = await get(deptRef);
          
          if (deptSnap.exists()) {
            const students = deptSnap.val();
            console.log(`Found ${Object.keys(students).length} students in ${dept}`);
            
            for (const [studentId, student] of Object.entries(students)) {
              if (student.faceDescriptor) {
                const distance = faceapi.euclideanDistance(faceDescriptor, student.faceDescriptor);
                if (distance < bestDistance) {
                  bestDistance = distance;
                  bestMatch = { ...student, id: studentId, department: dept };
                  console.log(`Found potential student match: ${student.name || student.Name} with distance ${distance}`);
                }
              }
            }
          }
        });
        
        // Wait for all department checks to complete
        await Promise.all(checkDepartmentPromises);
        
        if (bestMatch) {
          console.log('✅ DEBUG: Student found:', bestMatch);
          await handleStudentAccess({
            name: bestMatch.name || bestMatch.Name || bestMatch.username || 'Unknown',
            id: bestMatch.id || '',
            department: bestMatch.department || 'Unknown',
            role: 'student',
            mode: bestMatch.mode || 'regular'
          });
          return;
        }
      }
      
      // Search in staff database with optimized approach
      console.log('Searching for staff match with optimized approach...');
      
      // For staff, we'll use a more efficient approach by fetching only the necessary data
      const staffRef = ref(db, 'staff');
      const staffSnapshot = await get(staffRef);
      // Reset match variables for staff search
      bestMatch = null;
      bestDistance = 0.6;
      
      if (staffSnapshot.exists()) {
        const staff = staffSnapshot.val() as Record<string, StaffData>;
        console.log(`Found ${Object.keys(staff).length} staff members to check`);
        
        // Process staff members in chunks for better performance
        const staffEntries = Object.entries(staff);
        const chunkSize = 10; // Process 10 staff members at a time
        
        for (let i = 0; i < staffEntries.length; i += chunkSize) {
          const chunk = staffEntries.slice(i, i + chunkSize);
          
          // Process each chunk in parallel
          await Promise.all(chunk.map(async ([staffId, staffMember]) => {
            if (staffMember.faceDescriptor) {
              const distance = faceapi.euclideanDistance(faceDescriptor, staffMember.faceDescriptor);
              if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = { ...staffMember, id: staffId };
                console.log(`Found potential staff match: ${staffMember.name} with distance ${distance}`);
              }
            }
          }));
        }
        
        if (bestMatch) {
          console.log('✅ DEBUG: Staff found:', bestMatch);
          await handleStaffAccess({
            name: bestMatch.name || bestMatch.Name || bestMatch.username || 'Unknown',
            id: bestMatch.id || '',
            department: bestMatch.department || 'Unknown',
            role: 'staff',
            mode: bestMatch.mode || 'regular'
          });
          return;
        }
      }
      
      console.log('❌ DEBUG: No match found');
      setMessage('Face not recognized. Please register or try again.');
      playErrorSound();
      setSystemStatus('error');
      
    } catch (error) {
      console.error('❌ DEBUG: Face recognition error:', error);
      
      // Handle circular reference errors specifically
      if (error instanceof Error && 
          (error.message.includes('circular structure') || 
           error.message.includes('Converting circular structure') ||
           error.message.includes('cyclic object value'))) {
        console.log('🔄 DEBUG: Circular reference detected, handling gracefully');
        setMessage('Processing face recognition... Please wait.');
        // Don't set error status for circular reference
        
        // Force garbage collection by nullifying references
        if (image && image instanceof HTMLImageElement) {
          img.onload = null;
          img.onerror = null;
          img.src = '';
        }
        
        // Schedule a retry with a clean state after a short delay
        setTimeout(() => {
          setIsProcessing(false);
          // We don't automatically retry to avoid infinite loops
        }, 1000);
        return;
      }
      
      setMessage('Error during face recognition. Please try again.');
      playErrorSound();
      setSystemStatus('error');
    } finally {
      // In the finally block, we need to set processing to false
      // The error handling for circular references already returns early
      // so this will only execute for non-circular reference errors
      setIsProcessing(false);
    }
  };

  // Staff access handling
  const handleStaffAccess = async (staff: RecognitionResult) => {
    try {
      console.log('👨‍💼 DEBUG: Processing staff access for:', staff.name);
      
      // Check cooldown
      if (isFaceInCooldown(staff.id)) {
        const remainingTime = getRemainingCooldownTime(staff.id);
        const remainingSeconds = Math.ceil(remainingTime / 1000);
        setMessage(`Access denied. Please wait ${remainingSeconds} second(s) before next scan.`);
        playErrorSound();
        setSystemStatus('error');
        return;
      }
      
      // Get current attendance status
      const isCurrentlyIn = await getCurrentAttendanceStatus(staff.id, 'staff');
      const direction = isCurrentlyIn ? 'out' : 'in';
      
      // Create access log
      const accessLogData: AccessLog = {
        id: Date.now().toString(),
        staffId: staff.id,
        name: staff.name,
        department: staff.department,
        mode: staff.mode,
        direction,
        timestamp: new Date().toISOString(),
        status: 'granted',
        role: 'staff'
      };
      
      // Save to database
      const accessLogRef = ref(db, `accessLogs/${accessLogData.id}`);
      await set(accessLogRef, accessLogData);
      
      // Save to new_attend collection for staff
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      console.log(`🔄 DEBUG: Saving to new_attend collection for staff`);
      
      // Save to new_attend collection
      const collectionRef = ref(db, `new_attend/${today}/${staff.id}`);
      const dataToSave = {
        id: staff.id,
        name: staff.name,
        department: staff.department,
        mode: staff.mode || "Staff",
        in: direction === 'in' ? new Date().toISOString() : '',
        out: direction === 'out' ? new Date().toISOString() : '',
        status: direction.toUpperCase(),
        timestamp: new Date().toISOString()
      };
      
      try {
        await set(collectionRef, dataToSave);
        console.log(`✅ DEBUG: Successfully saved to new_attend collection`);
      } catch (error) {
        console.error(`❌ DEBUG: Error saving to new_attend:`, error);
        throw error;
      }
      
      // Update attendance (legacy)
      const attendanceRef = ref(db, `attendance/${staff.id}`);
      await set(attendanceRef, {
        personId: staff.id,
        status: direction === 'in' ? 'in' : 'out',
        timestamp: new Date().toISOString(),
        role: 'staff'
      });
      
      // Add to cooldown
      addFaceToCooldown(staff.id);
      
      // Show success message
      const action = direction === 'in' ? 'IN' : 'OUT';
      setMessage(`${staff.name} registered ${action}!`);
      setRecognitionResult(staff);
      setAccessLog(accessLogData);
      playSuccessSound();
      showWelcomeMessage(staff.name);
      setSystemStatus('success');
      
      console.log('✅ DEBUG: Staff access processed successfully');

    } catch (error) {
      console.error('❌ DEBUG: Staff access error:', error);
      setMessage('Error recording access. Please try again.');
      playErrorSound();
      setSystemStatus('error');
    }
  };

  // Student access handling
  const handleStudentAccess = async (student: RecognitionResult) => {
    try {
      console.log('👨‍🎓 DEBUG: Processing student access for:', student.name);
      
      // Check cooldown
      if (isFaceInCooldown(student.id)) {
        const remainingTime = getRemainingCooldownTime(student.id);
        const remainingSeconds = Math.ceil(remainingTime / 1000);
        setMessage(`Access denied. Please wait ${remainingSeconds} second(s) before next scan.`);
        playErrorSound();
        setSystemStatus('error');
        return;
      }
      
      // Get current attendance status
      const isCurrentlyIn = await getCurrentAttendanceStatus(student.id, 'student');
      const direction = isCurrentlyIn ? 'out' : 'in';
      
      // Check for outing requests if student is trying to go out
      let outingApproved = false;
      let outingRequestId = null;
      
      if (direction === 'out') {
        const outingRequestsRef = ref(db, 'outingRequests');
        const outingQuery = query(
          outingRequestsRef,
          orderByChild('studentId'),
          equalTo(student.id)
        );
        
        const outingSnapshot = await get(outingQuery);
        if (outingSnapshot.exists()) {
          const requests = outingSnapshot.val() as Record<string, OutingRequest>;
          const approvedRequest = Object.values(requests).find((req: OutingRequest) => 
            req.status === 'approved' && 
            new Date(req.date) <= new Date() &&
            new Date(req.arrivalTime) >= new Date()
          );
          
          if (approvedRequest) {
            outingApproved = true;
            outingRequestId = approvedRequest.id;
          }
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
        status: 'granted',
        role: 'student',
        outingApproved,
        outingRequestId
      };
      
      // Save to database
      const accessLogRef = ref(db, `accessLogs/${accessLogData.id}`);
      await set(accessLogRef, accessLogData);
      
      // Determine which collection to use based on student mode
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const collectionName = student.mode === "Hosteller" ? "outing" : "new_attend";
      console.log(`🔄 DEBUG: Saving to ${collectionName} collection for ${student.mode} student`);
      
      // Get current timestamp
      const timestamp = new Date().toISOString();
      
      // Save to appropriate collection based on student mode
      const collectionRef = student.mode === "Hosteller" 
        ? ref(db, `${collectionName}/${today}/${student.id}/current`)
        : ref(db, `${collectionName}/${today}/${student.id}`);
        
      console.log(`Using database path: ${student.mode === "Hosteller" ? 
        `${collectionName}/${today}/${student.id}/current` : 
        `${collectionName}/${today}/${student.id}`}`);
      
      // Create data structure based on student mode
      let dataToSave;
      
      if (student.mode === "Hosteller") {
        // For hostellers, use the structure shown in the image
        if (direction === 'in') {
          dataToSave = {
            department: student.department,
            in: timestamp.split('T')[1].substring(0, 8), // Format: HH:MM:SS
            in_time: timestamp.split('T')[1].substring(0, 8), // Format: HH:MM:SS
            in_timestamp: timestamp,
            name: student.name,
            out_time: "",
            out_timestamp: "",
            username: student.id,
            status: "IN",
            outingApproved: outingApproved
          };
          
          console.log('Saving hosteller IN data with format:', dataToSave);
        } else {
          // For OUT, we need to get the existing IN data first
          const existingData = await get(collectionRef);
          dataToSave = {
            ...existingData.exists() ? existingData.val() : {},
            out: timestamp.split('T')[1].substring(0, 8), // Format: HH:MM:SS as shown in image
            out_time: timestamp.split('T')[1].substring(0, 8), // Format: HH:MM:SS
            out_timestamp: timestamp,
            status: "OUT",
            outingApproved: outingApproved
          };
          
          console.log('Updating hosteller OUT data with format:', dataToSave);
        }
      } else {
        // Regular format for non-hostellers
        dataToSave = {
          id: student.id,
          name: student.name,
          department: student.department,
          mode: student.mode,
          in: direction === 'in' ? timestamp : '',
          out: direction === 'out' ? timestamp : '',
          status: direction.toUpperCase(),
          outingApproved: outingApproved,
          timestamp: timestamp
        };
      }
      
      try {
        await set(collectionRef, dataToSave);
        console.log(`✅ DEBUG: Successfully saved to ${collectionName} collection`);
      } catch (error) {
        console.error(`❌ DEBUG: Error saving to ${collectionName}:`, error);
        throw error;
      }
      
      // Update attendance (legacy)
      const attendanceRef = ref(db, `attendance/${student.id}`);
      await set(attendanceRef, {
        personId: student.id,
        status: direction === 'in' ? 'in' : 'out',
        timestamp: new Date().toISOString(),
        role: 'student'
      });
      
      // Add to cooldown
      addFaceToCooldown(student.id);
      
      // Show success message
      const action = direction === 'in' ? 'IN' : 'OUT';
      const outingMessage = direction === 'out' && outingApproved ? ' (Outing Approved)' : '';
      setMessage(`${student.name} registered ${action}!${outingMessage}`);
      setRecognitionResult(student);
      setAccessLog(accessLogData);
      playSuccessSound();
      showWelcomeMessage(student.name);
      setSystemStatus('success');
      
      console.log('✅ DEBUG: Student access processed successfully');

    } catch (error) {
      console.error('❌ DEBUG: Student access error:', error);
      setMessage('Error recording access. Please try again.');
      playErrorSound();
      setSystemStatus('error');
    }
  };

  // Manual scan face
  const handleScanFace = async () => {
    const getActiveVideo = () => {
      // Use full video if scanner is active, otherwise use preview video
      return scannerActive && fullVideoRef.current ? fullVideoRef.current : videoRef.current;
    };

    const activeVideo = getActiveVideo();
    if (!activeVideo || !canvasRef.current) {
      setMessage('Camera not available');
      return;
    }
    
    try {
      const canvas = canvasRef.current;
      const video = activeVideo;
      const context = canvas.getContext('2d');
      
      if (!context) {
        setMessage('Canvas context not available');
        return;
      }
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const capturedDataUrl = canvas.toDataURL('image/jpeg');
      await performFaceRecognition(capturedDataUrl);
      
    } catch (error) {
      console.error('Manual scan error:', error);
      setMessage('Error during manual scan');
    }
  };

  // Visitor pass handling
  const handleVisitorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle visitor pass submission
    console.log('Visitor pass submitted:', { visitorName, visitorReason });
    setShowVisitorPass(false);
  };

  // Scanner controls
  const handleStartScanner = () => {
    setShowCameraPreview(true);
    setScannerActive(true);
    handleStartCamera();
  };

  // Simple camera test function
  const handleTestCamera = async () => {
    try {
      console.log('🧪 DEBUG: Testing camera...');
      setCameraError("");
      setSystemStatus('scanning');
      setShowCameraPreview(true);
      
      // Check if media devices are supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }
      
      // Wait for video element to be available
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!videoRef.current && attempts < maxAttempts) {
        console.log(`🔄 DEBUG: Waiting for video element in test... Attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      if (!videoRef.current) {
        throw new Error('Video element not available for test');
      }
      
      // Simple camera request
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      
      console.log('✅ DEBUG: Test camera stream obtained');
      
      // Set up the preview video for testing
      videoRef.current.srcObject = mediaStream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().then(() => {
          console.log('✅ DEBUG: Test camera started successfully');
          setMessage('Test camera activated');
          setCameraOpen(true);
          setStream(mediaStream);
        }).catch((error) => {
          console.error('❌ DEBUG: Test camera play error:', error);
          setCameraError('Test camera playback failed');
        });
      };
      
    } catch (error) {
      console.error('❌ DEBUG: Test camera error:', error);
      setCameraError(`Test camera failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSystemStatus('error');
    }
  };

  const handleEndScanner = () => {
    closeCamera();
    setScannerActive(false);
  };

  // Particle animation component
  const ParticleBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
      {/* Particle Background */}
      {showParticles && <ParticleBackground />}
      
      {/* Welcome Message Overlay */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-8 rounded-2xl shadow-2xl transform animate-pulse">
            <div className="text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 animate-bounce" />
              <h2 className="text-3xl font-bold mb-2">{welcomeMessage}</h2>
              <p className="text-blue-100">Access granted successfully!</p>
      </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12 relative">
          <div className="absolute top-0 right-0">
            <button
              onClick={() => {
                fakeAuth.logout();
                window.location.href = '/login';
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-semibold hover:from-red-600 hover:to-pink-600 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Smart Gate System
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Advanced Face Recognition Access Control
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{currentTime.toLocaleTimeString()}</span>
            <span>•</span>
            <span>{currentTime.toLocaleDateString()}</span>
          </div>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${systemStatus === 'idle' ? 'bg-gray-400' : systemStatus === 'scanning' ? 'bg-blue-500 animate-pulse' : systemStatus === 'processing' ? 'bg-yellow-500 animate-spin' : systemStatus === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-semibold text-gray-700">System Status</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2 capitalize">{systemStatus}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-700">Camera</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{cameraOpen ? 'Active' : 'Inactive'}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-700">Models</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{modelsLoaded ? 'Loaded' : 'Loading'}</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-700">Detections</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{faceDetectionCount}</p>
          </div>
        </div>

        {/* Camera Preview - Always rendered but conditionally visible */}
        <div 
          data-camera-preview
          className={`bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-blue-200 mb-6 transition-all duration-300 ${showCameraPreview ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        >
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Camera Preview
            </h3>
            
            <div className="relative">
              <video 
                ref={videoRef} 
                width={320} 
                height={240} 
                autoPlay 
                playsInline
                muted
                className={`rounded-xl shadow-lg border-2 border-blue-200 transition-all duration-300 ${cameraOpen ? 'opacity-100' : 'opacity-0'}`}
              />
              <canvas 
                ref={canvasRef} 
                width={320} 
                height={240} 
                className="hidden"
              />
              
              {/* Face Detection Status Overlay */}
              {cameraOpen && (
                <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${faceDetected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    <p className="text-sm font-semibold">{faceDetectionMessage}</p>
                  </div>
        </div>
      )}
              
              {/* Processing Overlay */}
              {isProcessing && cameraOpen && (
                <div className="absolute inset-0 bg-blue-600/20 rounded-xl flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm font-semibold">Processing...</p>
                  </div>
                </div>
              )}
              
              {/* Loading Placeholder */}
              {!cameraOpen && (
                <div className="absolute inset-0 bg-gray-200 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">Camera Loading...</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Start Scanner" to activate</p>
                  </div>
                </div>
              )}
            </div>
              
              {cameraOpen && (
                <div className="mt-4 text-center">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                    faceDetected 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    {faceDetectionMessage}
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={handleScanFace} 
                  disabled={loading || isProcessing || !cameraOpen}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Scan className="w-4 h-4" />
                  Manual Scan
                </button>
                
                <button 
                  onClick={handleTestCamera} 
                  disabled={cameraOpen}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Camera className="w-4 h-4" />
                  Test Camera
                </button>
              </div>
            </div>
          </div>

        {/* Control Panel */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-blue-200 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleStartScanner}
          disabled={scannerActive}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                scannerActive
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg'
              }`}
            >
              <Play className="w-5 h-5" />
          Start Scanner
        </button>
            
        <button
          onClick={handleEndScanner}
          disabled={!scannerActive}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                !scannerActive
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 hover:scale-105 shadow-lg'
              }`}
            >
              <Pause className="w-5 h-5" />
          End Scanner
        </button>
            
            {/* Debug Camera Button */}
            <button
              onClick={handleStartCamera}
              className="flex items-center gap-3 px-6 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 transition-all duration-300"
            >
              <Camera className="w-5 h-5" />
              Test Camera
        </button>
      </div>
          
          {/* Debug Info */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-2">Debug Info:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Camera Open: {cameraOpen ? 'Yes' : 'No'}</p>
              <p>Scanner Active: {scannerActive ? 'Yes' : 'No'}</p>
              <p>Show Camera Preview: {showCameraPreview ? 'Yes' : 'No'}</p>
              <p>Models Loaded: {modelsLoaded ? 'Yes' : 'No'}</p>
              <p>System Status: {systemStatus}</p>
              {cameraError && <p className="text-red-600">Camera Error: {cameraError}</p>}
            </div>
          </div>
        </div>

        {/* Full Camera Feed - Only shows when scanner is active */}
      {scannerActive && cameraOpen && (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-blue-200 mb-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Video Feed */}
              <div className="flex-1">
                <div className="relative">
                  <video 
                    ref={fullVideoRef} 
                    width={480} 
                    height={360} 
                    autoPlay 
                    playsInline
                    muted
                    className="w-full rounded-xl shadow-lg border-4 border-blue-200"
                  />
                  <canvas 
                    ref={canvasRef} 
                    width={480} 
                    height={360} 
                    className="hidden"
                  />
                  
                  {/* Face Detection Status Overlay */}
                  <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className={`w-12 h-12 rounded-full mx-auto mb-3 ${faceDetected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                      <p className="text-lg font-semibold">{faceDetectionMessage}</p>
                    </div>
                  </div>
                  
                  {/* Processing Overlay */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-blue-600/20 rounded-xl flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg font-semibold">Processing...</p>
                      </div>
            </div>
          )}
                </div>
                
                {/* Face Detection Status */}
                <div className="mt-4 text-center">
                  <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full text-sm font-medium ${
                    faceDetected 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    {faceDetectionMessage}
                  </div>
            </div>
            
                <button 
                  onClick={handleScanFace} 
                  disabled={loading || isProcessing}
                  className="mt-4 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Scan className="w-5 h-5" />
                  Manual Scan
                </button>
            </div>
            
              {/* Status Panel */}
              <div className="flex-1 space-y-6">
                {/* Debug Info */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Debug Info & Troubleshooting
                  </h3>
                  
                  {cameraError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-2">🔧 Troubleshooting Steps:</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• Refresh the page and try again</li>
                        <li>• Allow camera permissions when prompted</li>
                        <li>• Check if another app is using your camera</li>
                        <li>• Try using a different browser (Chrome recommended)</li>
                        <li>• Make sure you're using HTTPS (required for camera)</li>
                      </ul>
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Camera Open:</span>
                      <span className="font-mono">{cameraOpen ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Scanner Active:</span>
                      <span className="font-mono">{scannerActive ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Show Preview:</span>
                      <span className="font-mono">{showCameraPreview ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Models Loaded:</span>
                      <span className="font-mono">{modelsLoaded ? '✅' : '❌'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">System Status:</span>
                      <span className="font-mono">{systemStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Camera Error:</span>
                      <span className="font-mono">{cameraError || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Video Elements:</span>
                      <span className="font-mono">
                        {videoRef.current ? '✅' : '❌'} / {fullVideoRef.current ? '✅' : '❌'}
              </span>
                    </div>
            </div>
          </div>
          
                {/* Model Status */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    System Status
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Face Detection Models</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${modelsLoaded ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                        <span className="font-semibold">{modelsLoaded ? 'Loaded' : 'Loading'}</span>
            </div>
          </div>
          
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Auto-capture</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${autoCaptureInterval ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="font-semibold">{autoCaptureInterval ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Cooldown System</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-semibold">2-Minute Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message Display */}
                {message && (
                  <div className={`rounded-xl p-6 ${
                    message.includes('recorded') || message.includes('Welcome') 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
                      : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      {message.includes('recorded') || message.includes('Welcome') ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                      <h3 className="font-semibold text-gray-800">Status Message</h3>
                    </div>
                    <p className="text-lg font-medium">{message}</p>
                  </div>
                )}

                {/* Recognition Result */}
          {recognitionResult && accessLog && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Access Recorded
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-semibold">{recognitionResult.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID:</span>
                        <span className="font-semibold">{recognitionResult.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Department:</span>
                        <span className="font-semibold">{recognitionResult.department}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Role:</span>
                        <span className="font-semibold capitalize">{recognitionResult.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-semibold ${accessLog.direction === "out" ? "text-red-600" : "text-green-600"}`}>
                          {accessLog.direction === "out" ? "EXIT" : "ENTRY"}
                        </span>
                      </div>
                    </div>
            </div>
          )}
              </div>
            </div>
          </div>
        )}

        {/* Visitor Pass Form */}
          {showVisitorPass && (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-blue-200">
            <form onSubmit={handleVisitorSubmit} className="max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Visitor Pass</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visitor Name</label>
                  <input 
                    type="text"
                    placeholder="Enter visitor name"
                    value={visitorName}
                    onChange={e => setVisitorName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Visit</label>
                  <textarea
                    placeholder="Enter reason for visit"
                    value={visitorReason}
                    onChange={e => setVisitorReason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                    rows={3}
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                >
                  Submit Visitor Pass
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error Display */}
        {cameraError && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-200 mt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <span className="font-semibold text-red-800">Camera Error</span>
            </div>
            <p className="text-red-700 mt-2">{cameraError}</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default Gate;