'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// 🎯 UPDATED ROLES LIST (All Backend Roles Included)
export const ROLES = {
  managing_director: { label: 'Managing Director', color: 'bg-purple-100 text-purple-800' },
  direct_manager:    { label: 'Direct Manager',     color: 'bg-blue-100 text-blue-800' },
  hr:                { label: 'Human Resources (HR)', color: 'bg-pink-100 text-pink-800' },
  supervisor:        { label: 'Supervisor',         color: 'bg-amber-100 text-amber-800' },
  cutting_manager:   { label: 'Cutting Floor Manager', color: 'bg-orange-100 text-orange-800' },
  stitching_manager: { label: 'Stitching Floor Manager', color: 'bg-indigo-100 text-indigo-800' },
  employee:          { label: 'Employee',           color: 'bg-emerald-100 text-emerald-800' },
  client:            { label: 'Client',             color: 'bg-teal-100 text-teal-800' },
  viewer:            { label: 'Auditor / Viewer',    color: 'bg-slate-100 text-slate-700' },
};

// Which operations each role can log
export const ROLE_OPERATIONS = {
  managing_director: ['Cutting', 'Fusing', 'Pasting', 'Shell stitch', 'Lining attach', 'Lining stitch', 'Final finish'],
  direct_manager:    ['Cutting', 'Fusing', 'Pasting', 'Shell stitch', 'Lining attach', 'Lining stitch', 'Final finish'],
  supervisor:        ['Cutting', 'Fusing', 'Pasting', 'Shell stitch', 'Lining attach', 'Lining stitch', 'Final finish'],
  cutting_manager:   ['Cutting'],
  stitching_manager: ['Fusing', 'Pasting', 'Shell stitch', 'Lining attach', 'Lining stitch', 'Final finish'],
  employee:          ['Cutting', 'Fusing', 'Pasting', 'Shell stitch', 'Lining attach', 'Lining stitch', 'Final finish'],
  hr:                [], // HR does not directly log floor ops
  client:            [],
  viewer:            [],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = logged out
  const [token, setToken] = useState(null); // JWT access token from backend
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted auth state on client-side mount
  useEffect(() => {
    const storedUser = localStorage.getItem('kairox_user');
    const storedToken = localStorage.getItem('kairox_token');
    
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setIsLoaded(true);
  }, []);

  const login = (role, accessToken = null) => {
    setUser(role);
    localStorage.setItem('kairox_user', role);
    
    if (accessToken) {
      setToken(accessToken);
      localStorage.setItem('kairox_token', accessToken);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('kairox_user');
    localStorage.removeItem('kairox_token');
  };

  // Prevent rendering until we've checked localStorage to avoid hydration mismatch
  if (!isLoaded) {
    return null; 
  }

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