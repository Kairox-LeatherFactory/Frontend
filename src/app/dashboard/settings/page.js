'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiChangePassword } from '@/lib/api';
import {
  CheckCircle2, KeyRound, Loader2, Shield,
  Eye, EyeOff, AlertCircle, User, Clock, Lock,
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, required, minLength }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full h-11 px-4 pr-11 rounded-xl text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a] hover:border-[#c8834a]/50 bg-[#faf6f0] text-[#2d1f0e] border-[1.5px] border-[#c8834a]/20"
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
        style={{ color: '#9a7a5a' }}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// Strength checker
function getStrength(pass) {
  if (!pass) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  const map = [
    { level: 0, label: '', color: '' },
    { level: 1, label: 'Weak',   color: '#dc2626' },
    { level: 2, label: 'Fair',   color: '#f59e0b' },
    { level: 3, label: 'Good',   color: '#16a34a' },
    { level: 4, label: 'Strong', color: '#059669' },
  ];
  return map[score] || map[1];
}

export default function SettingsDashboard() {
  const { user, token, ROLES } = useAuth();
  const roleInfo = ROLES?.[user] || { label: user, color: '' };

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const strength = getStrength(passwords.newPass);
  const passwordsMatch = passwords.newPass && passwords.confirm && passwords.newPass === passwords.confirm;
  const passwordsMismatch = passwords.confirm && passwords.newPass !== passwords.confirm;

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 6000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) { showToast('error', 'New passwords do not match.'); return; }
    if (passwords.newPass.length < 6) { showToast('error', 'Password must be at least 6 characters.'); return; }
    setIsSubmitting(true);
    try {
      await apiChangePassword(token, passwords.current, passwords.newPass);
      showToast('success', 'Password changed! Use your new password next time you log in.');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      showToast('error', err.message || 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-2xl">

      {/* ─── TOAST ─── */}
      {toast && (
        <div className="fixed top-6 right-6 z-[999] max-w-sm animate-fade-in">
          <div className="flex items-center gap-3 p-4 rounded-2xl shadow-xl font-semibold text-sm"
            style={{
              background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${toast.type === 'success' ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.2)'}`,
              color: toast.type === 'success' ? '#166534' : '#991b1b',
            }}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <p>{toast.msg}</p>
          </div>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#c8834a' }}>Account Management</p>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: '#2d1f0e' }}>
          <Shield className="w-8 h-8" style={{ color: '#c8834a' }} /> Security Settings
        </h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Manage your account password and session security.</p>
      </div>

      {/* ─── CURRENT SESSION CARD ─── */}
      <SpotlightCard className="p-5 bg-white rounded-2xl shadow-sm" style={{ border: '1px solid rgba(200,131,74,0.12)' }} spotlightColor="rgba(200,131,74,0.05)">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
            {(user || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#9a7a5a' }}>Active Session</p>
            <p className="font-black text-base" style={{ color: '#2d1f0e' }}>{user}</p>
            <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full mt-0.5 ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold uppercase" style={{ color: '#9a7a5a' }}>Session</p>
            <p className="text-xs font-black" style={{ color: '#16a34a' }}>● Active</p>
          </div>
        </div>
      </SpotlightCard>

      {/* ─── CHANGE PASSWORD CARD ─── */}
      <SpotlightCard className="p-6 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
        <h3 className="text-lg font-extrabold pb-4 mb-5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
          <KeyRound className="w-5 h-5" style={{ color: '#c8834a' }} /> Change Account Password
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Field label="Current Password">
            <PasswordInput
              value={passwords.current}
              onChange={e => setPasswords({ ...passwords, current: e.target.value })}
              placeholder="Enter current password"
              required
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Field label="New Password">
                <PasswordInput
                  value={passwords.newPass}
                  onChange={e => setPasswords({ ...passwords, newPass: e.target.value })}
                  placeholder="Min. 6 characters"
                  required minLength="6"
                />
              </Field>
              {/* Strength bar */}
              {passwords.newPass && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ background: i <= strength.level ? strength.color : 'rgba(200,131,74,0.15)' }} />
                    ))}
                  </div>
                  <p className="text-[10px] font-black" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}
            </div>

            <div>
              <Field label="Confirm New Password">
                <div className="relative">
                  <PasswordInput
                    value={passwords.confirm}
                    onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                    placeholder="Re-enter new password"
                    required minLength="6"
                  />
                </div>
              </Field>
              {passwordsMatch && (
                <p className="text-[10px] font-black mt-1.5 flex items-center gap-1" style={{ color: '#16a34a' }}>
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </p>
              )}
              {passwordsMismatch && (
                <p className="text-[10px] font-black mt-1.5 flex items-center gap-1" style={{ color: '#dc2626' }}>
                  <AlertCircle className="w-3 h-3" /> Passwords do not match
                </p>
              )}
            </div>
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #2d1f0e, #5a3e28)' }}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            {isSubmitting ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </SpotlightCard>

    </div>
  );
}
