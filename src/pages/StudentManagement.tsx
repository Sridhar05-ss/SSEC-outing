import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Camera, 
  Edit, 
  Trash2,
  Users,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  year: string;
  department: string;
  dob: string;
  hasFaceData: boolean;
  lastSeen?: string;
}

const StudentManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Mock student data
  const [studentList] = useState<Student[]>([
    {
      id: "1",
      name: "Priya Sharma",
      rollNo: "20CS101",
      year: "4th Year",
      department: "Computer Science",
      dob: "2002-03-15",
      hasFaceData: true,
      lastSeen: "5 minutes ago"
    },
    {
      id: "2",
      name: "Rahul Patel",
      rollNo: "20EC205",
      year: "4th Year",
      department: "Electronics",
      dob: "2002-07-22",
      hasFaceData: true,
      lastSeen: "12 minutes ago"
    },
    {
      id: "3",
      name: "Aisha Khan",
      rollNo: "21CS067",
      year: "3rd Year",
      department: "Computer Science",
      dob: "2003-01-10",
      hasFaceData: false,
      lastSeen: "Never"
    },
    {
      id: "4",
      name: "Vikash Singh",
      rollNo: "21ME134",
      year: "3rd Year",
      department: "Mechanical",
      dob: "2003-05-08",
      hasFaceData: true,
      lastSeen: "2 hours ago"
    }
  ]);

  const handleCaptureFace = (student: Student) => {
    toast({
      title: "Face Capture Initiated",
      description: `Starting face capture for ${student.name}. Please position yourself in front of the camera.`,
    });
  };

  const filteredStudents = studentList.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Student Management</h1>
          <p className="text-muted-foreground">Manage student profiles and face recognition data</p>
        </div>
        <Button variant="hero" size="lg">
          <Plus className="h-4 w-4" />
          Add New Student
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">3,421</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Camera className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold text-accent">2,987</p>
                <p className="text-sm text-muted-foreground">Face Data Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">1,847</p>
                <p className="text-sm text-muted-foreground">Present Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Filter className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-muted-foreground">434</p>
                <p className="text-sm text-muted-foreground">Pending Setup</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll number, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-card transition-smooth bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-secondary rounded-full flex items-center justify-center text-secondary-foreground font-semibold">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{student.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {student.rollNo} • {student.year}
                    </p>
                    <p className="text-sm text-muted-foreground">{student.department}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant={student.hasFaceData ? "default" : "secondary"}>
                      {student.hasFaceData ? "Face Data Ready" : "Setup Required"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last seen: {student.lastSeen}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="capture"
                      size="sm"
                      onClick={() => handleCaptureFace(student)}
                    >
                      <Camera className="h-4 w-4" />
                      {student.hasFaceData ? "Update" : "Capture"}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentManagement;