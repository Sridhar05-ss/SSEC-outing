// Demo credentials for testing when ZKTeco is not available
// These are fallback credentials for development/testing purposes

export interface DemoUser {
  username: string;
  password: string;
  role: 'admin' | 'management' | 'gate';
  name: string;
  user_id: string;
  privilege: number;
}

export const demoUsers: DemoUser[] = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    name: "System Administrator",
    user_id: "ADMIN001",
    privilege: 2
  },
  {
    username: "manager",
    password: "manager123",
    role: "management",
    name: "Management User",
    user_id: "MGR001",
    privilege: 1
  },
  {
    username: "gate",
    password: "gate123",
    role: "gate",
    name: "Gate Operator",
    user_id: "GATE001",
    privilege: 0
  }
];

// Helper function to validate demo credentials
export const validateDemoCredentials = (username: string, password: string): DemoUser | null => {
  const user = demoUsers.find(
    (u) => u.username === username && u.password === password
  );
  return user || null;
};

// Get credentials for a specific role
export const getCredentialsForRole = (role: 'admin' | 'management' | 'gate'): DemoUser | null => {
  return demoUsers.find(u => u.role === role) || null;
};

export default demoUsers; 