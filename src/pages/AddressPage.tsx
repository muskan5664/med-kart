import React, { useState, useEffect } from 'react';
import {
  MapPin,
  User,
  Building2,
  Phone,
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  Truck,
  Lock,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { PageView } from '../components/Navbar';

export interface DeliveryDetails {
  doctorName: string;
  clinicName: string;
  phone: string;
  address: string;
}

interface AddressPageProps {
  delivery: DeliveryDetails;
  setDelivery: (details: DeliveryDetails) => void;
  setActiveView: (view: PageView) => void;
}

type FieldKey = keyof DeliveryDetails;
type Errors = Partial<Record<FieldKey, string>>;

const STEPS = ['कार्ट', 'डिलीवरी पता', 'पेमेंट'];

const inr = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center w-full" aria-label="Checkout progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 transition ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                    ? 'bg-[#155ed6] text-white ring-4 ring-blue-100'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
                  active ? 'text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`flex-1 h-0.5 mx-2 sm:mx-3 rounded ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ id, label, icon, error, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700 mb-1.5">
        <span className="text-slate-400">{icon}</span>
        {label}
        <span className="text-red-500">*</span>
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

const inputCls = (hasError: boolean) =>
  `w-full rounded-lg border bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition
   focus:outline-none focus:ring-4 ${
     hasError
       ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
       : 'border-slate-300 hover:border-slate-400 focus:border-[#155ed6] focus:ring-blue-100'
   }`;

export default function AddressPage({ delivery, setDelivery, setActiveView }: AddressPageProps) {
  const { profile } = useAuth();
  const { cart, totalItems, subtotal, gstTotal, grandTotal } = useCart();

  const [doctorName, setDoctorName] = useState(delivery.doctorName || '');
  const [clinicName, setClinicName] = useState(delivery.clinicName || '');
  const [phone, setPhone] = useState(delivery.phone || '');
  const [address, setAddress] = useState(delivery.address || '');
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (profile) {
      if (profile.doctorName && !doctorName) setDoctorName(profile.doctorName);
      if (profile.clinicName && !clinicName) setClinicName(profile.clinicName);
      if (profile.phone && !phone) setPhone(profile.phone.replace(/\D/g, '').slice(-10));
      if (profile.address && !address) setAddress(profile.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (cart.length === 0) setActiveView('cart');
  }, [cart.length, setActiveView]);

  if (cart.length === 0) return null;

  const validate = (): Errors => {
    const e: Errors = {};
    if (doctorName.trim().length < 3) e.doctorName = 'कृपया पूरा नाम लिखें';
    if (clinicName.trim().length < 2) e.clinicName = 'क्लिनिक / मेडिकल का नाम लिखें';
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = 'सही 10 अंकों का मोबाइल नंबर डालें (6-9 से शुरू)';
    if (address.trim().length < 15) e.address = 'पूरा पता लिखें: गांव/शहर, लैंडमार्क, जिला और पिनकोड';
    else if (!/\b\d{6}\b/.test(address)) e.address = 'पता में 6 अंकों का पिनकोड जरूर डालें';
    return e;
  };

  const clearError = (k: FieldKey) => {
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const handleSaveAndProceed = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const first = (Object.keys(e) as FieldKey[])[0];
      document.getElementById(`addr-${first}`)?.focus();
      return;
    }

    setDelivery({
      doctorName: doctorName.trim(),
      clinicName: clinicName.trim(),
      phone,
      address: address.trim()
    });

    setActiveView('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Progress */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 sm:px-6 py-4 mb-4">
        <Stepper current={1} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* Form */}
        <form
          onSubmit={handleSaveAndProceed}
          noValidate
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-blue-50 text-[#155ed6] grid place-items-center">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">डिलीवरी का पता</h2>
              <p className="text-xs text-slate-500">ऑर्डर इसी पते पर भेजा जाएगा</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <Field
              id="addr-doctorName"
              label="डॉक्टर / प्राप्तकर्ता का नाम"
              icon={<User className="w-4 h-4" />}
              error={errors.doctorName}
            >
              <input
                id="addr-doctorName"
                type="text"
                autoComplete="name"
                placeholder="Dr. Rajesh Kumar"
                className={inputCls(!!errors.doctorName)}
                value={doctorName}
                onChange={(e) => {
                  setDoctorName(e.target.value);
                  clearError('doctorName');
                }}
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                id="addr-clinicName"
                label="क्लिनिक / मेडिकल का नाम"
                icon={<Building2 className="w-4 h-4" />}
                error={errors.clinicName}
              >
                <input
                  id="addr-clinicName"
                  type="text"
                  autoComplete="organization"
                  placeholder="City Care Clinic"
                  className={inputCls(!!errors.clinicName)}
                  value={clinicName}
                  onChange={(e) => {
                    setClinicName(e.target.value);
                    clearError('clinicName');
                  }}
                />
              </Field>

              <Field
                id="addr-phone"
                label="मोबाइल / WhatsApp नंबर"
                icon={<Phone className="w-4 h-4" />}
                error={errors.phone}
                hint="ऑर्डर अपडेट इसी नंबर पर भेजे जाएंगे"
              >
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 pointer-events-none">
                    +91
                  </span>
                  <input
                    id="addr-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    placeholder="98765 43210"
                    className={`${inputCls(!!errors.phone)} pl-12 tracking-wide`}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      clearError('phone');
                    }}
                  />
                </div>
              </Field>
            </div>

            <Field
              id="addr-address"
              label="पूरा डिलीवरी पता"
              icon={<Truck className="w-4 h-4" />}
              error={errors.address}
              hint="गांव/शहर, लैंडमार्क, जिला, राज्य और पिनकोड"
            >
              <textarea
                id="addr-address"
                rows={3}
                autoComplete="street-address"
                placeholder="मेन रोड, नजदीक बस स्टैंड, गिरिडीह, झारखंड - 815301"
                className={`${inputCls(!!errors.address)} resize-none leading-relaxed`}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  clearError('address');
                }}
              />
            </Field>
          </div>

          <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setActiveView('cart')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <ArrowLeft className="w-4 h-4" /> कार्ट पर वापस
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#155ed6] hover:bg-[#0f4fb8] active:scale-[0.99] text-white text-sm font-bold shadow-sm transition"
            >
              पेमेंट पर जाएं <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Order summary */}
        <aside className="bg-white rounded-xl border border-slate-200 shadow-sm lg:sticky lg:top-28">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">ऑर्डर सारांश</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {cart.length} दवाइयाँ • {totalItems} यूनिट
            </p>
          </div>

          <ul className="px-5 py-3 max-h-48 overflow-y-auto divide-y divide-slate-100">
            {cart.map((item) => (
              <li key={item.id} className="py-2 flex items-start justify-between gap-3 text-xs">
                <span className="text-slate-700 font-medium line-clamp-2">
                  {item.name}
                  <span className="text-slate-400 font-normal"> × {item.qty}</span>
                </span>
                <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                  {inr(item.ptr * item.qty)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="px-5 py-4 border-t border-slate-100 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>सबटोटल</dt>
              <dd className="tabular-nums">{inr(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>GST</dt>
              <dd className="tabular-nums">{inr(gstTotal)}</dd>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-dashed border-slate-200">
              <dt className="font-bold text-slate-900">कुल देय राशि</dt>
              <dd className="text-xl font-extrabold text-[#155ed6] tabular-nums">{inr(grandTotal)}</dd>
            </div>
          </dl>

          <div className="px-5 py-3 bg-slate-50 rounded-b-xl border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> वेरिफाइड RMP के लिए थोक रेट
            </p>
            <p className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> आपकी जानकारी सुरक्षित है
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
