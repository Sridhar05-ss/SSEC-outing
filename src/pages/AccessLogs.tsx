import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Filter, 
  Download,
  Calendar,
  Clock,
  User,
  TrendingUp,
  AlertTriangle,
  LogIn,
  LogOut,
  CheckCircle,
  XCircle
} from "lucide-react";
import { db } from "../lib/firebase";
import { ref, get, query, orderByChild, limitToLast } from "firebase/database";

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
  role?: "student" | "staff";
  outingApproved?: boolean;
  outingRequestId?: string;
}

const AccessLogs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "granted" | "denied">("all");
  const [directionFilter, setDirectionFilter] = useState<"all" | "in" | "out">("all");

  // Fetch access logs from Firebase
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        let allLogs: AccessLog[] = [];
        
        // Fetch from new_attend collection
        const attendanceRef = ref(db, `new_attend/${today}`);
        console.log('Fetching from new_attend collection:', `new_attend/${today}`);
        const attendanceSnapshot = await get(attendanceRef);
        
        if (attendanceSnapshot.exists()) {
          const attendanceData = attendanceSnapshot.val();
          console.log('Attendance data found:', Object.keys(attendanceData));
          
          // Process all attendance records
          Object.entries(attendanceData).forEach(([personId, personData]: [string, any]) => {
            const log = personData as any;
            
            const accessLog: AccessLog = {
              id: personId,
              studentId: personId,
              staffId: personId,
              name: log.name || "Unknown",
              department: log.department || "Unknown",
              mode: log.mode || "Unknown",
              role: "student", // Default to student, can be updated based on your logic
              direction: log.out ? "out" : "in",
              timestamp: log.in || log.out || new Date().toISOString(),
              status: "granted",
              reason: log.out ? "Exit" : "Entry"
            };
            
            allLogs.push(accessLog);
          });
        } else {
          console.log('No attendance data found for today in new_attend collection');
        }
        
        // Sort by timestamp (newest first)
        allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setLogs(allLogs);
        console.log('Successfully fetched access logs from new_attend collection:', allLogs.length);
        
      } catch (error) {
        console.error('Error fetching logs:', error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // Filter logs based on search term, date, status, and direction
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !selectedDate || log.timestamp.startsWith(selectedDate);
    
    const matchesStatus = filter === "all" || log.status === filter;
    
    const matchesDirection = directionFilter === "all" || log.direction === directionFilter;
    
    return matchesSearch && matchesDate && matchesStatus && matchesDirection;
  });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const exportLogs = () => {
    const csvContent = [
      ['ID', 'Student ID', 'Name', 'Department', 'Mode', 'Direction', 'Status', 'Reason', 'Timestamp'],
      ...filteredLogs.map(log => [
        log.id,
        log.studentId,
        log.name,
        log.department,
        log.mode,
        log.direction,
        log.status,
        log.reason || '',
        formatDateTime(log.timestamp)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    return status === "granted" ? "bg-green-500" : "bg-red-500";
  };

  const getDirectionIcon = (direction: string) => {
    return direction === "in" ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Access Logs</h1>
          <p className="text-muted-foreground">
            Monitor and track all gate access activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Granted Access</p>
                <p className="text-2xl font-bold text-green-600">
                  {logs.filter(log => log.status === "granted").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Denied Access</p>
                <p className="text-2xl font-bold text-red-600">
                  {logs.filter(log => log.status === "denied").length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Activity</p>
                <p className="text-2xl font-bold">
                  {logs.filter(log => 
                    log.timestamp.startsWith(new Date().toISOString().split('T')[0])
                  ).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "granted" | "denied")}
                className="w-full p-2 border border-border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="granted">Granted</option>
                <option value="denied">Denied</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Direction</label>
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as "all" | "in" | "out")}
                className="w-full p-2 border border-border rounded-md"
              >
                <option value="all">All Directions</option>
                <option value="in">Entry</option>
                <option value="out">Exit</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Access History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No access logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-card transition-smooth bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(log.status)}`}></div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(log.timestamp)}
                      </div>
                    </div>
                    
                    <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                      {log.name.charAt(0)}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{log.name}</h3>
                        <Badge variant={log.direction === "in" ? "default" : "secondary"}>
                          <div className="flex items-center gap-1">
                            {getDirectionIcon(log.direction)}
                            {log.direction === "in" ? "Entry" : "Exit"}
                          </div>
                        </Badge>
                        <Badge variant={log.status === "granted" ? "default" : "destructive"}>
                          {log.status === "granted" ? "Granted" : "Denied"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ID: {log.studentId} • {log.department}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Mode: {log.mode} • {log.reason}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {formatTime(log.timestamp)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessLogs;