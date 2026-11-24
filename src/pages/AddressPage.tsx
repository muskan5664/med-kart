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
  AlertCircle,
  Navigation,
  Stethoscope,
  Home,
  Loader2
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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

type FieldKey = 'doctorName' | 'clinicName' | 'phone' | 'pincode' | 'cityDistrict' | 'street';
type Errors = Partial<Record<FieldKey, string>>;

const STEPS = ['कार्ट', 'डिलीवरी पता', 'पेमेंट'];

const inr = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  icon?: React.ReactNode;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ id, label, icon, required = true, error, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700 mb-1.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
        {required && <span className="text-red-500">*</span>}
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
  `w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition
   focus:outline-none focus:ring-4 ${
     hasError
       ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
       : 'border-slate-300 hover:border-slate-400 focus:border-[#155ed6] focus:ring-blue-100'
   }`;

export default function AddressPage({ delivery, setDelivery, setActiveView }: AddressPageProps) {
  const { user, profile } = useAuth();
  const { cart, totalItems, subtotal, gstTotal, grandTotal } = useCart();

  const [doctorName, setDoctorName] = useState(delivery.doctorName || '');
  const [clinicName, setClinicName] = useState(delivery.clinicName || '');
  const [phone, setPhone] = useState(delivery.phone || '');
  const [pincode, setPincode] = useState('');
  const [cityDistrict, setCityDistrict] = useState('');
  const [stateName, setStateName] = useState('Jharkhand');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [addressType, setAddressType] = useState<'Clinic' | 'Home'>('Clinic');
  const [saveAsDefault, setSaveAsDefault] = useState(true);

  const [errors, setErrors] = useState<Errors>({});
  const [fetchingPin, setFetchingPin] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);

  // Pre-fill from saved profile or existing delivery state
  useEffect(() => {
    const sourceAddr = delivery.address || profile?.address || '';
    if (profile) {
      if (profile.doctorName && !doctorName) setDoctorName(profile.doctorName);
      if (profile.clinicName && !clinicName) setClinicName(profile.clinicName);
      if (profile.phone && !phone) setPhone(profile.phone.replace(/\D/g, '').slice(-10));
    }
    if (sourceAddr && !street) {
      const pinMatch = sourceAddr.match(/\b(\d{6})\b/);
      if (pinMatch && !pincode) {
        handlePincodeChange(pinMatch[1]);
      }
      setStreet(sourceAddr.replace(/^\[(Clinic|Home)\]\s*/i, '').replace(/,?\s*-?\s*\b\d{6}\b\s*$/, '').trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (cart.length === 0) setActiveView('cart');
  }, [cart.length, setActiveView]);

  if (cart.length === 0) return null;

  const clearError = (k: FieldKey) => {
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  // Auto-fill City & State when 6-digit Pincode is entered
  const handlePincodeChange = async (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 6);
    setPincode(clean);
    clearError('pincode');

    if (clean.length === 6) {
      setFetchingPin(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
        const data = await res.json();
        if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setCityDistrict(`${po.Block !== 'NA' ? po.Block + ', ' : ''}${po.District}`);
          setStateName(po.State);
          clearError('cityDistrict');
        }
      } catch {
        // Manual fallback allowed
      } finally {
        setFetchingPin(false);
      }
    }
  };

  // Detect Current Location via Browser GPS
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      return alert('आपके ब्राउज़र में GPS लोकेशन सपोर्ट नहीं है।');
    }
    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const addr = data?.address || {};
          if (addr.postcode) {
            const cleanPin = String(addr.postcode).replace(/\D/g, '').slice(0, 6);
            setPincode(cleanPin);
            clearError('pincode');
          }
          const dist = addr.city || addr.town || addr.village || addr.state_district || '';
          if (dist) {
            setCityDistrict(dist);
            clearError('cityDistrict');
          }
          if (addr.state) setStateName(addr.state);
          const roadInfo = [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ');
          if (roadInfo) {
            setStreet(roadInfo);
            clearError('street');
          }
        } catch {
          alert('लोकेशन नहीं मिल सकी, कृपया मैन्युअल पता भरें।');
        } finally {
          setFetchingGps(false);
        }
      },
      () => {
        setFetchingGps(false);
        alert('कृपया ब्राउज़र में Location Permission Allow करें।');
      },
      { timeout: 8000 }
    );
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (doctorName.trim().length < 3) e.doctorName = 'कृपया पूरा नाम लिखें';
    if (clinicName.trim().length < 2) e.clinicName = 'क्लिनिक / मेडिकल का नाम लिखें';
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = 'सही 10 अंकों का मोबाइल नंबर डालें (6-9 से शुरू)';
    if (!/^\d{6}$/.test(pincode)) e.pincode = 'सही 6 अंकों का पिनकोड डालें';
    if (cityDistrict.trim().length < 2) e.cityDistrict = 'शहर या जिला का नाम लिखें';
    if (street.trim().length < 5) e.street = 'क्लिनिक नं., रोड / मोहल्ला या गांव का नाम लिखें';
    return e;
  };

  const handleSaveAndProceed = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const first = (Object.keys(e) as FieldKey[])[0];
      document.getElementById(`addr-${first}`)?.focus();
      return;
    }

    const fullFormattedAddress = [
      `[${addressType}]`,
      street.trim(),
      landmark.trim() ? `Near ${landmark.trim()}` : '',
      cityDistrict.trim(),
      stateName.trim(),
      `- ${pincode}`
    ]
      .filter(Boolean)
      .join(', ');

    setDelivery({
      doctorName: doctorName.trim(),
      clinicName: clinicName.trim(),
      phone,
      address: fullFormattedAddress
    });

    // Save updated details to Firestore user profile for future orders
    if (user && saveAsDefault) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          doctorName: doctorName.trim(),
          clinicName: clinicName.trim(),
          phone,
          address: fullFormattedAddress
        });
      } catch {
        // Non-blocking save
      }
    }

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
          {/* Header + GPS Auto-Fill Button */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-blue-50 text-[#155ed6] grid place-items-center shrink-0">
                <MapPin className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">डिलीवरी का पता</h2>
                <p className="text-xs text-slate-500">ऑर्डर इसी पते पर भेजा जाएगा</p>
              </div>
            </div>

            <button
              type="button"
              disabled={fetchingGps}
              onClick={handleUseCurrentLocation}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#155ed6] text-xs font-bold transition"
            >
              {fetchingGps ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> लोकेशन खोज रहे हैं...
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" /> GPS लोकेशन भरें
                </>
              )}
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Contact Info */}
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

            <div className="grid sm:grid-cols-2 gap-4">
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

            {/* Pincode, City/District & State */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1 border-t border-slate-100">
              <Field
                id="addr-pincode"
                label="पिनकोड (Pincode)"
                error={errors.pincode}
                hint="6 अंक डालते ही जिला भरेगा"
              >
                <div className="relative">
                  <input
                    id="addr-pincode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="815301"
                    className={`${inputCls(!!errors.pincode)} font-bold tracking-wider`}
                    value={pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                  />
                  {fetchingPin && (
                    <Loader2 className="w-4 h-4 text-[#155ed6] animate-spin absolute right-3 top-3" />
                  )}
                </div>
              </Field>

              <Field
                id="addr-cityDistrict"
                label="शहर / जिला"
                error={errors.cityDistrict}
              >
                <input
                  id="addr-cityDistrict"
                  type="text"
                  placeholder="गिरिडीह (Giridih)"
                  className={inputCls(!!errors.cityDistrict)}
                  value={cityDistrict}
                  onChange={(e) => {
                    setCityDistrict(e.target.value);
                    clearError('cityDistrict');
                  }}
                />
              </Field>

              <div className="col-span-2 sm:col-span-1">
                <Field id="addr-state" label="राज्य (State)">
                  <input
                    id="addr-state"
                    type="text"
                    placeholder="Jharkhand"
                    className={inputCls(false)}
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                  />
                </Field>
              </div>
            </div>

            {/* Street & Landmark */}
            <Field
              id="addr-street"
              label="क्लिनिक नं., बिल्डिंग, रोड / गांव"
              icon={<Truck className="w-4 h-4" />}
              error={errors.street}
            >
              <input
                id="addr-street"
                type="text"
                autoComplete="street-address"
                placeholder="मेन रोड, शॉप नं. 4, मिर्ज़ागंज"
                className={inputCls(!!errors.street)}
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  clearError('street');
                }}
              />
            </Field>

            <Field
              id="addr-landmark"
              label="नजदीकी पहचान (Landmark)"
              required={false}
            >
              <input
                id="addr-landmark"
                type="text"
                placeholder="उदाहरण: नजदीक बस स्टैंड / सरकारी अस्पताल"
                className={inputCls(false)}
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </Field>

            {/* Address Type & Save Checkbox */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAddressType('Clinic')}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    addressType === 'Clinic'
                      ? 'border-[#155ed6] bg-blue-50 text-[#155ed6] ring-2 ring-blue-100'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" /> क्लिनिक / मेडिकल स्टोर
                </button>
                <button
                  type="button"
                  onClick={() => setAddressType('Home')}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    addressType === 'Home'
                      ? 'border-[#155ed6] bg-blue-50 text-[#155ed6] ring-2 ring-blue-100'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Home className="w-4 h-4" /> घर (Home)
                </button>
              </div>

              {user && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsDefault}
                    onChange={(e) => setSaveAsDefault(e.target.checked)}
                    className="w-4 h-4 accent-[#155ed6] rounded"
                  />
                  <span>अगली बार तेज़ ऑर्डर के लिए यह पता सेव रखें</span>
                </label>
              )}
            </div>
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
