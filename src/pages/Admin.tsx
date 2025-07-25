import React, { useState } from "react";
import StaffDetails from "./StaffDetails";
import StudentDetails from "./StudentDetails";
import StaffManagement from "./StaffManagement";
import StudentManagement from "./StudentManagement";

const departments = [
  "CSE", "ECE", "MECH", "CIVIL", "IT", "AIML", "CYBER SECURITY", "AIDS", "EEE", "DCSE", "DECE", "DMECH"
];

type ViewType = 'staff-mgmt' | 'student-mgmt' | 'staff-details' | 'student-details';

const Admin: React.FC = () => {
  const [view, setView] = useState<ViewType>('staff-mgmt');
  const [selectedDept, setSelectedDept] = useState<string>('CSE');
  const [studentDetailsOpen, setStudentDetailsOpen] = useState<boolean>(false);

  const handleStudentDetailsClick = () => {
    if (view === 'student-details') {
      setStudentDetailsOpen(open => !open);
    } else {
      setView('student-details');
      setStudentDetailsOpen(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f6fb' }}>
      {/* Sidebar */}
      <div style={{ width: 260, background: 'linear-gradient(180deg, #2563eb 0%, #60a5fa 100%)', color: 'white', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minHeight: '100vh' }}>
        <img src="/college_logo.png" alt="College Logo" style={{ width: 180, marginBottom: 16 }} />
        <h2 style={{ fontWeight: 700, marginBottom: 32, textAlign: 'center' }}>Admin Panel</h2>
        <div style={{ width: '100%', marginBottom: 16 }}>
          <div
            style={{ padding: '8px 0', cursor: 'pointer', background: view === 'staff-mgmt' ? '#1e40af' : 'transparent', borderRadius: 6, marginBottom: 4, textAlign: 'left', paddingLeft: 16 }}
            onClick={() => setView('staff-mgmt')}
          >
            Staff Management
          </div>
          <div
            style={{ padding: '8px 0', cursor: 'pointer', background: view === 'student-mgmt' ? '#1e40af' : 'transparent', borderRadius: 6, marginBottom: 4, textAlign: 'left', paddingLeft: 16 }}
            onClick={() => setView('student-mgmt')}
          >
            Student Management
          </div>
          <div
            style={{ padding: '8px 0', cursor: 'pointer', background: view === 'staff-details' ? '#1e40af' : 'transparent', borderRadius: 6, marginBottom: 4, textAlign: 'left', paddingLeft: 16 }}
            onClick={() => setView('staff-details')}
          >
            Staff Details
          </div>
          <div
            style={{ padding: '8px 0', cursor: 'pointer', background: view === 'student-details' ? '#1e40af' : 'transparent', borderRadius: 6, textAlign: 'left', paddingLeft: 16 }}
            onClick={handleStudentDetailsClick}
          >
            Student Details
          </div>
        </div>
        {/* Only show department list for Student Details if open */}
        {view === 'student-details' && studentDetailsOpen && (
          <div style={{ width: '100%', marginTop: 8 }}>
            {departments.map(dept => (
              <div
                key={dept}
                style={{
                  padding: '6px 12px',
                  marginBottom: 4,
                  background: selectedDept === dept ? '#f1f5fb' : 'transparent',
                  color: selectedDept === dept ? '#2563eb' : 'white',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: selectedDept === dept ? 700 : 400
                }}
                onClick={() => setSelectedDept(dept)}
              >
                {dept}
        </div>
            ))}
      </div>
        )}
        <div style={{ flex: 1 }} />
      </div>
      {/* Main Content */}
      <div style={{ flex: 1, padding: 40 }}>
        {/* Header with profile and logout */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <h1 style={{ fontWeight: 700, fontSize: 32, color: '#1848c1', textAlign: 'center', margin: 0 }}>Admin Panel</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 28 }}>👤</div>
              <span style={{ fontSize: 16, color: '#2563eb', fontWeight: 600 }}>Welcome, Admin</span>
    </div>
            <button
              style={{
                background: 'white',
                color: '#2563eb',
                border: 'none',
                borderRadius: 8,
                padding: '10px 24px',
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 2px 8px #0001',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.color = '#2563eb'; }}
              onClick={handleLogout}
            >
              Logout
            </button>
      </div>
        </div>
        {view === 'staff-mgmt' && <StaffManagement />}
        {view === 'student-mgmt' && <StudentManagement />}
        {view === 'staff-details' && <StaffDetails />}
        {view === 'student-details' && <StudentDetails department={selectedDept} />}
      </div>
    </div>
  );
};

export default Admin; 