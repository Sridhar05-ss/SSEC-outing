import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Users, 
  GraduationCap, 
  Shield, 
  FileText, 
  Settings,
  Home
} from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/staff", label: "Staff Management", icon: Users },
    { path: "/students", label: "Student Management", icon: GraduationCap },
    { path: "/logs", label: "Access Logs", icon: FileText },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="bg-card shadow-card border-r border-border">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Sree Sakthi</h1>
            <p className="text-sm text-muted-foreground">Pass Portal</p>
          </div>
        </div>
        
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-smooth",
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;