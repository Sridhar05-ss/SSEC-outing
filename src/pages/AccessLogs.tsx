import { useState } from "react";
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
  AlertTriangle
} from "lucide-react";

interface AccessLog {
  id: string;
  name: string;
  userId: string;
  department: string;
  role: string;
  direction: "in" | "out";
  timestamp: string;
  status: "granted" | "denied";
  confidence: number;
}

const AccessLogs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  
  // Mock log data
  const [logs] = useState<AccessLog[]>([
    {
      id: "1",
      name: "Dr. Rajesh Kumar",
      userId: "ST001",
      department: "Computer Science",
      role: "Professor",
      direction: "in",
      timestamp: "2024-01-15T09:15:23",
      status: "granted",
      confidence: 98.7
    },
    {
      id: "2",
      name: "Priya Sharma",
      userId: "20CS101",
      department: "Computer Science",
      role: "Student",
      direction: "in",
      timestamp: "2024-01-15T09:12:45",
      status: "granted",
      confidence: 95.3
    },
    {
      id: "3",
      name: "Unknown Person",
      userId: "UNKNOWN",
      department: "-",
      role: "-",
      direction: "in",
      timestamp: "2024-01-15T09:10:12",
      status: "denied",
      confidence: 45.2
    },
    {
      id: "4",
      name: "Prof. Anita Singh",
      userId: "ST002",
      department: "Electronics",
      role: "Associate Professor",
      direction: "out",
      timestamp: "2024-01-15T09:08:33",
      status: "granted",
      confidence: 97.1
    },
    {
      id: "5",
      name: "Rahul Patel",
      userId: "20EC205",
      department: "Electronics",
      role: "Student",
      direction: "in",
      timestamp: "2024-01-15T09:05:18",
      status: "granted",
      confidence: 94.8
    }
  ]);

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
      day: 'numeric'
    });
  };

  const filteredLogs = logs.filter(log =>
    log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayEntries = logs.filter(log => log.direction === "in" && log.status === "granted").length;
  const deniedAttempts = logs.filter(log => log.status === "denied").length;
  const currentlyInside = logs.filter(log => {
    const userLogs = logs.filter(l => l.userId === log.userId && l.status === "granted");
    const lastEntry = userLogs[userLogs.length - 1];
    return lastEntry?.direction === "in";
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Access Logs</h1>
          <p className="text-muted-foreground">Monitor and analyze gate access history</p>
        </div>
        <Button variant="hero">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{todayEntries}</p>
                <p className="text-sm text-muted-foreground">Today's Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold text-accent">{currentlyInside}</p>
                <p className="text-sm text-muted-foreground">Currently Inside</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{deniedAttempts}</p>
                <p className="text-sm text-muted-foreground">Denied Attempts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{logs.length}</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
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
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-card transition-smooth bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      log.status === "granted" ? "bg-primary" : "bg-destructive"
                    }`}></div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(log.timestamp)}
                    </div>
                  </div>
                  
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {log.status === "granted" ? log.name.charAt(0) : "?"}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{log.name}</h3>
                      <Badge variant={log.direction === "in" ? "default" : "secondary"}>
                        {log.direction === "in" ? "Entry" : "Exit"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.userId} • {log.department}
                    </p>
                    <p className="text-sm text-muted-foreground">{log.role}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatTime(log.timestamp)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Confidence: {log.confidence}%
                    </p>
                  </div>
                  
                  <Badge variant={log.status === "granted" ? "default" : "destructive"}>
                    {log.status === "granted" ? "Granted" : "Denied"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessLogs;