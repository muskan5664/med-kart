import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ShieldCheck, Stethoscope, Lock, Mail, Phone, MapPin, FileBadge } from 'lucide-react';
import { auth, db, ADMIN_EMAIL } from '../lib/firebase';
import { PageView } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  setActiveView: (view: PageView) => void;
}

export default function AuthPage({ setActiveView }: AuthPageProps) {
  const { refreshProfile } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    doctorName: '',
    clinicName: '',
    rmpNo: '',
    phone: '',
    address: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      } else {
        const res = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
        const isAdminUser = form.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

        try {
          await setDoc(doc(db, 'users', res.user.uid), {
            uid: res.user.uid,
            email: form.email.trim(),
            doctorName: form.doctorName.trim(),
            clinicName: form.clinicName.trim(),
            rmpNo: form.rmpNo.trim().toUpperCase(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            role: isAdminUser ? 'admin' : 'rmp',
            verified: isAdminUser ? true : false,
            createdAt: new Date().toISOString()
          });
        } catch (profileErr) {
          await deleteUser(res.user).catch(() => {});
          throw profileErr;
        }
        await refreshProfile();
      }
      setActiveView('store');
    } catch (err: any) {
      alert(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-6 bg-white rounded-md shadow-md overflow-hidden grid md:grid-cols-5 border border-gray-200">
      {/* Left Flipkart Style Blue Panel */}
      <div className="md:col-span-2 bg-[#2874f0] text-white p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-snug">
            {isLogin ? 'RMP Doctor Login' : 'Register Your Clinic'}
          </h2>
          <p className="text-blue-100 text-sm mt-3 leading-relaxed">
            Get direct wholesale PTR rates, up to 65% margin, and doorstep medicine delivery for your clinic.
          </p>
        </div>

        <div className="space-y-3 mt-8 text-xs text-blue-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-yellow-300 shrink-0" />
            <span>100% Genuine Batch-Verified Stock</span>
          </div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-yellow-300 shrink-0" />
            <span>Exclusive B2B Pricing for RMPs</span>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="md:col-span-3 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
          {!isLogin && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. R. K. Sharma"
                    className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#2874f0] focus:outline-none"
                    value={form.doctorName}
                    onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Clinic / Hospital Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Shanti Clinic"
                    className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#2874f0] focus:outline-none"
                    value={form.clinicName}
                    onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                    <FileBadge className="w-3.5 h-3.5 text-[#2874f0]" /> RMP Reg / License No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="RMP-JH-2026-889"
                    className="w-full border border-gray-300 p-2 rounded-sm uppercase focus:border-[#2874f0] focus:outline-none"
                    value={form.rmpNo}
                    onChange={(e) => setForm({ ...form, rmpNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#2874f0]" /> WhatsApp Mobile *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#2874f0] focus:outline-none"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#2874f0]" /> Clinic Delivery Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Main Road, Near Bus Stand, District, Pin"
                  className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#2874f0] focus:outline-none"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-[#2874f0]" /> Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="doctor@clinic.com"
              className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#2874f0] focus:outline-none"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#2874f0]" /> Password *
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#2874f0] focus:outline-none"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#fb641b] hover:bg-[#e85810] text-white font-bold py-3 rounded-sm shadow-sm transition uppercase tracking-wide mt-2"
          >
            {loading ? 'Please wait...' : isLogin ? 'Login to Order' : 'Register & Continue'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs font-bold text-[#2874f0] hover:underline"
          >
            {isLogin
              ? 'New to MedKart B2B? Create RMP Clinic Account'
              : 'Already have an RMP Account? Login here'}
          </button>
        </div>
      </div>
    </div>
  );
}
