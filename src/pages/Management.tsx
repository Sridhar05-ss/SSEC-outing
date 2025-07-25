import React, { useState, useRef } from "react";
import { UserCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const departments = [
  "AIML", "CYBER SECURITY", "AIDS", "IT", "ECE", "CSE", "EEE", "MECH", "CIVIL", "DCSE", "DECE", "DMECH"
];

const demoAllLogs = [
  { id: "S001", name: "Dr. Rajesh Kumar", dept: "CSE", in: "2024-06-01 08:10", out: "2024-06-01 16:30" },
  { id: "STU001", name: "Priya Sharma", dept: "CSE", in: "2024-06-01 08:20", out: "2024-06-01 15:45" },
];
const demoStudentLogs = [
  { id: "STU001", name: "Priya Sharma", year: "IV", dept: "CSE", in: "2024-06-01 08:20", out: "2024-06-01 15:45" },
  { id: "STU002", name: "Rahul Patel", year: "III", dept: "CSE", in: "2024-06-01 08:25", out: "2024-06-01 15:50" },
];
const demoStaffLogs = [
  { id: "S001", name: "Dr. Rajesh Kumar", dept: "CSE", in: "2024-06-01 08:10", out: "2024-06-01 16:30" },
  { id: "S002", name: "Anita Singh", dept: "ECE", in: "2024-06-01 08:15", out: "2024-06-01 16:00" },
];
const demoVisitors = [
  { name: "Visitor One", mobile: "9876543210", reason: "Meeting", timestamp: "2024-06-01 10:30" },
  { name: "Visitor Two", mobile: "9123456780", reason: "Delivery", timestamp: "2024-06-01 11:15" },
];

function Sidebar({ active, setActive, studentType, setStudentType }) {
  const navItems = [
    { key: "all", label: "All Logs" },
    { key: "student", label: "Student Logs" },
    { key: "staff", label: "Staff Logs" },
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
            {/* Dayscholar/Hostel toggle for Student Logs */}
            {item.key === "student" && active === "student" && (
              <div className="flex flex-col gap-2 mt-2 ml-4">
                <button
                  className={`px-4 py-2 rounded-lg font-semibold text-left border-2 transition-all duration-150 ${studentType === "dayscholar" ? "bg-white text-blue-700 border-blue-700 shadow-md" : "bg-blue-100 text-blue-700 border-transparent hover:border-blue-400"}`}
                  onClick={() => setStudentType("dayscholar")}
                >Dayscholar</button>
                <button
                  className={`px-4 py-2 rounded-lg font-semibold text-left border-2 transition-all duration-150 ${studentType === "hostel" ? "bg-white text-blue-700 border-blue-700 shadow-md" : "bg-blue-100 text-blue-700 border-transparent hover:border-blue-400"}`}
                  onClick={() => setStudentType("hostel")}
                >Hostel</button>
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

function StudentLogsTable({ logs }) {
  return (
    <div className="w-full">
      <table className="w-full text-left text-sm table-fixed bg-white rounded-2xl shadow-lg p-4 overflow-y-auto max-h-[70vh] print:p-0 print:shadow-none print:bg-white">
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

function StaffLogsTable({ logs }) {
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
  const [studentType, setStudentType] = useState("dayscholar");
  const tableRef = useRef(null);
  const navigate = useNavigate();
  const [showWeekly, setShowWeekly] = useState(false);
  const [weeklyData, setWeeklyData] = useState([]);
  const weeklyRef = useRef(null);

  // Get today's date string (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter logs for today only
  const filterToday = (logs) => logs.filter(log => log.in && log.in.startsWith(todayStr));
  const todayStaffLogs = filterToday(demoStaffLogs);

  // Staff Logs Info Boxes
  const totalEntries = todayStaffLogs.filter(log => log.in && !log.out).length + todayStaffLogs.filter(log => log.in && log.out).length;
  const totalExits = todayStaffLogs.filter(log => log.in && log.out).length;
  const currentlyInside = totalEntries - totalExits;

  // Filtering logic (demo only)
  const filterLogs = (logs) => {
    return logs.filter(log =>
      (!search || log.id.toLowerCase().includes(search.toLowerCase()) || (log.name && log.name.toLowerCase().includes(search.toLowerCase()))) &&
      (!date || (log.in && log.in.startsWith(date)))
    );
  };

  // Student Logs: Dayscholar/Hostel toggle and filter
  const todayStudentLogs = filterToday(demoStudentLogs).filter(log => studentType === "dayscholar" ? log.type !== "hostel" : log.type === "hostel");

  // Logout handler
  const handleLogout = () => {
    // Clear any auth state if needed
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
    // @ts-ignore
    const jsPDF = (await import("jspdf")).jsPDF;
    // @ts-ignore
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
    // @ts-ignore
    const jsPDF = (await import("jspdf")).jsPDF;
    // @ts-ignore
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
    // @ts-ignore
    const jsPDF = (await import("jspdf")).jsPDF;
    // @ts-ignore
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
    if (active === "all") data = filterWeek(demoAllLogs);
    else if (active === "staff") data = filterWeek(demoStaffLogs);
    else if (active === "student") data = filterWeek(demoStudentLogs);
    else if (active === "visitors") data = filterWeek(demoVisitors, "timestamp");
    setWeeklyData(data);
    setShowWeekly(true);
  };

  let TableComponent = null;
  let logs = [];
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
        <div ref={tableRef} className="print:bg-white">
          <AllLogsTable logs={filterLogs(demoAllLogs)} />
        </div>
      </>
    );
  } else if (active === "student") {
    TableComponent = () => (
      <>
        <div className="text-2xl font-bold text-blue-700 mb-4 text-left">{studentType === "hostel" ? "Hostel" : "Dayscholar"}</div>
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
          <StudentLogsTable logs={filterLogs(todayStudentLogs)} />
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
          <StaffLogsTable logs={filterLogs(todayStaffLogs)} />
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
          <VisitorsTable visitors={filterVisitors(demoVisitors)} />
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
            {active === "student" && <StudentLogsTable logs={weeklyData} />}
            {active === "staff" && <StaffLogsTable logs={weeklyData} />}
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