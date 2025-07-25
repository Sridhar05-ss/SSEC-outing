import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Management from './pages/Management';
import Gate from './pages/Gate';
import { fakeAuth } from './lib/fakeAuth';
import React from 'react';

function RequireAuth({ children, role }: { children: JSX.Element, role: 'admin' | 'management' | 'gate' }) {
  const location = useLocation();
  if (!fakeAuth.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (role && fakeAuth.role !== role) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
      <BrowserRouter>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<RequireAuth role="admin"><Admin /></RequireAuth>} />
        <Route path="/management" element={<RequireAuth role="management"><Management /></RequireAuth>} />
        <Route path="/gate" element={<RequireAuth role="gate"><Gate /></RequireAuth>} />
        {/* Default route: redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
);
}

export default App;
