import React, { useState } from "react";
import { User, Users, List, BookOpen, LogOut, UserCircle, Search, BadgeCheck, BadgeX, Camera } from "lucide-react";

const departments = [
  "CSE", "ECE", "MECH", "CIVIL", "IT", "AIML", "CYBER SECURITY", "AIDS", "EEE", "DCSE", "DECE", "DMECH"
];

const menuItems = [
  { key: "staff-mgmt", label: "Staff Management", icon: <User className="w-5 h-5 mr-2" /> },
  { key: "student-mgmt", label: "Student Management", icon: <Users className="w-5 h-5 mr-2" /> },
  { key: "staff-details", label: "Staff Details", icon: <List className="w-5 h-5 mr-2" /> },
  { key: "student-details", label: "Student Details", icon: <BookOpen className="w-5 h-5 mr-2" /> },
];

function Sidebar({ active, setActive, studentDeptOpen, setStudentDeptOpen, selectedDept, setSelectedDept }) {
  return (
    <aside className="min-h-screen w-64 bg-gradient-to-b from-blue-700 to-blue-400 text-white flex flex-col py-8 px-4 shadow-2xl">
      <img src="/college_logo.png" alt="College Logo" className="h-16 w-auto object-contain mx-auto mt-4 mb-4" />
      <h2 className="text-2xl font-bold mb-8 text-center tracking-wide">Admin Panel</h2>
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <div key={item.key}>
            <button
              className={`w-full flex items-center text-left py-2 px-3 rounded-lg transition font-semibold relative ${active === item.key ? "bg-blue-300/30 text-white shadow-lg ring-2 ring-blue-200 animate-pulse-slow" : "hover:bg-blue-500/20"}`}
              onClick={() => {
                setActive(item.key);
                if (item.key === "student-details") setStudentDeptOpen((v) => !v);
                else setStudentDeptOpen(false);
              }}
            >
              {item.icon}
              {item.label}
              {active === item.key && <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-200 rounded-full animate-ping" />}
            </button>
            {/* Department submenu for Student Details */}
            {item.key === "student-details" && active === "student-details" && studentDeptOpen && (
              <div className="ml-6 mt-1 flex flex-col gap-1">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    className={`text-left px-3 py-1 rounded text-sm font-medium transition ${selectedDept === dept ? "bg-white text-blue-700 font-bold shadow" : "hover:bg-blue-100 text-white/80"}`}
                    onClick={() => setSelectedDept(dept)}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="mt-8 flex flex-col items-center gap-2">
        <UserCircle className="w-10 h-10 text-white/80" />
        <span className="text-sm font-semibold">Welcome, Admin</span>
        <button className="flex items-center gap-1 text-xs text-white/80 hover:text-white mt-2"><LogOut className="w-4 h-4" />Logout</button>
      </div>
    </aside>
  );
}

function FloatingInput({ icon, label, ...props }) {
  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400">{icon}</span>
      <input
        className="pl-8 pr-2 py-1 rounded-md shadow-sm border border-gray-300 text-sm focus:ring-blue-500 w-full bg-white/80 placeholder-transparent peer"
        placeholder={label}
        {...props}
      />
      <label className="absolute left-8 top-1/2 -translate-y-1/2 text-blue-500 text-xs pointer-events-none transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:text-blue-700 bg-white/80 px-1">{label}</label>
    </div>
  );
}

function StaffForm() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [dept, setDept] = useState(departments[0]);
  const [role, setRole] = useState("");
  const [removeId, setRemoveId] = useState("");
  const handleAdd = () => alert("Staff added!");
  const handleCapture = () => alert("Capture staff face!");
  const handleEdit = () => alert("Edit staff face!");
  const handleRemove = () => alert("Staff removed!");
  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl p-8 mb-8 max-w-3xl w-full md:w-3/4 lg:w-2/3 mx-auto">
      <h3 className="text-xl font-bold text-blue-700 mb-4">Add Staff</h3>
      <form className="flex flex-col gap-4 mb-6">
        <FloatingInput icon={<User className="w-4 h-4" />} label="Staff Name" value={name} onChange={e => setName(e.target.value)} />
        <FloatingInput icon={<BadgeCheck className="w-4 h-4" />} label="Staff ID" value={id} onChange={e => setId(e.target.value)} />
        <div className="relative">
          <select className="rounded-md shadow-sm border border-gray-300 px-8 py-2 text-sm focus:ring-blue-500 w-full bg-white/80 appearance-none" value={dept} onChange={e => setDept(e.target.value)}>
            {departments.map(d => <option key={d}>{d}</option>)}
          </select>
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none"><BookOpen className="w-4 h-4" /></span>
        </div>
        <FloatingInput icon={<Users className="w-4 h-4" />} label="Role" value={role} onChange={e => setRole(e.target.value)} />
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" onClick={handleCapture} className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded shadow px-4 py-2 font-semibold border border-blue-600 flex items-center gap-1 transition-all duration-150 active:scale-95"><Camera className="w-4 h-4" />Capture Face</button>
          <button type="button" onClick={handleEdit} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded shadow px-4 py-2 font-semibold border border-yellow-600 flex items-center gap-1 transition-all duration-150 active:scale-95"><Camera className="w-4 h-4" />Edit Face</button>
          <button type="button" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white rounded shadow px-4 py-2 font-semibold transition-all duration-150 active:scale-95">Add Staff</button>
        </div>
      </form>
      <div className="mt-8 max-w-md w-full mx-auto">
        <h4 className="text-lg font-bold text-blue-700 mb-2">Remove Staff</h4>
        <FloatingInput icon={<BadgeX className="w-4 h-4" />} label="Staff ID" value={removeId} onChange={e => setRemoveId(e.target.value)} />
        <button onClick={handleRemove} className="bg-blue-600 hover:bg-blue-700 text-white rounded shadow px-4 py-2 font-semibold w-full mt-2 transition-all duration-150 active:scale-95">Remove Staff</button>
      </div>
    </div>
  );
}

function StudentForm() {
  const [name, setName] = useState("");
  const [register, setRegister] = useState("");
  const [id, setId] = useState("");
  const [dept, setDept] = useState(departments[0]);
  const [year, setYear] = useState("I");
  const [parentPhone, setParentPhone] = useState("");
  const [dob, setDob] = useState("");
  const [hostel, setHostel] = useState("Day Scholar");
  const [removeId, setRemoveId] = useState("");
  const handleAdd = () => alert("Student added!");
  const handleCapture = () => alert("Capture student face!");
  const handleEdit = () => alert("Edit student face!");
  const handleRemove = () => alert("Student removed!");
  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl p-8 mb-8 max-w-2xl w-full md:w-3/4 lg:w-2/3 mx-auto">
      <h3 className="text-xl font-bold text-blue-700 mb-4">Add Student</h3>
      <form className="flex flex-col gap-4 mb-6">
        <FloatingInput icon={<User className="w-4 h-4" />} label="Student Name" value={name} onChange={e => setName(e.target.value)} />
        <FloatingInput icon={<BadgeCheck className="w-4 h-4" />} label="Register Number" value={register} onChange={e => setRegister(e.target.value)} />
        <FloatingInput icon={<BadgeCheck className="w-4 h-4" />} label="Student ID" value={id} onChange={e => setId(e.target.value)} />
        <FloatingInput icon={<User className="w-4 h-4" />} label="Parent's Phone Number" value={parentPhone} onChange={e => setParentPhone(e.target.value)} type="number" />
        <div className="relative">
          <select className="rounded-md shadow-sm border border-gray-300 px-8 py-2 text-sm focus:ring-blue-500 w-full bg-white/80 appearance-none" value={dept} onChange={e => setDept(e.target.value)}>
            {departments.map(d => <option key={d}>{d}</option>)}
          </select>
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none"><BookOpen className="w-4 h-4" /></span>
        </div>
        <div className="relative">
          <select className="rounded-md shadow-sm border border-gray-300 px-8 py-2 text-sm focus:ring-blue-500 w-full bg-white/80 appearance-none" value={year} onChange={e => setYear(e.target.value)}>
            <option>I</option>
            <option>II</option>
            <option>III</option>
            <option>IV</option>
          </select>
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none"><BookOpen className="w-4 h-4" /></span>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-blue-700 text-sm font-medium mb-1">Date of Birth</label>
            <input type="date" className="rounded-md shadow-sm border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 w-full bg-white/80" value={dob} onChange={e => setDob(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-blue-700 text-sm font-medium mb-1">Hosteller / DayScholar</label>
            <select className="rounded-md shadow-sm border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 w-full bg-white/80" value={hostel} onChange={e => setHostel(e.target.value)}>
              <option>Hosteller</option>
              <option>DayScholar</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" onClick={handleCapture} className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded shadow px-4 py-2 font-semibold border border-blue-600 flex items-center gap-1 transition-all duration-150 active:scale-95"><Camera className="w-4 h-4" />Capture Face</button>
          <button type="button" onClick={handleEdit} className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded shadow px-4 py-2 font-semibold border border-yellow-600 flex items-center gap-1 transition-all duration-150 active:scale-95"><Camera className="w-4 h-4" />Edit Face</button>
          <button type="button" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white rounded shadow px-4 py-2 font-semibold transition-all duration-150 active:scale-95">Add Student</button>
        </div>
      </form>
      <div className="mt-8 max-w-md w-full mx-auto">
        <h4 className="text-lg font-bold text-blue-700 mb-2">Remove Student</h4>
        <FloatingInput icon={<BadgeX className="w-4 h-4" />} label="Student ID" value={removeId} onChange={e => setRemoveId(e.target.value)} />
        <button onClick={handleRemove} className="bg-blue-600 hover:bg-blue-700 text-white rounded shadow px-4 py-2 font-semibold w-full mt-2 transition-all duration-150 active:scale-95">Remove Student</button>
      </div>
    </div>
  );
}

function StaffTable() {
  const [search, setSearch] = useState("");
  // Demo data
  const staff = [
    { id: "S001", name: "Dr. Rajesh Kumar", dept: "CSE", role: "Professor", status: "Captured" },
    { id: "S002", name: "Anita Singh", dept: "ECE", role: "Lecturer", status: "Not Captured" },
  ];
  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.dept.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full flex justify-center">
      <div className="w-full max-w-6xl" style={{ width: '80%' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-blue-700">Staff Details</h3>
        <div className="relative">
          <input
            className="rounded-md border border-gray-300 px-8 py-1 text-sm focus:ring-blue-500 w-48 bg-white/80"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left rounded">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="py-2 px-3">Staff ID</th>
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Department</th>
              <th className="py-2 px-3">Role</th>
              <th className="py-2 px-3">Capture Status</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-4 text-center text-blue-700">No staff found.</td></tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? "bg-blue-50 transition-all hover:bg-blue-100" : "bg-white transition-all hover:bg-blue-50"}>
                  <td className="py-2 px-3 font-mono">{s.id}</td>
                  <td className="py-2 px-3">{s.name}</td>
                  <td className="py-2 px-3">{s.dept}</td>
                  <td className="py-2 px-3">{s.role}</td>
                  <td className="py-2 px-3">
                    {s.status === "Captured" ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs"><BadgeCheck className="w-3 h-3" />Captured</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs"><BadgeX className="w-3 h-3" />Not Captured</span>
                    )}
                  </td>
                  <td className="py-2 px-3 flex gap-2">
                      <button className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded shadow px-3 py-1 text-sm border border-blue-600 transition-all duration-150 active:scale-95">Capture</button>
                      <button className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded shadow px-3 py-1 text-sm border border-yellow-600 transition-all duration-150 active:scale-95">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function StudentDetailsTable({ department }) {
  const [search, setSearch] = useState("");
  // Demo data for students
  const students = [
    { id: "STU001", name: "Priya Sharma", dept: "CSE", year: "IV", status: "Captured" },
    { id: "STU002", name: "Rahul Patel", dept: "CSE", year: "III", status: "Not Captured" },
    { id: "STU003", name: "Aisha Khan", dept: "ECE", year: "II", status: "Captured" },
    { id: "STU004", name: "Vikash Singh", dept: "MECH", year: "I", status: "Not Captured" },
  ];
  const filtered = students.filter(s => s.dept === department && (
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.year.toLowerCase().includes(search.toLowerCase())
  ));
  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full">
      <div className="w-[95%] mx-auto">
        <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-blue-700">Student Details - {department}</h3>
        <div className="relative">
          <input
              className="rounded-md border border-gray-300 px-8 py-2 text-base focus:ring-blue-500 w-48 bg-white/80"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
        </div>
      </div>
        <div>
          <table className="w-full table-fixed text-left rounded text-base">
          <thead>
              <tr className="bg-blue-600 text-white text-center">
                <th className="py-3 px-6">Student ID</th>
                <th className="py-3 px-6">Name</th>
                <th className="py-3 px-6">Department</th>
                <th className="py-3 px-6">Year</th>
                <th className="py-3 px-6">Capture Status</th>
                <th className="py-3 px-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-blue-700">No students found for {department}.</td></tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? "bg-blue-50 transition-all hover:bg-blue-100" : "bg-white transition-all hover:bg-blue-50"}>
                    <td className="py-3 px-6 font-mono text-center break-words truncate max-w-[8rem]">{s.id}</td>
                    <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{s.name}</td>
                    <td className="py-3 px-6 text-center break-words truncate max-w-[10rem]">{s.dept}</td>
                    <td className="py-3 px-6 text-center break-words truncate max-w-[6rem]">{s.year}</td>
                    <td className="py-3 px-6 text-center break-words truncate max-w-[10rem]">
                    {s.status === "Captured" ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs"><BadgeCheck className="w-3 h-3" />Captured</span>
                    ) : (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs"><BadgeX className="w-3 h-3" />Not Captured</span>
                    )}
                  </td>
                    <td className="py-3 px-6 flex gap-2 justify-center">
                      <button className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded shadow px-3 py-1 text-sm border border-blue-600 transition-all duration-150 active:scale-95">Capture</button>
                      <button className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded shadow px-3 py-1 text-sm border border-yellow-600 transition-all duration-150 active:scale-95">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function StudentDetailsContent({ selectedDept }) {
  return (
    <div>
      {selectedDept ? (
        <StudentDetailsTable department={selectedDept} />
      ) : (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl p-8">
          <h3 className="text-xl font-bold text-blue-700 mb-4">Student Details</h3>
          <div className="text-blue-700">Select a department from the sidebar to filter students.</div>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [active, setActive] = useState("staff-mgmt");
  const [studentDeptOpen, setStudentDeptOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  return (
    <div className="flex min-h-screen bg-blue-50">
      <Sidebar active={active} setActive={setActive} studentDeptOpen={studentDeptOpen} setStudentDeptOpen={setStudentDeptOpen} selectedDept={selectedDept} setSelectedDept={setSelectedDept} />
      <div className="flex-1 flex flex-col">
        {/* Header Section */}
        <header className="flex items-center justify-between bg-white shadow p-4 mb-8">
          <h1 className="text-3xl font-bold text-blue-700 mx-auto">Admin Panel</h1>
          <div className="hidden md:block w-16" />
        </header>
        <main className="flex-1 p-8 bg-blue-50 overflow-y-auto flex flex-col gap-8 items-center">
          {active === "staff-mgmt" && <StaffForm />}
          {active === "student-mgmt" && <StudentForm />}
          {active === "staff-details" && <StaffTable />}
          {active === "student-details" && <StudentDetailsContent selectedDept={selectedDept} />}
        </main>
      </div>
    </div>
  );
} 