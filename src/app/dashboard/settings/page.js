'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiChangePassword } from '@/lib/api';
import { CheckCircle2, KeyRound, Loader2, Shield } from 'lucide-react';

export default function SettingsDashboard() {
  const { user, token } = useAuth();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: ''
  });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (passwords.newPass !== passwords.confirm) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    if (passwords.newPass.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiChangePassword(token, passwords.current, passwords.newPass);
      setSuccessMsg("Password changed successfully! You can use your new password next time you log in.");
      setPasswords({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-2xl">
      
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-600" />
          Security Settings
        </h1>
        <p className="text-slate-500 font-medium">Manage your account security and password.</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in">
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="card p-6 bg-white border border-slate-200 shadow-xl space-y-6">
        <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-600" /> Change Account Password
        </h3>
        
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase">Current Password</label>
            <input 
              type="password" 
              className="input-field mt-1" 
              value={passwords.current} 
              onChange={(e) => setPasswords({...passwords, current: e.target.value})}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase">New Password</label>
              <input 
                type="password" 
                className="input-field mt-1" 
                value={passwords.newPass} 
                onChange={(e) => setPasswords({...passwords, newPass: e.target.value})}
                required
                minLength="6"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase">Confirm New Password</label>
              <input 
                type="password" 
                className="input-field mt-1" 
                value={passwords.confirm} 
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                required
                minLength="6"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="btn-primary w-full py-3 bg-slate-900 hover:bg-black flex justify-center items-center gap-2 mt-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>

    </div>
  );
}
