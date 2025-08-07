import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Management from './pages/Management';
import FaceTest from './pages/FaceTest';
import Dashboard from './pages/Dashboard';
import { zktecoAuth } from './lib/zktecoAuth';
import React from 'react';

function RequireAuth({ children, role }: { children: JSX.Element, role: 'admin' | 'management' }) {
  const location = useLocation();
  
  console.log('RequireAuth check:', {
    isAuthenticated: zktecoAuth.isAuthenticated,
    userRole: zktecoAuth.user?.role,
    requiredRole: role,
    user: zktecoAuth.user
  });
  
  if (!zktecoAuth.isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (role && zktecoAuth.user?.role !== role) {
    console.log('Role mismatch, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  console.log('Auth check passed, rendering component');
  return children;
}

function App() {
  return (
      <BrowserRouter>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<RequireAuth role="admin"><Admin /></RequireAuth>} />
        <Route path="/management" element={<RequireAuth role="management"><Management /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth role="admin"><Dashboard /></RequireAuth>} />
        <Route path="/face-test" element={<FaceTest />} />
        {/* Default route: redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
);
}

export default App;
