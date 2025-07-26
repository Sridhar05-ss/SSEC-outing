import React, { useState, useRef } from "react";
import { db } from "../lib/firebase";
import { ref, set, remove } from "firebase/database";

const departments = [
  "CSE", "ECE", "MECH", "CIVIL", "IT", "AIML", "CYBER SECURITY", "AIDS", "EEE", "DCSE", "DECE", "DMECH"
];

const StudentManagement: React.FC = () => {
  const [name, setName] = useState("");
  const [register, setRegister] = useState("");
  const [studentId, setStudentId] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [department, setDepartment] = useState(departments[0]);
  const [dob, setDob] = useState("");
  const [hostel, setHostel] = useState("Hosteller");
  const [removeId, setRemoveId] = useState("");
  const [loading, setLoading] = useState(false);

  // Camera modal state
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");

  const openCamera = (studentId: string) => {
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
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const captureFace = async () => {
    if (videoRef.current && canvasRef.current && studentId && department) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        // Save to Firebase
        await set(ref(db, `students/${department}/${studentId}/face`), dataUrl);
        alert('Face captured and saved!');
        closeCamera();
      }
    }
  };

  const handleAddStudent = async () => {
    if (!studentId || !name || !register || !parentPhone || !department) {
      alert("Please fill all fields.");
      return;
    }
    setLoading(true);
    try {
      await set(ref(db, `students/${department}/${studentId}`), {
        username: studentId,
        Name: name,
        department,
        registernumber: register,
        parentphone: parentPhone,
        mode: hostel,
        password: dob, // Save DOB as password
        role: "student",
        captureStatus: "Not Captured"
      });
      alert("Student added successfully!");
      setName(""); setRegister(""); setStudentId(""); setParentPhone(""); setDepartment(departments[0]); setDob(""); setHostel("Hosteller");
    } catch (err) {
      alert("Failed to add student.");
    }
    setLoading(false);
  };

  const handleRemoveStudent = async () => {
    if (!removeId || !department) {
      alert("Enter Student ID and Department to remove.");
      return;
    }
    setLoading(true);
    try {
      await remove(ref(db, `students/${department}/${removeId}`));
      alert("Student removed successfully!");
      setRemoveId("");
    } catch (err) {
      alert("Failed to remove student.");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div style={{ background: 'white', borderRadius: 24, boxShadow: '0 8px 32px #0001', padding: 40, width: 500, maxWidth: '95%' }}>
        <h2 style={{ color: '#1848c1', fontWeight: 700, fontSize: 22, marginBottom: 24 }}>Add Student</h2>
        <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={e => { e.preventDefault(); handleAddStudent(); }}>
          <input placeholder="Student Name" value={name} onChange={e => setName(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 16 }} />
          <input placeholder="Register Number" value={register} onChange={e => setRegister(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 16 }} />
          <input placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 16 }} />
          <input placeholder="Parent's Phone Number" value={parentPhone} onChange={e => setParentPhone(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 16 }} />
          <input type="date" placeholder="Date of Birth" value={dob} onChange={e => setDob(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 16 }} />
          <select value={department} onChange={e => setDepartment(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 16 }}>
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={() => openCamera(studentId)} style={{ flex: 1, background: '#e0e7ff', color: '#2563eb', border: '1px solid #2563eb', borderRadius: 6, padding: '10px 0', fontWeight: 500, cursor: 'pointer' }}>📷 Capture Face</button>
            <button type="submit" disabled={loading} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>Add Student</button>
          </div>
        </form>
        <h3 style={{ color: '#1848c1', fontWeight: 700, fontSize: 18, margin: '32px 0 12px' }}>Remove Student</h3>
        <form style={{ display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={e => { e.preventDefault(); handleRemoveStudent(); }}>
          <input placeholder="Student ID" value={removeId} onChange={e => setRemoveId(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 16 }} />
          <button type="submit" disabled={loading} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>Remove Student</button>
        </form>
        {/* Camera Modal */}
        {cameraOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 24px #0003', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, color: '#1848c1', marginBottom: 12 }}>Camera</h3>
              {cameraError ? (
                <div style={{ color: 'red', margin: 16 }}>{cameraError}</div>
              ) : (
                <video ref={videoRef} width={320} height={240} autoPlay style={{ borderRadius: 8, background: '#000' }} />
              )}
              <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }} />
              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                <button onClick={captureFace} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 500, fontSize: 15 }}>Capture</button>
                <button onClick={closeCamera} style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 500, fontSize: 15 }}>Close</button>
              </div>
            </div>
          </div>
        )}
          </div>
    </div>
  );
};

export default StudentManagement;