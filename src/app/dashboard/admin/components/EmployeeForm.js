'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Factory, Loader2, UserPlus } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { fadeUpItem } from '@/lib/motionVariants';
import { Field, inputCls, AdminSelect } from './shared';
import { useCreateEmployeeMutation } from '@/store/slices/adminApiSlice';

export function RegisterEmployeeForm({ onSuccess, toast, showToast }) {
  // 1. STATE VARIABLES
   const [createEmployee] = useCreateEmployeeMutation();
  const [workerForm, setWorkerForm] = useState({
    name: '', phone: '', designation: '', wage_type: '', daily_rate: ''
  });
  const [isOther, setIsOther] = useState(false);
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);

  // Handle Add Worker Submission (Strictly Pure Network Action — NO GPS Triggers)
    const handleCreateWorker = async (e) => {
      e.preventDefault();
      const { name, phone, designation, wage_type, daily_rate } = workerForm;
  
      if (!name.trim() || !designation.trim()) {
        showToast('worker', 'error', 'Name and designation are required.');
        return;
      }
      if (wage_type === 'monthly' && !phone.trim()) {
        showToast('worker', 'error', 'Phone number is required for monthly employees.');
        return;
      }
      if (phone.trim() && phone.trim().length !== 10) {
        showToast('worker', 'error', 'Phone number must be exactly 10 digits.');
        return;
      }
  
      setIsSubmittingWorker(true);
      try {
        const payload = {
          name: name.trim(),
          designation: designation.trim(),
          wage_type: wage_type,
          phone: phone.trim() || null,
          daily_rate: daily_rate ? parseFloat(daily_rate) : null,
        };
  
       await createEmployee(payload).unwrap();
  
        showToast('worker', 'success', `Worker "${name}" successfully registered onto the system roster.`);
        setWorkerForm({ name: '', phone: '', designation: '', wage_type: '', daily_rate: '' });
       if (onSuccess) onSuccess();

      } catch (err) {
        showToast('worker', 'error', err.message || 'Onboarding registration failed.');
      } finally {
        setIsSubmittingWorker(false);
      }
    };
  

  return (
  <>
    {/* 1. REGISTER FACTORY EMPLOYEE CARD */}
        <SpotlightCard variants={fadeUpItem} className="p-6 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <h3 className="text-lg font-extrabold pb-4 mb-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
            <Factory className="w-5 h-5" style={{ color: '#c8834a' }} /> Register Factory Employee
          </h3>
          <form onSubmit={handleCreateWorker} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field label="Employee Full Name *">
                  <input type="text" className={inputCls}
                    value={workerForm.name}
                    onChange={e => setWorkerForm({ ...workerForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar" required />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Designation *">
                  <AdminSelect
                    value={isOther ? 'Other' : workerForm.designation}
                    placeholder="Select Designation"
                    onChange={(val) => {
                      if (val === 'Other') {
                        setIsOther(true);
                        setWorkerForm({ ...workerForm, designation: '' });
                      } else {
                        setIsOther(false);
                        setWorkerForm({ ...workerForm, designation: val });
                      }
                    }}
                    options={[
                      { value: 'Cutting', label: 'Cutting' },
                      { value: 'Fusing', label: 'Fusing' },
                      { value: 'Pasting', label: 'Pasting' },
                      { value: 'Shell stitch', label: 'Shell stitch' },
                      { value: 'Lining attach', label: 'Lining attach' },
                      { value: 'Lining stitch', label: 'Lining stitch' },
                      { value: 'Final finish', label: 'Final finish' },
                      { value: 'Supervisor', label: 'Supervisor' },
                      { value: 'Other', label: 'Other (Custom)' },
                    ]}
                  />
                </Field>
              </div>

              {isOther && (
                <div className="sm:col-span-2 animate-fade-in">
                  <Field label="Custom Designation *">
                    <input
                      type="text"
                      className={inputCls}
                      value={workerForm.designation}
                      placeholder="Type here"
                      required
                      onChange={e => setWorkerForm({ ...workerForm, designation: e.target.value })}
                    />
                  </Field>
                </div>
              )}

              <Field label="Wage Type">
                <AdminSelect
                  value={workerForm.wage_type}
                  placeholder="-- Select Wage Type --"
                  onChange={(val) => setWorkerForm({ ...workerForm, wage_type: val })}
                  options={[
                    { value: 'piece_rate', label: 'Piece Rate / Daily Wage' },
                    { value: 'monthly', label: 'Monthly Salary' },
                  ]}
                />
              </Field>

              {workerForm.wage_type === 'monthly' ? (
                <>
                  <Field label="Phone Number *">
                    <input type="tel" inputMode="numeric" pattern="[0-9]*" className={inputCls}
                      value={workerForm.phone}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Phone Number (Optional)">
                    <input type="tel" inputMode="numeric" pattern="[0-9]*" className={inputCls}
                      value={workerForm.phone}
                      placeholder="Optional for daily wage"
                      maxLength={10}
                      onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                  </Field>
                  <Field label="Daily Rate (₹)">
                    <input type="number" className={inputCls}
                      value={workerForm.daily_rate}
                      placeholder="e.g. 500"
                      onChange={e => setWorkerForm({ ...workerForm, daily_rate: e.target.value })} />
                  </Field>
                </>
              )}
            </div>

            <button type="submit" disabled={isSubmittingWorker}
              className="w-full h-11 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              {isSubmittingWorker ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : <><UserPlus className="w-4 h-4" /> Register Employee</>}
            </button>

            <AnimatePresence>
              {toast && toast.form === 'worker' && (
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
