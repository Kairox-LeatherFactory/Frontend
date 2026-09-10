'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Loader2, ShieldCheck } from 'lucide-react';

import SpotlightCard from '@/components/SpotlightCard';
import { fadeUpItem } from '@/lib/motionVariants';
import { Field, inputCls, AdminSelect} from './shared';
import { apiCreateUser } from '@/lib/api';
import { useCreateUserMutation } from '@/store/slices/adminApiSlice';
export function CreateUserForm({onSuccess, toast, showToast }) {
  // 1. STATE VARIABLES
  // ADD:
const [createUser] = useCreateUserMutation();

  const [userForm, setUserForm] = useState({
    name: '', phone: '', email: '', role: '', password: '', employee_id: ''
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  // Handle Add User Login Submission
    const handleCreateUser = async (e) => {
      e.preventDefault();
      const { name, phone, password, role, email, employee_id } = userForm;
      if (!name.trim() || !phone.trim() || !password.trim()) {
        showToast('user', 'error', 'Name, Phone, and Password are required.');
        return;
      }
      if (phone.trim().length !== 10) {
        showToast('user', 'error', 'Phone number must be exactly 10 digits.');
        return;
      }
  
      setIsSubmittingUser(true);
      try {
        const payload = {
          name: name.trim(),
          phone: phone.trim(),
          password: password,
          role: role,
          email: email.trim() || null,
          employee_id: employee_id.trim() || null,
        };
  
        await createUser(payload).unwrap();
        showToast('user', 'success', `User account login for "${name}" created successfully.`);
        setUserForm({ name: '', phone: '', email: '', role: '', password: '', employee_id: '' });
        await refreshUsers();
      } catch (err) {
        showToast('user', 'error', err.message || 'Failed to create user login.');
      } finally {
        setIsSubmittingUser(false);
      }
    };
      return (
<>
{/* 2. PROVISION USER LOGIN CARD */}
        <SpotlightCard variants={fadeUpItem} className="p-6 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <h3 className="text-lg font-extrabold pb-4 mb-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
            <Users className="w-5 h-5" style={{ color: '#c8834a' }} /> Create User Login
          </h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field label="Full Name *">
                  <input type="text" className={inputCls}
                    value={userForm.name}
                    placeholder="e.g. Priya Nair" required
                    onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
                </Field>
              </div>

              <Field label="Phone Number (Login ID) *">
                <input type="tel" inputMode="numeric" pattern="[0-9]*" className={inputCls}
                  value={userForm.phone}
                  placeholder="10-digit mobile number" required
                  maxLength={10}
                  onChange={e => setUserForm({ ...userForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
              </Field>

              <Field label="Password *">
                <input type="password" className={inputCls}
                  value={userForm.password}
                  placeholder="Min. 6 characters" required minLength="6"
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              </Field>

              <div className="sm:col-span-2">
                <Field label="User Role">
                  <AdminSelect
                    value={userForm.role}
                    placeholder="-- Select Role --"
                    onChange={(val) => setUserForm({ ...userForm, role: val })}
                    options={[
                      { value: 'viewer', label: 'Viewer' },
                      { value: 'supervisor', label: 'Supervisor' },
                      { value: 'cutting_manager', label: 'Cutting Manager' },
                      { value: 'lining_manager', label: 'Lining Manager' },
                      { value: 'stitching_manager', label: 'Stitching Manager' },
                      { value: 'store_manager', label: 'Store Manager' },
                      { value: 'hr', label: 'HR' },
                      { value: 'direct_manager', label: 'Direct Manager' },
                      { value: 'managing_director', label: 'Managing Director' },
                      { value: 'merchandiser', label: 'Merchandiser' },
                      { value: 'client', label: 'Client' },
                      { value: 'security', label: 'Security' },
                    ]}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Email (Optional)">
                  <input type="email" className={inputCls}
                    value={userForm.email}
                    placeholder="e.g. priya@factory.local"
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                </Field>
              </div>
            </div>

            <button type="submit" disabled={isSubmittingUser}
              className="w-full h-11 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              {isSubmittingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Create User Account
            </button>

            <AnimatePresence>
              {toast && toast.form === 'user' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                  className="mt-3 p-3.5 rounded-xl text-xs font-bold border text-center backdrop-blur-sm"
                  style={{
                    background: toast.type === 'success' ? 'rgba(240, 253, 244, 0.95)' : 'rgba(254, 242, 242, 0.95)',
                    borderColor: toast.type === 'success' ? 'rgba(22, 163, 74, 0.25)' : 'rgba(220, 38, 38, 0.2)',
                    color: toast.type === 'success' ? '#166534' : '#991b1b',
                  }}>
                  {toast.msg}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </SpotlightCard>




</>
  );
}