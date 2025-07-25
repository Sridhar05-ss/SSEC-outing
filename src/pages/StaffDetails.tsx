import React, { useEffect, useState, useRef } from "react";
import { db } from "../lib/firebase";
import { ref, get, update, set } from "firebase/database";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "../components/ui/dialog";
import * as faceapi from 'face-api.js';

type Staff = {
  username?: string;
  id?: string;
  name: string;
  department: string;
  role: string;
  captureStatus?: string;
  face?: string;
};

const departments = [
  "CSE", "ECE", "MECH", "CIVIL", "IT", "AIML", "CYBER SECURITY", "AIDS", "EEE", "DCSE", "DECE", "DMECH"
];

const StaffDetails: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModal, setEditModal] = useState<{ open: boolean; staff?: Staff }>({ open: false });
  const [captureModal, setCaptureModal] = useState<{ open: boolean; staff?: Staff }>({ open: false });
  const [editData, setEditData] = useState<Partial<Staff>>({});
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStaff = () => {
    setLoading(true);
    setError("");
    get(ref(db, "staff"))
      .then(snapshot => {
        const data = snapshot.val();
        setStaff(data ? Object.values(data) : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Load face-api.js models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setModelsLoaded(true);
      } catch (err) {
        setCameraError("Failed to load face recognition models.");
      }
    };
    loadModels();
  }, []);

  // Camera logic for capture modal
  useEffect(() => {
    if (captureModal.open && videoRef.current) {
      setCameraError("");
      navigator.mediaDevices?.getUserMedia({ video: true })
        .then(s => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch(() => setCameraError("Camera not available or permission denied."));
    } else if (!captureModal.open && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    // Cleanup on unmount
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line
  }, [captureModal.open]);

  // Camera modal logic
  const openCamera = (staffId: string) => {
    setCurrentStaffId(staffId);
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
    setCurrentStaffId(null);
    if (stream) stream.getTracks().forEach(track => track.stop());
  };
  const captureFace = async () => {
    if (!modelsLoaded) {
      setCameraError("Face recognition models not loaded yet.");
      return;
    }
    if (videoRef.current && canvasRef.current && currentStaffId) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        // Extract 128D descriptor
        const img = await faceapi.fetchImage(dataUrl);
        const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        if (!detection) {
          setCameraError("No face detected. Please try again with your face clearly visible and well-lit.");
          return;
        }
        const descriptor = Array.from(detection.descriptor);
        await set(ref(db, `staff/${currentStaffId}/faceDescriptor`), descriptor);
        alert('Face captured and saved!');
        closeCamera();
        fetchStaff();
      }
    }
  };

  const handleCaptureSave = async () => {
    if (!captureModal.staff?.username && !captureModal.staff?.id) return;
    setSaving(true);
    try {
      await update(ref(db, `staff/${captureModal.staff?.username || captureModal.staff?.id}`), { captureStatus: "Captured" });
      alert("Capture status updated!");
      setCaptureModal({ open: false });
      fetchStaff();
    } catch (err) {
      alert("Failed to update capture status.");
    }
    setSaving(false);
  };

  const handleEditOpen = (s: Staff) => {
    setEditData({ ...s });
    setEditModal({ open: true, staff: s });
  };

  const handleEditSave = async () => {
    if (!editData.username && !editData.id) return;
    setSaving(true);
    try {
      await update(ref(db, `staff/${editData.username || editData.id}`), {
        username: editData.username,
        name: editData.name,
        department: editData.department,
        role: editData.role
      });
      alert("Staff updated!");
      setEditModal({ open: false });
      setEditData({});
      fetchStaff();
    } catch (err) {
      alert("Failed to update staff.");
    }
    setSaving(false);
  };

  // Filter staff based on search query
  const filteredStaff = staff.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      (s.username && s.username.toLowerCase().includes(query)) ||
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.department && s.department.toLowerCase().includes(query)) ||
      (s.role && s.role.toLowerCase().includes(query))
    );
  });

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', background: 'white', borderRadius: 18, boxShadow: '0 8px 32px #0001', padding: 32 }}>
      <h2 style={{fontWeight: 700, color: '#1848c1', marginBottom: 24, fontSize: 28}}>Staff Details</h2>
      {error && <div style={{color: 'red', marginBottom: 8}}>{error}</div>}
      {/* Search Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search staff..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>
      {/* Staff Table */}
      <div style={{overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 900}}>
      <thead>
            <tr style={{background: '#2563eb', color: 'white', fontWeight: 700, fontSize: 18}}>
              <th style={{padding: '12px 16px', width: 120, textAlign: 'left', whiteSpace: 'nowrap'}}>Staff ID</th>
              <th style={{padding: '12px 16px', width: 220, textAlign: 'left', whiteSpace: 'nowrap'}}>Name</th>
              <th style={{padding: '12px 16px', width: 160, textAlign: 'left', whiteSpace: 'nowrap'}}>Department</th>
              <th style={{padding: '12px 16px', width: 160, textAlign: 'left', whiteSpace: 'nowrap'}}>Role</th>
              <th style={{padding: '12px 16px', width: 160, textAlign: 'center', whiteSpace: 'nowrap'}}>Capture Status</th>
              <th style={{padding: '12px 16px', width: 160, textAlign: 'center', whiteSpace: 'nowrap'}}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
              <tr><td colSpan={6} style={{padding: 24, textAlign: 'center'}}>Loading...</td></tr>
        ) : filteredStaff.length === 0 ? (
              <tr><td colSpan={6} style={{padding: 24, textAlign: 'center'}}>No staff found.</td></tr>
            ) : (
              filteredStaff.map((s, i) => (
                <tr key={s.username || s.id} style={{background: i % 2 === 0 ? '#f1f5fb' : 'white'}}>
                  <td style={{padding: '10px 16px', fontFamily: 'monospace', fontWeight: 500, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{s.username || s.id || ''}</td>
                  <td style={{padding: '10px 16px', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{s.name}</td>
                  <td style={{padding: '10px 16px', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{s.department}</td>
                  <td style={{padding: '10px 16px', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{s.role}</td>
                  <td style={{padding: '10px 16px', textAlign: 'center'}}>
                    {Array.isArray((s as any).faceDescriptor) ? (
                      <span style={{background: '#bbf7d0', color: '#15803d', padding: '4px 16px', borderRadius: 8, fontSize: 15, fontWeight: 500, display: 'inline-block'}}>✔ Captured</span>
                    ) : (
                      <span style={{background: '#fecaca', color: '#b91c1c', padding: '4px 16px', borderRadius: 8, fontSize: 15, fontWeight: 500, display: 'inline-block'}}>✖ Not Captured</span>
                )}
              </td>
                  <td style={{padding: '10px 16px', textAlign: 'center'}}>
                    <button onClick={() => openCamera(s.username || s.id || "")} style={{marginRight: 8, background: '#3b82f6', color: 'white', border: 'none', borderRadius: 4, padding: '6px 18px', cursor: 'pointer', fontWeight: 500, fontSize: 15}}>Capture</button>
                    <Dialog open={editModal.open && editModal.staff?.username === s.username} onOpenChange={open => setEditModal(open ? { open: true, staff: s } : { open: false })}>
                      <DialogTrigger asChild>
                        <button style={{background: '#fde68a', color: '#92400e', border: 'none', borderRadius: 4, padding: '6px 18px', cursor: 'pointer', fontWeight: 500, fontSize: 15}} onClick={() => handleEditOpen(s)}>Edit</button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Staff</DialogTitle>
                        </DialogHeader>
                        <form style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }} onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
                          <label style={{ fontWeight: 500 }}>Staff ID</label>
                          <input value={editData.username || ''} onChange={e => setEditData(prev => ({ ...prev, username: e.target.value }))} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
                          <label style={{ fontWeight: 500 }}>Name</label>
                          <input value={editData.name || ''} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
                          <label style={{ fontWeight: 500 }}>Department</label>
                          <select value={editData.department || departments[0]} onChange={e => setEditData(prev => ({ ...prev, department: e.target.value }))} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
                            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                          </select>
                          <label style={{ fontWeight: 500 }}>Role</label>
                          <input value={editData.role || ''} onChange={e => setEditData(prev => ({ ...prev, role: e.target.value }))} style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }} />
                          <button type="button" onClick={() => openCamera(editData.username || editData.id || "")}
                            style={{ background: '#e0e7ff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 6, padding: '10px 0', fontWeight: 500, cursor: 'pointer', marginTop: 8 }}>
                            📷 Capture/Edit Face
                          </button>
                          <DialogFooter>
                            <DialogClose asChild>
                              <button type="button" style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 500, fontSize: 15, marginRight: 8 }}>Cancel</button>
                            </DialogClose>
                            <button type="submit" disabled={saving} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 500, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>Save</button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
      </div>
      {cameraOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 24px #0003', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700, color: '#1848c1', marginBottom: 12 }}>Camera</h3>
            <div style={{ color: '#2563eb', marginBottom: 8, fontWeight: 500, fontSize: 15 }}>
              For best results, ensure your face is well-lit and clearly visible.
            </div>
            {!modelsLoaded && <div style={{ color: 'blue', margin: 8 }}>Loading face recognition models...</div>}
            {cameraError ? (
              <div style={{ color: 'red', margin: 16 }}>{cameraError}</div>
            ) : (
              <video ref={videoRef} width={320} height={240} autoPlay style={{ borderRadius: 8, background: '#000' }} />
            )}
            <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }} />
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button onClick={captureFace} disabled={!modelsLoaded} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 500, fontSize: 15, opacity: !modelsLoaded ? 0.6 : 1, cursor: !modelsLoaded ? 'not-allowed' : 'pointer' }}>Capture</button>
              <button onClick={closeCamera} style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 500, fontSize: 15 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDetails;