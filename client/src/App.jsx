import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PreJoin from './pages/PreJoin';
import Room from './pages/Room';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Meeting Routes: PreJoin and Live Meeting Room */}
        <Route path="/room/:roomId" element={<PreJoin />} />
        <Route path="/room/:roomId/live" element={<Room />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
