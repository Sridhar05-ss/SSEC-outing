import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, Shield, Activity, Camera, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-hero p-8 rounded-lg text-primary-foreground shadow-glow">
        <h1 className="text-3xl font-bold mb-2">Welcome to Sree Sakthi Pass Portal</h1>
        <p className="text-lg opacity-90">Face Recognition Gate Security System</p>
        <p className="text-sm opacity-75 mt-2">Engineering College - Advanced Access Control</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-primary text-primary-foreground shadow-card hover:shadow-primary transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs opacity-75">+12 from last month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-secondary text-secondary-foreground shadow-card hover:shadow-primary transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,421</div>
            <p className="text-xs text-muted-foreground">+189 from last month</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-primary transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Entries</CardTitle>
            <Activity className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">1,847</div>
            <p className="text-xs text-muted-foreground">+23% from yesterday</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card hover:shadow-primary transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recognition Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">98.7%</div>
            <p className="text-xs text-muted-foreground">+2.1% improvement</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Staff Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Manage staff profiles, capture faces, and configure access permissions.
            </p>
            <div className="flex gap-3">
              <Link to="/staff">
                <Button variant="default">Manage Staff</Button>
              </Link>
              <Button variant="capture">
                <Camera className="h-4 w-4" />
                Capture Face
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Student Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Manage student profiles, capture faces, and track attendance.
            </p>
            <div className="flex gap-3">
              <Link to="/students">
                <Button variant="default">Manage Students</Button>
              </Link>
              <Button variant="capture">
                <Camera className="h-4 w-4" />
                Capture Face
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Management */}
      <Card className="shadow-card bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="opacity-90">
            Manage staff members and their access permissions.
          </p>
          <Link to="/management">
            <Button variant="default" size="lg">
              <Users className="h-4 w-4" />
              Manage Staff
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Access Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Dr. Rajesh Kumar", type: "Staff", time: "2 minutes ago", status: "Granted" },
              { name: "Priya Sharma", type: "Student", time: "5 minutes ago", status: "Granted" },
              { name: "Prof. Anita Singh", type: "Staff", time: "8 minutes ago", status: "Granted" },
              { name: "Rahul Patel", type: "Student", time: "12 minutes ago", status: "Granted" },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div>
                    <p className="font-medium">{activity.name}</p>
                    <p className="text-sm text-muted-foreground">{activity.type} • {activity.time}</p>
                  </div>
                </div>
                <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link to="/logs">
              <Button variant="outline" className="w-full">View All Logs</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;