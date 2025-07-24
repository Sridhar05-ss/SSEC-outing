import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  Search, 
  Camera, 
  Edit, 
  Trash2,
  UserCheck,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Staff {
  id: string;
  name: string;
  staffId: string;
  department: string;
  position: string;
  role: string;
  hasFaceData: boolean;
  lastSeen?: string;
}

const StaffManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Mock staff data
  const [staffList] = useState<Staff[]>([
    {
      id: "1",
      name: "Dr. Rajesh Kumar",
      staffId: "ST001",
      department: "Computer Science",
      position: "Professor",
      role: "HOD",
      hasFaceData: true,
      lastSeen: "2 hours ago"
    },
    {
      id: "2",
      name: "Prof. Anita Singh",
      staffId: "ST002",
      department: "Electronics",
      position: "Associate Professor",
      role: "Faculty",
      hasFaceData: true,
      lastSeen: "30 minutes ago"
    },
    {
      id: "3",
      name: "Mr. Vikram Patel",
      staffId: "ST003",
      department: "Mechanical",
      position: "Assistant Professor",
      role: "Faculty",
      hasFaceData: false,
      lastSeen: "Never"
    },
    {
      id: "4",
      name: "Dr. Priya Sharma",
      staffId: "ST004",
      department: "Civil",
      position: "Professor",
      role: "Faculty",
      hasFaceData: true,
      lastSeen: "1 day ago"
    }
  ]);

  const handleCaptureFace = (staff: Staff) => {
    toast({
      title: "Face Capture Initiated",
      description: `Starting face capture for ${staff.name}. Please position yourself in front of the camera.`,
    });
  };

  const filteredStaff = staffList.filter(staff =>
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff profiles and face recognition data</p>
        </div>
        <Button variant="hero" size="lg">
          <Plus className="h-4 w-4" />
          Add New Staff
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">247</p>
                <p className="text-sm text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Camera className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold text-accent">198</p>
                <p className="text-sm text-muted-foreground">Face Data Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">156</p>
                <p className="text-sm text-muted-foreground">Active Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Filter className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-muted-foreground">49</p>
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
                placeholder="Search by name, staff ID, or department..."
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

      {/* Staff List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStaff.map((staff) => (
              <div
                key={staff.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-card transition-smooth bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{staff.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {staff.staffId} • {staff.position}
                    </p>
                    <p className="text-sm text-muted-foreground">{staff.department}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <Badge variant={staff.hasFaceData ? "default" : "secondary"}>
                      {staff.hasFaceData ? "Face Data Ready" : "Setup Required"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last seen: {staff.lastSeen}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="capture"
                      size="sm"
                      onClick={() => handleCaptureFace(staff)}
                    >
                      <Camera className="h-4 w-4" />
                      {staff.hasFaceData ? "Update" : "Capture"}
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

export default StaffManagement;