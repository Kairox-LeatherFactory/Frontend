'use client';
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const ROLES = {
  direct_manager:   { label: 'Direct Manager',         color: 'bg-blue-100 text-blue-800' },
  cutting_manager:  { label: 'Cutting Floor Manager',   color: 'bg-amber-100 text-amber-800' },
  stitching_manager:{ label: 'Stitching Floor Manager', color: 'bg-purple-100 text-purple-800' },
  viewer:           { label: 'Auditor / Viewer',        color: 'bg-slate-100 text-slate-700' },
};

// Which operations each role can log
export const ROLE_OPERATIONS = {
  direct_manager:    ['Cutting', 'Fusing', 'Pasting', 'Shell stitch', 'Lining attach', 'Lining stitch', 'Final finish'],
  cutting_manager:   ['Cutting'],
  stitching_manager: ['Fusing', 'Pasting', 'Shell stitch', 'Lining attach', 'Lining stitch', 'Final finish'],
  viewer:            [],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = logged out
  const [token, setToken] = useState(null); // JWT access token from backend

  const login  = (role, accessToken = null) => {
    setUser(role);
    if (accessToken) {
      setToken(accessToken);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, ROLES, ROLE_OPERATIONS }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
