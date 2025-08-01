import React, { useState, useRef, useEffect } from "react";
import { UserCircle, LogOut, FileText, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { ref, get, query, orderByChild, limitToLast } from "firebase/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fakeAuth } from "../lib/fakeAuth";

const departments = [
  "AIML", "CYBER SECURITY", "AIDS", "IT", "ECE", "CSE", "EEE", "MECH", "CIVIL", "DCSE", "DECE", "DMECH"
];

// Interface for staff logs from Firebase
interface StaffLog {
  id: string;
  name: string;
  department: string;
  in: string | null;
  out: string | null;
  status: "Inside" | "EXIT";
  timestamp: string;
}

// Interface for student logs from Firebase
interface StudentLog {
  id: string;
  name: string;
  department: string;
  in: string | null;
  out: string | null;
  status: "Inside" | "EXIT";
  timestamp: string;
  mode: string;
}

// Interface for hostel logs from Firebase
interface HostelLog {
  id: string;
  name: string;
  department: string;
  in: string | null;
  out: string | null;
  status: "INSIDE" | "OUTSIDE";
  timestamp: string;
  passType: string;
  passApproved: boolean;
  passRequestId: string | null;
}

// Interface for processed logs in AllLogsTable
interface ProcessedLog {
  id: string;
  name: string;
  department: string;
  in: string | null;
  out: string | null;
  status: "Inside" | "EXIT";
}

// Interface for visitor logs
interface VisitorLog {
  name: string;
  mobile: string;
  reason: string;
  timestamp: string;
}

function Sidebar({ active, setActive, studentType, setStudentType }) {
  const navItems = [
    { key: "all", label: "All Logs" },
    { key: "staff", label: "Staff Logs" },
    { key: "dayscholar", label: "Dayscholar Logs" },
    { key: "hostellers", label: "Hostellers Logs" },
    { key: "visitors", label: "Visitors Details" },
  ];
  return (
    <aside className="min-h-screen w-64 bg-gradient-to-b from-blue-700 to-blue-400 text-white flex flex-col py-8 px-4 shadow-2xl print:hidden">
      <img src="/college_logo.png" alt="College Logo" className="h-16 w-auto object-contain mx-auto mt-4 mb-4" />
      <div className="mb-6 text-xl font-bold text-center tracking-wide">Management Panel</div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <div key={item.key}>
            <button
              className={`w-full flex items-center text-left py-2 px-3 rounded-lg transition font-semibold relative ${active === item.key ? "bg-blue-300/30 text-white shadow-lg ring-2 ring-blue-200 animate-pulse-slow" : "hover:bg-blue-500/20"}`}
              onClick={() => setActive(item.key)}
            >
              {item.label}
              {active === item.key && <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-200 rounded-full animate-ping" />}
            </button>
            {/* Outing/Home Visiting toggle for Hostellers Logs */}
            {item.key === "hostellers" && active === "hostellers" && (
              <div className="flex flex-col gap-2 mt-2 ml-4">
                <button
                  className={`px-4 py-2 rounded-lg font-semibold text-left border-2 transition-all duration-150 ${studentType === "outing" ? "bg-white text-blue-700 border-blue-700 shadow-md" : "bg-blue-100 text-blue-700 border-transparent hover:border-blue-400"}`}
                  onClick={() => setStudentType("outing")}
                >Outing Logs</button>
                <button
                  className={`px-4 py-2 rounded-lg font-semibold text-left border-2 transition-all duration-150 ${studentType === "homevisiting" ? "bg-white text-blue-700 border-blue-700 shadow-md" : "bg-blue-100 text-blue-700 border-transparent hover:border-blue-400"}`}
                  onClick={() => setStudentType("homevisiting")}
                >Home Visiting Logs</button>
              </div>
            )}
          </div>
        ))}
      </nav>
      {/* Removed Admin and Logout from sidebar */}
    </aside>
  );
}

function SearchBar({ search, setSearch, date, setDate, onClear, onDownloadPDF, onWeekly }) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
      <div className="relative w-full md:w-1/2">
        <input
          className="rounded-md border border-gray-300 px-8 py-2 text-sm focus:ring-blue-500 w-full bg-white/80 placeholder:text-gray-400"
          placeholder="Search by ID or Name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400">🔍</span>
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto">
        <label className="text-blue-700 font-medium">Date:</label>
        <input
          type="date"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 bg-white/80"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>
      <button
        className="bg-gray-200 hover:bg-gray-300 text-sm px-4 py-1 rounded font-medium transition print:hidden"
        onClick={onClear}
        type="button"
      >Clear Filters</button>
      <button
        className="bg-green-600 hover:bg-green-700 text-white rounded shadow px-4 py-2 font-semibold transition-all duration-150 active:scale-95 print:hidden"
        onClick={onDownloadPDF}
        type="button"
      >Download as PDF</button>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white rounded shadow px-4 py-2 font-semibold transition-all duration-150 active:scale-95 print:hidden"
        onClick={onWeekly}
        type="button"
      >Weekly Records</button>
    </div>
  );
}

function getStatusBadge(inTime, outTime) {
  if (inTime && !outTime) {
    return <span className="bg-green-200 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">IN</span>;
  } else if (inTime && outTime) {
    return <span className="bg-red-200 text-red-800 text-xs font-semibold px-2 py-1 rounded-full">OUT</span>;
  } else {
    return <span className="bg-gray-200 text-gray-800 text-xs font-semibold px-2 py-1 rounded-full">-</span>;
  }
}

function AllLogsTable({ logs }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  // For staff logs, we don't need to group since each record already has in/out times
  const processedLogs = logs;

  return (
    <div className="w-[95%] mx-auto bg-white rounded-2xl shadow-lg p-4 overflow-y-auto max-h-[70vh] print:p-0 print:shadow-none print:bg-white">
      <table className="w-full text-left rounded text-sm table-fixed">
        <thead>
          <tr className="bg-blue-600 text-white text-center">
            <th className="py-3 px-6">ID</th>
            <th className="py-3 px-6">Name</th>
            <th className="py-3 px-6">Department</th>
            <th className="py-3 px-6">IN</th>
            <th className="py-3 px-6">OUT</th>
            <th className="py-3 px-6">Status</th>
          </tr>
        </thead>
        <tbody>
          {processedLogs.length === 0 ? (
            <tr><td colSpan={6} className="py-6 text-center text-blue-700">No logs found.</td></tr>
          ) : (
            processedLogs.map((log, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-blue-50 transition-all hover:bg-blue-100" : "bg-white transition-all hover:bg-blue-50"}>
                <td className="py-3 px-6 text-center break-words truncate max-w-[8rem]">{log.id}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{log.name}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[10rem]">{log.department}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{formatTime(log.in)}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{formatTime(log.out)}</td>
                <td className="py-3 px-6 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    log.status === "EXIT" || log.status === "OUTSIDE" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                  }`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StudentLogsTable({ logs }) {
  return (
    <div className="w-full">
      <table className="w-full text-left text-sm table-fixed bg-white rounded-2xl shadow-lg p-4 overflow-y-auto max-h-[70vh] print:p-0 print:shadow-none print:bg-white">
        <thead>
          <tr className="bg-blue-600 text-white text-center">
            <th className="py-3 px-6">ID</th>
            <th className="py-3 px-6">NAME</th>
            <th className="py-3 px-6">DEPARTMENT</th>
            <th className="py-3 px-6">IN</th>
            <th className="py-3 px-6">OUT</th>
            <th className="py-3 px-6">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan={6} className="py-6 text-center text-blue-700">No students found.</td></tr>
          ) : (
            logs.map((log, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-blue-50 transition-all hover:bg-blue-100" : "bg-white transition-all hover:bg-blue-50"}>
                <td className="py-3 px-6 text-center break-words truncate max-w-[8rem]">{log.id}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{log.name}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[10rem]">{log.dept}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{log.in}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{log.out}</td>
                <td className="py-3 px-6 text-center">{getStatusBadge(log.in, log.out)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function OutingLogsTable({ logs }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  return (
    <div className="w-[95%] mx-auto bg-white rounded-2xl shadow-lg p-4 overflow-y-auto max-h-[70vh] print:p-0 print:shadow-none print:bg-white">
      <table className="w-full text-left rounded text-sm table-fixed">
        <thead>
          <tr className="bg-blue-600 text-white text-center">
            <th className="py-3 px-6">ID</th>
            <th className="py-3 px-6">Name</th>
            <th className="py-3 px-6">Department</th>
            <th className="py-3 px-6">OUT</th>
            <th className="py-3 px-6">IN</th>
            <th className="py-3 px-6">Status</th>
            <th className="py-3 px-6">Pass Type</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan={7} className="py-6 text-center text-blue-700">No outing logs found.</td></tr>
          ) : (
            logs.map((log, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-blue-50 transition-all hover:bg-blue-100" : "bg-white transition-all hover:bg-blue-50"}>
                <td className="py-3 px-6 text-center break-words truncate max-w-[8rem]">{log.id}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{log.name}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[10rem]">{log.department}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{formatTime(log.out)}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{formatTime(log.in)}</td>
                <td className="py-3 px-6 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    log.status === "OUTSIDE" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[10rem]">{log.passType || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function HomeVisitingLogsTable({ logs }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  return (
    <div className="w-[95%] mx-auto bg-white rounded-2xl shadow-lg p-4 overflow-y-auto max-h-[70vh] print:p-0 print:shadow-none print:bg-white">
      <table className="w-full text-left rounded text-sm table-fixed">
        <thead>
          <tr className="bg-blue-600 text-white text-center">
            <th className="py-3 px-6">ID</th>
            <th className="py-3 px-6">Name</th>
            <th className="py-3 px-6">Department</th>
            <th className="py-3 px-6">OUT</th>
            <th className="py-3 px-6">IN</th>
            <th className="py-3 px-6">Status</th>
            <th className="py-3 px-6">Pass Type</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan={7} className="py-6 text-center text-blue-700">No home visiting logs found.</td></tr>
          ) : (
            logs.map((log, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-blue-50 transition-all hover:bg-blue-100" : "bg-white transition-all hover:bg-blue-50"}>
                <td className="py-3 px-6 text-center break-words truncate max-w-[8rem]">{log.id}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{log.name}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[10rem]">{log.department}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{formatTime(log.out)}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{formatTime(log.in)}</td>
                <td className="py-3 px-6 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    log.status === "OUTSIDE" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[10rem]">{log.passType || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StaffLogsTable({ logs }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  return (
    <div className="w-[95%] mx-auto bg-white rounded-2xl shadow-lg p-4 overflow-y-auto max-h-[70vh] print:p-0 print:shadow-none print:bg-white">
      <table className="w-full text-left rounded text-sm table-fixed">
        <thead>
          <tr className="bg-blue-600 text-white text-center">
            <th className="py-3 px-6">ID</th>
            <th className="py-3 px-6">Name</th>
            <th className="py-3 px-6">Department</th>
            <th className="py-3 px-6">IN</th>
            <th className="py-3 px-6">OUT</th>
            <th className="py-3 px-6">Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan={6} className="py-6 text-center text-blue-700">No logs found.</td></tr>
          ) : (
            logs.map((log, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-blue-50 transition-all hover:bg-blue-100" : "bg-white transition-all hover:bg-blue-50"}>
                <td className="py-3 px-6 text-center break-words truncate max-w-[8rem]">{log.id}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{log.name}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[10rem]">{log.department}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{formatTime(log.in)}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{formatTime(log.out)}</td>
                <td className="py-3 px-6 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    log.status === "EXIT" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                  }`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function VisitorsTable({ visitors }) {
  return (
    <div className="w-[95%] mx-auto bg-white rounded-2xl shadow-lg p-4 overflow-y-auto max-h-[70vh] print:p-0 print:shadow-none print:bg-white">
      <table className="w-full text-left rounded text-sm table-fixed">
        <thead>
          <tr className="bg-blue-600 text-white text-center">
            <th className="py-3 px-6">Name</th>
            <th className="py-3 px-6">Mobile Number</th>
            <th className="py-3 px-6">Reason of Visit</th>
            <th className="py-3 px-6">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {visitors.length === 0 ? (
            <tr><td colSpan={4} className="py-6 text-center text-blue-700">No visitors found.</td></tr>
          ) : (
            visitors.map((v, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-blue-50 transition-all hover:bg-blue-100" : "bg-white transition-all hover:bg-blue-50"}>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{v.name}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[10rem]">{v.mobile}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[16rem]">{v.reason}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{v.timestamp}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function VisitorsSearchBar({ search, setSearch, date, setDate, onClear, onDownloadPDF, onWeekly }) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
      <div className="relative w-full md:w-1/2">
        <input
          className="rounded-md border border-gray-300 px-8 py-2 text-sm focus:ring-blue-500 w-full bg-white/80 placeholder:text-gray-400"
          placeholder="Search by Name or Mobile..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400">🔍</span>
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto">
        <label className="text-blue-700 font-medium">Date:</label>
        <input
          type="date"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 bg-white/80"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>
      <button
        className="bg-gray-200 hover:bg-gray-300 text-sm px-4 py-1 rounded font-medium transition print:hidden"
        onClick={onClear}
        type="button"
      >Clear Filters</button>
      <button
        className="bg-green-600 hover:bg-green-700 text-white rounded shadow px-4 py-2 font-semibold transition-all duration-150 active:scale-95 print:hidden"
        onClick={onDownloadPDF}
        type="button"
      >Download as PDF</button>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white rounded shadow px-4 py-2 font-semibold transition-all duration-150 active:scale-95 print:hidden"
        onClick={onWeekly}
        type="button"
      >Weekly Records</button>
    </div>
  );
}

export default function Management() {
  const [active, setActive] = useState("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [studentType, setStudentType] = useState("outing");
  const tableRef = useRef(null);
  const navigate = useNavigate();
  const [showWeekly, setShowWeekly] = useState(false);
  const [weeklyData, setWeeklyData] = useState([]);
  const weeklyRef = useRef(null);
  
  // State for real data from Firebase
  const [allLogs, setAllLogs] = useState<(StaffLog | StudentLog | HostelLog)[]>([]);
  const [staffLogs, setStaffLogs] = useState<StaffLog[]>([]);
  const [dayscholarLogs, setDayscholarLogs] = useState<StudentLog[]>([]);
  const [hostellerLogs, setHostellerLogs] = useState<HostelLog[]>([]);
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Get today's date string (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);

  // Fetch data from Firebase
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      console.log('Fetching logs for date:', today);
      
      const staffLogs: StaffLog[] = [];
      const dayscholarLogs: StudentLog[] = [];
      const hostellerLogs: HostelLog[] = [];
      
      // Fetch from new_attend collection for staff and dayscholar data
      const attendanceRef = ref(db, `new_attend/${today}`);
      console.log('Fetching from new_attend collection:', `new_attend/${today}`);
      const attendanceSnapshot = await get(attendanceRef);
      
      if (attendanceSnapshot.exists()) {
        const attendanceData = attendanceSnapshot.val();
        console.log('Attendance data found:', Object.keys(attendanceData));
        console.log('Raw attendance data:', attendanceData);
        
        // Process attendance records
        Object.entries(attendanceData).forEach(([personId, personData]: [string, unknown]) => {
          const person = personData as Record<string, unknown>;
          console.log('Processing record:', personId, person);
          
          // Handle both empty string and null values for in/out
          const inTime = person.in && person.in !== '' ? (person.in as string) : null;
          const outTime = person.out && person.out !== '' ? (person.out as string) : null;
          
          if (person.role === "staff") {
            // Process staff records
            const staffLog: StaffLog = {
              id: personId,
              name: (person.name as string) || "Unknown",
              department: (person.department as string) || "Unknown",
              in: inTime,
              out: outTime,
              status: outTime ? "EXIT" : "Inside",
              timestamp: inTime || outTime || new Date().toISOString()
            };
            
            console.log('Created staff log:', staffLog);
            staffLogs.push(staffLog);
          } else if (person.role === "student" && person.mode !== "Hosteller") {
            // Process dayscholar student records only
            const studentLog: StudentLog = {
              id: personId,
              name: (person.name as string) || "Unknown",
              department: (person.department as string) || "Unknown",
              in: inTime,
              out: outTime,
              status: outTime ? "EXIT" : "Inside",
              timestamp: inTime || outTime || new Date().toISOString(),
              mode: (person.mode as string) || "Unknown"
            };
            
            console.log('Created dayscholar log:', studentLog);
            dayscholarLogs.push(studentLog);
          }
        });
      } else {
        console.log('No attendance data found for today in new_attend collection');
      }
      
      // Fetch from hostel_logs collection for hosteller data
      const hostelLogsRef = ref(db, `hostel_logs/${today}`);
      console.log('Fetching from hostel_logs collection:', `hostel_logs/${today}`);
      const hostelLogsSnapshot = await get(hostelLogsRef);
      
      if (hostelLogsSnapshot.exists()) {
        const hostelLogsData = hostelLogsSnapshot.val();
        console.log('Hostel logs data found:', Object.keys(hostelLogsData));
        
        // Process hostel logs records
        Object.entries(hostelLogsData).forEach(([personId, personData]: [string, unknown]) => {
          const person = personData as Record<string, unknown>;
          console.log('Processing hostel record:', personId, person);
          
          // Handle both empty string and null values for in/out
          const inTime = person.in && person.in !== '' ? (person.in as string) : null;
          const outTime = person.out && person.out !== '' ? (person.out as string) : null;
          
          const hostelLog: HostelLog = {
            id: personId,
            name: (person.name as string) || "Unknown",
            department: (person.department as string) || "Unknown",
            in: inTime,
            out: outTime,
            status: outTime ? "OUTSIDE" : "INSIDE",
            timestamp: inTime || outTime || new Date().toISOString(),
            passType: (person.passType as string) || "",
            passApproved: (person.passApproved as boolean) || false,
            passRequestId: (person.passRequestId as string) || null
          };
          
          console.log('Created hostel log:', hostelLog);
          hostellerLogs.push(hostelLog);
        });
      } else {
        console.log('No hostel logs data found for today in hostel_logs collection');
      }
      
      // Also check if there are any records in the logs collection
      const logsRef = ref(db, 'logs');
      const logsSnapshot = await get(logsRef);
      
      if (logsSnapshot.exists()) {
        const logsData = logsSnapshot.val();
        console.log('Logs data found:', Object.keys(logsData).length, 'entries');
        
        // Process logs collection for staff and student records
        Object.entries(logsData).forEach(([logId, logData]: [string, unknown]) => {
          const log = logData as Record<string, unknown>;
          
          // Only include logs from today
          if (log.timestamp && typeof log.timestamp === 'string' && log.timestamp.startsWith(today)) {
            if (log.role === "staff") {
              // Process staff records
              const existingStaffIndex = staffLogs.findIndex(s => s.id === (log.staffId as string));
              
              if (existingStaffIndex >= 0) {
                // Update existing staff record
                const existingStaff = staffLogs[existingStaffIndex];
                if (log.direction === "in" && !existingStaff.in) {
                  existingStaff.in = log.timestamp as string;
                  existingStaff.timestamp = log.timestamp as string;
                } else if (log.direction === "out" && !existingStaff.out) {
                  existingStaff.out = log.timestamp as string;
                  existingStaff.timestamp = log.timestamp as string;
                }
                existingStaff.status = existingStaff.out ? "EXIT" : "Inside";
              } else {
                // Create new staff record
                const staffLog: StaffLog = {
                  id: (log.staffId as string) || logId,
                  name: (log.name as string) || "Unknown",
                  department: (log.department as string) || "Unknown",
                  in: log.direction === "in" ? (log.timestamp as string) : null,
                  out: log.direction === "out" ? (log.timestamp as string) : null,
                  status: log.direction === "out" ? "EXIT" : "Inside",
                  timestamp: log.timestamp as string
                };
                staffLogs.push(staffLog);
              }
            } else if (log.role === "student") {
              // Process student records
              const existingStudentIndex = dayscholarLogs.findIndex(s => s.id === (log.studentId as string));
              const existingHostellerIndex = hostellerLogs.findIndex(s => s.id === (log.studentId as string));
              
              if (existingStudentIndex >= 0) {
                // Update existing dayscholar record
                const existingStudent = dayscholarLogs[existingStudentIndex];
                if (log.direction === "in" && !existingStudent.in) {
                  existingStudent.in = log.timestamp as string;
                  existingStudent.timestamp = log.timestamp as string;
                } else if (log.direction === "out" && !existingStudent.out) {
                  existingStudent.out = log.timestamp as string;
                  existingStudent.timestamp = log.timestamp as string;
                }
                existingStudent.status = existingStudent.out ? "EXIT" : "Inside";
              } else if (existingHostellerIndex >= 0) {
                // Update existing hosteller record
                const existingStudent = hostellerLogs[existingHostellerIndex];
                if (log.direction === "in" && !existingStudent.in) {
                  existingStudent.in = log.timestamp as string;
                  existingStudent.timestamp = log.timestamp as string;
                } else if (log.direction === "out" && !existingStudent.out) {
                  existingStudent.out = log.timestamp as string;
                  existingStudent.timestamp = log.timestamp as string;
                }
                existingStudent.status = existingStudent.out ? "OUTSIDE" : "INSIDE";
              } else {
                // Create new student record
                const studentLog: StudentLog = {
                  id: (log.studentId as string) || logId,
                  name: (log.name as string) || "Unknown",
                  department: (log.department as string) || "Unknown",
                  in: log.direction === "in" ? (log.timestamp as string) : null,
                  out: log.direction === "out" ? (log.timestamp as string) : null,
                  status: log.direction === "out" ? "EXIT" : "Inside",
                  timestamp: log.timestamp as string,
                  mode: (log.mode as string) || "Unknown"
                };
                
                // Categorize based on mode
                if (studentLog.mode === "Hosteller") {
                  // Convert StudentLog to HostelLog for hosteller students
                  const hostelLog: HostelLog = {
                    id: studentLog.id,
                    name: studentLog.name,
                    department: studentLog.department,
                    in: studentLog.in,
                    out: studentLog.out,
                    status: studentLog.out ? "OUTSIDE" : "INSIDE",
                    timestamp: studentLog.timestamp,
                    passType: "",
                    passApproved: false,
                    passRequestId: null
                  };
                  hostellerLogs.push(hostelLog);
                } else {
                  dayscholarLogs.push(studentLog);
                }
              }
            }
          }
        });
      }
      
      // Sort by timestamp (newest first)
      staffLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      dayscholarLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      hostellerLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Combine all logs for "All Logs" view
      const allLogsCombined = [...staffLogs, ...dayscholarLogs, ...hostellerLogs];
      allLogsCombined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setAllLogs(allLogsCombined);
      setStaffLogs(staffLogs);
      setDayscholarLogs(dayscholarLogs);
      setHostellerLogs(hostellerLogs);
      
      console.log('Successfully fetched logs:', {
        staff: staffLogs.length,
        dayscholar: dayscholarLogs.length,
        hosteller: hostellerLogs.length,
        total: allLogsCombined.length
      });
      
    } catch (error) {
      console.error('Error fetching logs:', error instanceof Error ? error.message : 'Unknown error');
      setAllLogs([]);
      setStaffLogs([]);
      setDayscholarLogs([]);
      setHostellerLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter functions for different log types
  const filterToday = (logs: StaffLog[] | StudentLog[] | HostelLog[]) => logs.filter(log => log.timestamp && log.timestamp.startsWith(todayStr));
  const todayStaffLogs = staffLogs.filter(log => log.timestamp && log.timestamp.startsWith(todayStr));
  const todayDayscholarLogs = dayscholarLogs.filter(log => log.timestamp && log.timestamp.startsWith(todayStr));
  const todayHostellerLogs = hostellerLogs.filter(log => log.timestamp && log.timestamp.startsWith(todayStr));

  // Staff Logs Info Boxes
  const totalEntries = todayStaffLogs.filter(log => log.in && !log.out).length;
  const totalExits = todayStaffLogs.filter(log => log.out).length;
  const currentlyInside = totalEntries - totalExits;

  // Filtering logic for real data
  const filterLogs = (logs: StaffLog[] | StudentLog[] | HostelLog[]) => {
    return logs.filter(log =>
      (!search || log.id.toLowerCase().includes(search.toLowerCase()) || 
       (log.name && log.name.toLowerCase().includes(search.toLowerCase()))) &&
      (!date || (log.timestamp && log.timestamp.startsWith(date)))
    );
  };

  // Separate filter functions for each log type
  const filterStaffLogs = (logs: StaffLog[]) => {
    return logs.filter(log =>
      (!search || log.id.toLowerCase().includes(search.toLowerCase()) || 
       (log.name && log.name.toLowerCase().includes(search.toLowerCase()))) &&
      (!date || (log.timestamp && log.timestamp.startsWith(date)))
    );
  };

  const filterStudentLogs = (logs: StudentLog[]) => {
    return logs.filter(log =>
      (!search || log.id.toLowerCase().includes(search.toLowerCase()) || 
       (log.name && log.name.toLowerCase().includes(search.toLowerCase()))) &&
      (!date || (log.timestamp && log.timestamp.startsWith(date)))
    );
  };

  const filterHostelLogs = (logs: HostelLog[]) => {
    return logs.filter(log =>
      (!search || log.id.toLowerCase().includes(search.toLowerCase()) || 
       (log.name && log.name.toLowerCase().includes(search.toLowerCase()))) &&
      (!date || (log.timestamp && log.timestamp.startsWith(date)))
    );
  };

  // Filter function for mixed log types (AllLogs)
  const filterAllLogs = (logs: (StaffLog | StudentLog | HostelLog)[]) => {
    return logs.filter(log =>
      (!search || log.id.toLowerCase().includes(search.toLowerCase()) || 
       (log.name && log.name.toLowerCase().includes(search.toLowerCase()))) &&
      (!date || (log.timestamp && log.timestamp.startsWith(date)))
    );
  };

  // Logout handler
  const handleLogout = () => {
    fakeAuth.logout();
    navigate("/login");
  };

  const handleClearFilters = () => {
    setSearch("");
    setDate("");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;
    const table = tableRef.current;
    if (!table) return;
    const canvas = await html2canvas(table, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pageWidth;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB").replace(/\//g, "-");
    let logType = "AllLogs";
    if (active === "student") logType = "StudentLogs";
    if (active === "staff") logType = "StaffLogs";
    pdf.save(`${logType}_${dateStr}.pdf`);
  };

  const [visitorsSearch, setVisitorsSearch] = useState("");
  const [visitorsDate, setVisitorsDate] = useState("");
  const visitorsRef = useRef(null);
  const filterVisitors = (visitors) => {
    return visitors.filter(v =>
      (!visitorsSearch || v.name.toLowerCase().includes(visitorsSearch.toLowerCase()) || v.mobile.includes(visitorsSearch)) &&
      (!visitorsDate || (v.timestamp && v.timestamp.startsWith(visitorsDate)))
    );
  };
  const handleVisitorsPrint = () => { window.print(); };
  const handleVisitorsDownloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;
    const table = visitorsRef.current;
    if (!table) return;
    const canvas = await html2canvas(table, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pageWidth;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB").replace(/\//g, "-");
    pdf.save(`Visitors_${dateStr}.pdf`);
  };

  // Helper to get start/end of current week (Monday-Sunday)
  function getWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    return [monday, sunday];
  }

  function filterWeek(logs, field = "in") {
    const [start, end] = getWeekRange();
    return logs.filter(log => {
      const d = log[field] ? new Date(log[field]) : null;
      // Only include logs with all required fields (no null/empty)
      const hasData = log && Object.values(log).some(v => v !== null && v !== undefined && v !== "");
      return d && d >= start && d <= end && hasData;
    });
  }

  // Download PDF for weekly records
  const handleWeeklyDownloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;
    const table = weeklyRef.current;
    if (!table) return;
    const canvas = await html2canvas(table, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pageWidth;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB").replace(/\//g, "-");
    pdf.save(`WeeklyRecords_${dateStr}.pdf`);
  };

  // Show weekly records modal
  const handleShowWeekly = () => {
    let data = [];
    if (active === "all") data = filterWeek(allLogs, "timestamp");
    else if (active === "staff") data = filterWeek(staffLogs, "timestamp");
    else if (active === "dayscholar") data = filterWeek(dayscholarLogs, "timestamp");
    else if (active === "hostellers") data = filterWeek(hostellerLogs, "timestamp");
    else if (active === "visitors") data = filterWeek(visitorLogs, "timestamp");
    setWeeklyData(data);
    setShowWeekly(true);
  };

  let TableComponent = null;
  const logs = [];
  if (active === "all") {
    TableComponent = () => (
      <>
        <SearchBar
          search={search}
          setSearch={setSearch}
          date={date}
          setDate={setDate}
          onClear={handleClearFilters}
          onDownloadPDF={handleDownloadPDF}
          onWeekly={handleShowWeekly}
        />
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">All Staff Logs</p>
                  <p className="text-2xl font-bold text-blue-800">{allLogs.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Currently Inside</p>
                  <p className="text-2xl font-bold text-green-800">{currentlyInside}</p>
                </div>
                <User className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Total Exits</p>
                  <p className="text-2xl font-bold text-purple-800">{totalExits}</p>
                </div>
                <User className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end mb-4">
          <Button 
            onClick={() => {
              fetchLogs();
            }} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Refreshing..." : "Refresh Logs"}
          </Button>
          <Button 
            onClick={() => {
              console.log('Current staff logs:', staffLogs);
              console.log('Current all logs:', allLogs);
            }} 
            className="bg-gray-600 hover:bg-gray-700 text-white ml-2"
          >
            Debug Data
          </Button>
        </div>
        <div ref={tableRef} className="print:bg-white">
          <AllLogsTable logs={filterAllLogs(allLogs)} />
        </div>
      </>
    );
  } else if (active === "staff") {
    TableComponent = () => (
      <>
        <div className="flex flex-row gap-6 mb-6 w-full justify-center">
          <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px] text-center">
            <div className="text-lg font-semibold text-blue-700">Total Entries</div>
            <div className="text-2xl font-bold mt-2">{totalEntries}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px] text-center">
            <div className="text-lg font-semibold text-blue-700">Total Exits</div>
            <div className="text-2xl font-bold mt-2">{totalExits}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px] text-center">
            <div className="text-lg font-semibold text-blue-700">Currently Inside</div>
            <div className="text-2xl font-bold mt-2">{currentlyInside}</div>
          </div>
        </div>
        <SearchBar
          search={search}
          setSearch={setSearch}
          date={date}
          setDate={setDate}
          onClear={handleClearFilters}
          onDownloadPDF={handleDownloadPDF}
          onWeekly={handleShowWeekly}
        />
        <div ref={tableRef} className="print:bg-white">
          <StaffLogsTable logs={filterStaffLogs(todayStaffLogs)} />
        </div>
      </>
    );
  } else if (active === "dayscholar") {
    TableComponent = () => (
      <>
        <div className="flex flex-row gap-6 mb-6 w-full justify-center">
          <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px] text-center">
            <div className="text-lg font-semibold text-blue-700">Total Entries</div>
            <div className="text-2xl font-bold mt-2">{todayDayscholarLogs.filter(log => log.in && !log.out).length}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px] text-center">
            <div className="text-lg font-semibold text-blue-700">Total Exits</div>
            <div className="text-2xl font-bold mt-2">{todayDayscholarLogs.filter(log => log.out).length}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px] text-center">
            <div className="text-lg font-semibold text-blue-700">Currently Inside</div>
            <div className="text-2xl font-bold mt-2">{todayDayscholarLogs.filter(log => log.in && !log.out).length - todayDayscholarLogs.filter(log => log.out).length}</div>
          </div>
        </div>
        <SearchBar
          search={search}
          setSearch={setSearch}
          date={date}
          setDate={setDate}
          onClear={handleClearFilters}
          onDownloadPDF={handleDownloadPDF}
          onWeekly={handleShowWeekly}
        />
        <div ref={tableRef} className="print:bg-white">
          <StaffLogsTable logs={filterStudentLogs(todayDayscholarLogs)} />
        </div>
      </>
    );
  } else if (active === "hostellers") {
    TableComponent = () => (
      <>
        <div className="flex flex-row gap-6 mb-6 w-full justify-center">
          <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px] text-center">
            <div className="text-lg font-semibold text-blue-700">Total Entries</div>
            <div className="text-2xl font-bold mt-2">{todayHostellerLogs.filter(log => log.in && !log.out).length}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px] text-center">
            <div className="text-lg font-semibold text-blue-700">Total Exits</div>
            <div className="text-2xl font-bold mt-2">{todayHostellerLogs.filter(log => log.out).length}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-[180px] text-center">
            <div className="text-lg font-semibold text-blue-700">Currently Inside</div>
            <div className="text-2xl font-bold mt-2">{todayHostellerLogs.filter(log => log.in && !log.out).length - todayHostellerLogs.filter(log => log.out).length}</div>
          </div>
        </div>
        <SearchBar
          search={search}
          setSearch={setSearch}
          date={date}
          setDate={setDate}
          onClear={handleClearFilters}
          onDownloadPDF={handleDownloadPDF}
          onWeekly={handleShowWeekly}
        />
        <div ref={tableRef} className="print:bg-white">
          {studentType === "outing" ? (
            <OutingLogsTable logs={filterHostelLogs(todayHostellerLogs)} />
          ) : (
            <HomeVisitingLogsTable logs={filterHostelLogs(todayHostellerLogs)} />
          )}
        </div>
      </>
    );
  } else if (active === "visitors") {
    TableComponent = () => (
      <>
        <VisitorsSearchBar
          search={visitorsSearch}
          setSearch={setVisitorsSearch}
          date={visitorsDate}
          setDate={setVisitorsDate}
          onClear={() => { setVisitorsSearch(""); setVisitorsDate(""); }}
          onDownloadPDF={handleVisitorsDownloadPDF}
          onWeekly={handleShowWeekly}
        />
        <div ref={visitorsRef} className="print:bg-white">
          <VisitorsTable visitors={filterVisitors(visitorLogs)} />
        </div>
      </>
    );
  }

  // Weekly Records Modal
  const WeeklyModal = () => (
    showWeekly && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl relative animate-fade-in">
          <button className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-red-600 font-bold" onClick={() => setShowWeekly(false)}>&times;</button>
          <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">Weekly Records</h2>
          <div ref={weeklyRef}>
            {active === "all" && <AllLogsTable logs={weeklyData} />}
            {active === "staff" && <StaffLogsTable logs={weeklyData} />}
            {active === "dayscholar" && <StaffLogsTable logs={weeklyData} />}
            {active === "hostellers" && (
              studentType === "outing" ? (
                <OutingLogsTable logs={weeklyData} />
              ) : (
                <HomeVisitingLogsTable logs={weeklyData} />
              )
            )}
            {active === "visitors" && <VisitorsTable visitors={weeklyData} />}
          </div>
          <div className="flex justify-end mt-6">
            <button className="bg-green-600 hover:bg-green-700 text-white rounded shadow px-6 py-2 font-semibold" onClick={handleWeeklyDownloadPDF}>Download PDF</button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="flex min-h-screen bg-blue-50 font-poppins">
      <Sidebar active={active} setActive={setActive} studentType={studentType} setStudentType={setStudentType} />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-white shadow p-4 mb-8 print:hidden">
          <h1 className="text-3xl font-bold text-blue-700 ml-4">Management Dashboard</h1>
          <div className="flex items-center gap-4 ml-auto">
            <UserCircle className="w-8 h-8 text-blue-700" />
            <span className="text-blue-700 font-semibold">Management</span>
            <button className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold ml-2" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <main className="flex-1 p-8 bg-blue-50 overflow-y-auto flex flex-col gap-8 items-center">
          <div className="w-full">
            <TableComponent logs={logs} />
          </div>
          <WeeklyModal />
      </main>
      </div>
    </div>
  );
}