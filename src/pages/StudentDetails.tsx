import React, { useEffect, useState, useRef } from "react";
import { db } from "../lib/firebase";
import { ref, get, set, update } from "firebase/database";
import * as faceapi from "face-api.js";

interface Student {
  username?: string;
  name?: string;
  Name?: string;
  department?: string;
  captureStatus?: string;
  face?: string;
  role?: string;
  mode?: string;
  password?: string;
  faceDescriptor?: number[];
}

interface StudentDetailsProps {
  department: string;
}

const departments = [
  "CSE", "ECE", "MECH", "CIVIL", "IT", "AIML", "CYBER SECURITY", "AIDS", "EEE", "DCSE", "DECE", "DMECH"
];

const StudentDetails: React.FC<StudentDetailsProps> = ({ department }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModal, setEditModal] = useState<{ open: boolean; student?: Student }>({ open: false });
  const [editData, setEditData] = useState<Partial<Student>>({});
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<{ username?: string; department?: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
  }, []);

  const fetchStudents = () => {
    setLoading(true);
    setError("");
    get(ref(db, `students/${department}`))
      .then(snapshot => {
        const data = snapshot.val();
        setStudents(data ? Object.values(data) : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line
  }, [department]);

  const handleEditOpen = (student: Student) => {
    setEditData({ ...student });
    setEditModal({ open: true, student });
  };
  const handleEditSave = async () => {
    if (!editData.username || !editData.department) return;
    setSaving(true);
    try {
      await update(ref(db, `students/${editData.department}/${editData.username}`), {
        username: editData.username,
        Name: editData.name || editData.Name,
        department: editData.department,
        role: editData.role,
        mode: editData.mode,
        password: editData.password // Save DOB as password
      });
      alert("Student updated!");
      setEditModal({ open: false });
      setEditData({});
      fetchStudents();
    } catch (err) {
      alert("Failed to update student.");
    }
    setSaving(false);
  };

  const openCamera = (username: string, department: string) => {
    setCurrentStudent({ username, department });
    setCameraOpen(true);
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
    setCurrentStudent(null);
    if (stream) stream.getTracks().forEach(track => track.stop());
  };
  const captureFace = async () => {
    console.log('captureFace called, modelsLoaded:', modelsLoaded);
    if (!modelsLoaded) {
      setCameraError("Face recognition models not loaded yet.");
      console.warn('Tried to capture before models loaded');
      return;
    }
    if (videoRef.current && canvasRef.current && currentStudent?.username && currentStudent.department) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        try {
          // Draw video frame to canvas
          ctx.drawImage(videoRef.current, 0, 0, 320, 240);
          
          // Get the data URL directly from the canvas
          const dataUrl = canvasRef.current.toDataURL('image/png');
          
          // Create a completely clean image without any video references
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              try {
                // Create a new canvas and draw the clean image
                const cleanCanvas = document.createElement('canvas');
                const cleanContext = cleanCanvas.getContext('2d');
                cleanCanvas.width = 320;
                cleanCanvas.height = 240;
                cleanContext?.drawImage(img, 0, 0, 320, 240);
                
                // Get clean data URL
                const cleanDataUrl = cleanCanvas.toDataURL('image/png');
                
                // Perform face detection with the clean image
                faceapi.fetchImage(cleanDataUrl)
                  .then(faceImg => {
                    return faceapi.detectSingleFace(faceImg, new faceapi.TinyFaceDetectorOptions())
                      .withFaceLandmarks()
                      .withFaceDescriptor();
                  })
                  .then(detection => {
                    console.log('Detection result:', detection);
                    if (!detection) {
                      setCameraError("No face detected. Please try again with your face clearly visible and well-lit.");
                      return;
                    }
                    const descriptor = Array.from(detection.descriptor);
                    return set(ref(db, `students/${currentStudent.department}/${currentStudent.username}/faceDescriptor`), descriptor);
                  })
                  .then(() => {
                    alert('Face captured and saved!');
                    closeCamera();
                    fetchStudents();
                  })
                  .catch(error => {
                    console.error('Face detection error:', error);
                    setCameraError("Error during face detection. Please try again.");
                  });
                resolve();
              } catch (error) {
                reject(error);
              }
            };
            img.onerror = reject;
            img.src = dataUrl;
          });
          
        } catch (error) {
          console.error('Capture face error:', error);
          setCameraError("Error capturing face. Please try again.");
        }
      }
    }
  };

  // Filter students based on search query
  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    return (
      (student.username && student.username.toLowerCase().includes(query)) ||
      (student.name && student.name.toLowerCase().includes(query)) ||
      (student.Name && student.Name.toLowerCase().includes(query)) ||
      (student.department && student.department.toLowerCase().includes(query)) ||
      (student.mode && student.mode.toLowerCase().includes(query))
    );
  });

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', background: 'white', borderRadius: 18, boxShadow: '0 8px 32px #0001', padding: 32 }}>
      <h2 style={{fontWeight: 700, color: '#1848c1', marginBottom: 24, fontSize: 24}}>Student Details - {department}</h2>
      {error && <div style={{color: 'red', marginBottom: 8}}>{error}</div>}
      {/* Search Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>
      {/* Student Table */}
      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 900}}>
          <thead>
            <tr style={{background: '#2563eb', color: 'white', fontWeight: 700, fontSize: 18}}>
              <th style={{padding: '12px 16px', width: 120, textAlign: 'left', whiteSpace: 'nowrap'}}>Student ID</th>
              <th style={{padding: '12px 16px', width: 220, textAlign: 'left', whiteSpace: 'nowrap'}}>Name</th>
              <th style={{padding: '12px 16px', width: 160, textAlign: 'left', whiteSpace: 'nowrap'}}>Department</th>
              <th style={{padding: '12px 16px', width: 120, textAlign: 'left', whiteSpace: 'nowrap'}}>Mode</th>
              <th style={{padding: '12px 16px', width: 160, textAlign: 'center', whiteSpace: 'nowrap'}}>Capture Status</th>
              <th style={{padding: '12px 16px', width: 160, textAlign: 'center', whiteSpace: 'nowrap'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{padding: 24, textAlign: 'center'}}>Loading...</td></tr>
            ) : filteredStudents.length === 0 ? (
              <tr><td colSpan={5} style={{padding: 24, textAlign: 'center'}}>No students found.</td></tr>
            ) : (
              filteredStudents.map((s, i) => (
                <tr key={s.username || i} style={{background: i % 2 === 0 ? '#f1f5fb' : 'white'}}>
                  <td style={{padding: '10px 16px', fontFamily: 'monospace', fontWeight: 500, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{s.username || ''}</td>
                  <td style={{padding: '10px 16px', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{s.name || s.Name || ''}</td>
                  <td style={{padding: '10px 16px', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{s.department || department}</td>
                  <td style={{padding: '10px 16px', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{s.mode || ''}</td>
                  <td style={{padding: '10px 16px', textAlign: 'center'}}>
                    {Array.isArray(s.faceDescriptor) ? (
                      <span style={{background: '#bbf7d0', color: '#15803d', padding: '4px 16px', borderRadius: 8, fontSize: 15, fontWeight: 500, display: 'inline-block'}}>✔ Captured</span>
                    ) : (
                      <span style={{background: '#fecaca', color: '#b91c1c', padding: '4px 16px', borderRadius: 8, fontSize: 15, fontWeight: 500, display: 'inline-block'}}>✖ Not Captured</span>
                    )}
                  </td>
                  <td style={{padding: '10px 16px', textAlign: 'center'}}>
                    <button onClick={() => openCamera(s.username || "", s.department || department)} style={{marginRight: 8, background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, padding: '6px 18px', cursor: 'pointer', fontWeight: 500, fontSize: 15}}>Capture</button>
                    <button onClick={() => handleEditOpen(s)} style={{background: '#fde68a', color: '#92400e', border: 'none', borderRadius: 4, padding: '6px 18px', cursor: 'pointer', fontWeight: 500, fontSize: 15}}>Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {editModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 24px #0003', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 340 }}>
            <h3 style={{ fontWeight: 700, color: '#1848c1', marginBottom: 12 }}>Edit Student</h3>
            <form style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8, width: '100%' }} onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
              <label style={{ fontWeight: 500 }}>Student ID</label>
              <input value={editData.username || ''} onChange={e => setEditData(prev => ({ ...prev, username: e.target.value }))} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
              <label style={{ fontWeight: 500 }}>Name</label>
              <input value={editData.name || editData.Name || ''} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
              <label style={{ fontWeight: 500 }}>Department</label>
              <select value={editData.department || departments[0]} onChange={e => setEditData(prev => ({ ...prev, department: e.target.value }))} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
              <label style={{ fontWeight: 500 }}>Role</label>
              <input value={editData.role || ''} onChange={e => setEditData(prev => ({ ...prev, role: e.target.value }))} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
              <label style={{ fontWeight: 500 }}>Mode</label>
              <select value={editData.mode || 'Hosteller'} onChange={e => setEditData(prev => ({ ...prev, mode: e.target.value }))} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
                <option value="Hosteller">Hosteller</option>
                <option value="DayScholar">DayScholar</option>
              </select>
              <label style={{ fontWeight: 500 }}>DOB</label>
              <input type="date" value={editData.password || ''} onChange={e => setEditData(prev => ({ ...prev, password: e.target.value }))} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
              <button type="button" onClick={() => openCamera(editData.username || "", editData.department || departments[0])}
                style={{ background: '#e0e7ff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 6, padding: '10px 0', fontWeight: 500, cursor: 'pointer', marginTop: 8 }}>
                📷 Capture/Edit Face
              </button>
              <div style={{ display: 'flex', gap: 12, marginTop: 16, width: '100%' }}>
                <button type="button" onClick={() => setEditModal({ open: false })} style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 500, fontSize: 15, flex: 1 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 500, fontSize: 15, flex: 1, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {cameraOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 24px #0003', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700, color: '#1848c1', marginBottom: 12 }}>Camera</h3>
            {!modelsLoaded && <div style={{ color: 'blue', margin: 8 }}>Loading face recognition models...</div>}
            {cameraError ? (
              <div style={{ color: 'red', margin: 16 }}>{cameraError}</div>
            ) : (
              <video ref={videoRef} width={320} height={240} autoPlay style={{ borderRadius: 8, background: '#000' }} />
            )}
            <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }} />
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button onClick={() => { console.log('Capture button clicked'); captureFace(); }} disabled={!modelsLoaded} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 500, fontSize: 15, opacity: !modelsLoaded ? 0.6 : 1, cursor: !modelsLoaded ? 'not-allowed' : 'pointer' }}>Capture</button>
              <button onClick={closeCamera} style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 500, fontSize: 15 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetails;
