import React, { useState, useRef } from "react";
import { UserCircle, LogOut } from "lucide-react";

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

function Sidebar({ active, setActive }) {
  const navItems = [
    { key: "all", label: "All Logs" },
    { key: "student", label: "Student Logs" },
    { key: "staff", label: "Staff Logs" },
    { key: "visitors", label: "Visitors Details" },
  ];
  return (
    <aside className="min-h-screen w-64 bg-gradient-to-b from-blue-700 to-blue-400 text-white flex flex-col py-8 px-4 shadow-2xl print:hidden">
      <img src="/college_logo.png" alt="College Logo" className="h-16 w-auto object-contain mx-auto mt-4 mb-4" />
      <h2 className="text-2xl font-bold mb-8 text-center tracking-wide">Management</h2>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`w-full flex items-center text-left py-2 px-3 rounded-lg transition font-semibold relative ${active === item.key ? "bg-blue-300/30 text-white shadow-lg ring-2 ring-blue-200 animate-pulse-slow" : "hover:bg-blue-500/20"}`}
            onClick={() => setActive(item.key)}
          >
            {item.label}
            {active === item.key && <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-200 rounded-full animate-ping" />}
          </button>
        ))}
      </nav>
      <div className="mt-8 flex flex-col items-center gap-2 mb-4">
        <UserCircle className="w-10 h-10 text-white/80" />
        <span className="text-sm font-semibold">Welcome, Admin</span>
        <button className="flex items-center gap-1 text-xs text-white/80 hover:text-white mt-2"><LogOut className="w-4 h-4" />Logout</button>
        </div>
    </aside>
  );
}

function SearchBar({ search, setSearch, date, setDate, onClear, onPrint, onDownloadPDF }) {
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
        className="bg-blue-600 hover:bg-blue-700 text-white rounded shadow px-4 py-2 font-semibold transition-all duration-150 active:scale-95 print:hidden"
        onClick={onPrint}
        type="button"
      >Print</button>
      <button
        className="bg-green-600 hover:bg-green-700 text-white rounded shadow px-4 py-2 font-semibold transition-all duration-150 active:scale-95 print:hidden"
        onClick={onDownloadPDF}
        type="button"
      >Download as PDF</button>
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
            <th className="py-3 px-6">Timestamp (In)</th>
            <th className="py-3 px-6">Timestamp (Out)</th>
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
    <div className="w-[95%] mx-auto bg-white rounded-2xl shadow-lg p-4 overflow-y-auto max-h-[70vh] print:p-0 print:shadow-none print:bg-white">
      <table className="w-full text-left rounded text-sm table-fixed">
        <thead>
          <tr className="bg-blue-600 text-white text-center">
            <th className="py-3 px-6">ID</th>
            <th className="py-3 px-6">Name</th>
            <th className="py-3 px-6">Year</th>
            <th className="py-3 px-6">Department</th>
            <th className="py-3 px-6">Timestamp (In)</th>
            <th className="py-3 px-6">Timestamp (Out)</th>
            <th className="py-3 px-6">Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan={7} className="py-6 text-center text-blue-700">No logs found.</td></tr>
          ) : (
            logs.map((log, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-blue-50 transition-all hover:bg-blue-100" : "bg-white transition-all hover:bg-blue-50"}>
                <td className="py-3 px-6 text-center break-words truncate max-w-[8rem]">{log.id}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[12rem]">{log.name}</td>
                <td className="py-3 px-6 text-center break-words truncate max-w-[6rem]">{log.year}</td>
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
            <th className="py-3 px-6">Timestamp (In)</th>
            <th className="py-3 px-6">Timestamp (Out)</th>
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

function VisitorsSearchBar({ search, setSearch, date, setDate, onClear, onPrint, onDownloadPDF }) {
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
        className="bg-blue-600 hover:bg-blue-700 text-white rounded shadow px-4 py-2 font-semibold transition-all duration-150 active:scale-95 print:hidden"
        onClick={onPrint}
        type="button"
      >Print</button>
      <button
        className="bg-green-600 hover:bg-green-700 text-white rounded shadow px-4 py-2 font-semibold transition-all duration-150 active:scale-95 print:hidden"
        onClick={onDownloadPDF}
        type="button"
      >Download as PDF</button>
    </div>
  );
}

export default function Management() {
  const [active, setActive] = useState("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const tableRef = useRef(null);

  // Filtering logic (demo only)
  const filterLogs = (logs) => {
    return logs.filter(log =>
      (!search || log.id.toLowerCase().includes(search.toLowerCase()) || (log.name && log.name.toLowerCase().includes(search.toLowerCase()))) &&
      (!date || (log.in && log.in.startsWith(date)))
    );
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

  let TableComponent = null;
  let logs = [];
  if (active === "all") {
    TableComponent = AllLogsTable;
    logs = filterLogs(demoAllLogs);
  } else if (active === "student") {
    TableComponent = StudentLogsTable;
    logs = filterLogs(demoStudentLogs);
  } else if (active === "staff") {
    TableComponent = StaffLogsTable;
    logs = filterLogs(demoStaffLogs);
  } else if (active === "visitors") {
    TableComponent = () => (
      <>
        <VisitorsSearchBar
          search={visitorsSearch}
          setSearch={setVisitorsSearch}
          date={visitorsDate}
          setDate={setVisitorsDate}
          onClear={() => { setVisitorsSearch(""); setVisitorsDate(""); }}
          onPrint={handleVisitorsPrint}
          onDownloadPDF={handleVisitorsDownloadPDF}
        />
        <div ref={visitorsRef} className="print:bg-white">
          <VisitorsTable visitors={filterVisitors(demoVisitors)} />
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-blue-50 font-poppins">
      <Sidebar active={active} setActive={setActive} />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-white shadow p-4 mb-8 print:hidden">
          <h1 className="text-3xl font-bold text-blue-700 ml-4">Management Dashboard</h1>
        </header>
        <main className="flex-1 p-8 bg-blue-50 overflow-y-auto flex flex-col gap-8 items-center">
          <div className="w-full">
            {active === "all" && (
              <SearchBar
                search={search}
                setSearch={setSearch}
                date={date}
                setDate={setDate}
                onClear={handleClearFilters}
                onPrint={handlePrint}
                onDownloadPDF={handleDownloadPDF}
              />
            )}
            {active === "staff" && (
              <SearchBar
                search={search}
                setSearch={setSearch}
                date={date}
                setDate={setDate}
                onClear={handleClearFilters}
                onPrint={handlePrint}
                onDownloadPDF={handleDownloadPDF}
              />
            )}
            {active === "student" && (
              <SearchBar
                search={search}
                setSearch={setSearch}
                date={date}
                setDate={setDate}
                onClear={handleClearFilters}
                onPrint={handlePrint}
                onDownloadPDF={handleDownloadPDF}
              />
            )}
            <div ref={tableRef} className="print:bg-white">
              <TableComponent logs={logs} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 