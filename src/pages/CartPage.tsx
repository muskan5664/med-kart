import React, { useState, useEffect } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import {
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  Truck,
  ArrowLeft,
  ArrowRight,
  Phone,
  User,
  Building,
  Copy,
  Check,
  CheckCircle2,
  MapPin,
  Wallet
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { PageView } from '../components/Navbar';

interface CartPageProps {
  setActiveView: (view: PageView) => void;
}

const STORE_UPI_ID = "6203803959@ybl";
const STORE_PAYEE_NAME = "RMP Store";

export default function CartPage({ setActiveView }: CartPageProps) {
  const { cart, updateQty, removeFromCart, clearCart, subtotal, gstTotal, grandTotal } = useCart();
  const { user, profile } = useAuth();

  // 3-Step Checkout State: 1 = Cart, 2 = Address, 3 = Payment
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 2: Delivery Details
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Step 3: Payment Details
  const [paymentMode, setPaymentMode] = useState<'UPI_QR' | 'COD'>('UPI_QR');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.doctorName && !doctorName) setDoctorName(profile.doctorName);
      if (profile.clinicName && !clinicName) setClinicName(profile.clinicName);
      if (profile.phone && !phone) setPhone(profile.phone);
      if (profile.address && !address) setAddress(profile.address);
    }
  }, [profile]);

  const totalMrp = cart.reduce((sum, item) => sum + item.mrp * item.qty, 0);
  const totalMarginSavings = Math.max(0, Math.round(totalMrp - grandTotal));

  // UPI Deep Links
  const upiParams = `pa=${encodeURIComponent(STORE_UPI_ID)}&pn=${encodeURIComponent(
    STORE_PAYEE_NAME
  )}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('RMP Store Order')}`;

  const genericUpiLink = `upi://pay?${upiParams}`;
  const phonePeLink = `phonepe://pay?${upiParams}`;
  const gpayLink = `tez://upi/pay?${upiParams}`;
  const paytmLink = `paytmmp://pay?${upiParams}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    genericUpiLink
  )}`;

  const handleOpenUpiApp = (primaryUrl: string) => {
    window.location.href = primaryUrl;
    setTimeout(() => {
      if (document.hasFocus()) {
        window.location.href = genericUpiLink;
      }
    }, 1200);
  };

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(STORE_UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Step 1 -> Step 2
  const goToAddressStep = () => {
    if (!user) {
      alert('ऑर्डर करने के लिए पहले RMP लॉगिन करें।');
      return setActiveView('auth');
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 2 -> Step 3
  const goToPaymentStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim() || !clinicName.trim() || !phone.trim() || !address.trim()) {
      return alert('कृपया सभी डिलीवरी विवरण भरें!');
    }
    if (phone.trim().length < 10) {
      return alert('कृपया सही 10 अंकों का मोबाइल नंबर डालें!');
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3 -> Confirm Order
  const handleConfirmOrder = async () => {
    if (!user) return;
    if (paymentMode === 'UPI_QR') {
      if (!utrNumber.trim() || utrNumber.trim().length < 6) {
        return alert('UPI ऐप से पेमेंट करने के बाद 12 अंकों का UTR / Ref No. जरूर डालें!');
      }
    }

    setPlacing(true);
    try {
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        userEmail: user.email || '',
        doctorName: doctorName.trim(),
        clinicName: clinicName.trim(),
        rmpNo: profile?.rmpNo || 'N/A',
        phone: phone.trim(),
        address: address.trim(),
        items: cart,
        subtotal: Number(subtotal.toFixed(2)),
        gstTotal: Number(gstTotal.toFixed(2)),
        grandTotal,
        paymentMode,
        paymentStatus: paymentMode === 'UPI_QR' ? 'Paid' : 'Pending',
        utrNumber: paymentMode === 'UPI_QR' ? utrNumber.trim() : 'COD',
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      });

      clearCart();
      alert('ऑर्डर सफलतापूर्वक दर्ज हो गया है! आप "ऑर्डर देखें" में लाइव स्टेटस ट्रैक कर सकते हैं।');
      setActiveView('orders');
    } catch (err: any) {
      alert('Order save error: ' + err.message);
    } finally {
      setPlacing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm text-center max-w-lg mx-auto mt-8 border">
        <h2 className="text-xl font-bold text-gray-800">आपका कार्ट खाली है</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">थोक रेट पर दवाइयाँ जोड़ने के लिए स्टोर पर जाएं।</p>
        <button
          onClick={() => setActiveView('store')}
          className="bg-[#155ed6] text-white font-bold px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4" /> दवाइयाँ देखें
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24">
      {/* ==================== FLIPKART-STYLE 3-STEP PROGRESS BAR ==================== */}
      <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-3 items-center text-center text-xs font-extrabold">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                step >= 1 ? 'bg-[#155ed6] text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <span className={step === 1 ? 'text-[#155ed6]' : 'text-gray-600'}>1. कार्ट (Cart)</span>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => step > 2 && setStep(2)}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                step >= 2 ? 'bg-[#155ed6] text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <span className={step === 2 ? 'text-[#155ed6]' : 'text-gray-500'}>2. पता (Address)</span>
          </button>

          {/* Step 3 */}
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                step === 3 ? 'bg-[#155ed6] text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              3
            </div>
            <span className={step === 3 ? 'text-[#155ed6]' : 'text-gray-500'}>3. पेमेंट (Pay)</span>
          </div>
        </div>
      </div>

      {/* ==================== PAGE 1: CART ITEMS & PRICE SUMMARY ==================== */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
            <h2 className="text-base font-extrabold text-gray-900">
              आपका कार्ट ({cart.length} दवाइयाँ)
            </h2>
            <button
              onClick={() => setActiveView('store')}
              className="text-xs font-extrabold text-[#155ed6] hover:underline"
            >
              + और दवाइयाँ जोड़ें
            </button>
          </div>

          {cart.map((item) => (
            <div
              key={item.id}
              className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#155ed6] px-2 py-0.5 rounded">
                  {item.category}
                </span>
                <h3 className="font-extrabold text-gray-900 text-sm mt-1 truncate">{item.name}</h3>
                <p className="text-xs text-gray-500 truncate">{item.salt}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <span className="font-extrabold text-[#155ed6]">PTR: ₹{item.ptr.toFixed(2)}</span>
                  <span className="text-gray-400 line-through">MRP ₹{item.mrp.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <p className="font-black text-gray-900 text-sm">₹{(item.ptr * item.qty).toFixed(2)}</p>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button onClick={() => updateQty(item.id, -1)} className="p-1.5 hover:bg-gray-100">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2.5 font-extrabold text-xs">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="p-1.5 hover:bg-gray-100">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-[11px] text-red-500 hover:underline flex items-center gap-0.5"
                >
                  <Trash2 className="w-3 h-3" /> हटाएं
                </button>
              </div>
            </div>
          ))}

          {/* Price Details Card */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-2 text-xs">
            <h3 className="font-extrabold text-gray-700 uppercase border-b pb-2">बिल विवरण (Price Details)</h3>
            <div className="flex justify-between text-gray-600">
              <span>कुल दवाइयों का मूल्य (PTR)</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>जीएसटी (GST 12%)</span>
              <span>+ ₹{gstTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>डिलीवरी चार्ज</span>
              <span className="text-[#249b3e] font-bold">FREE</span>
            </div>
            <div className="flex justify-between font-black text-base text-gray-900 border-t pt-2">
              <span>कुल देय राशि</span>
              <span className="text-[#155ed6]">₹{grandTotal}</span>
            </div>
            {totalMarginSavings > 0 && (
              <p className="text-xs text-[#249b3e] font-extrabold bg-emerald-50 p-2 rounded-lg text-center">
                इस ऑर्डर पर आपके क्लिनिक की कुल बचत: ₹{totalMarginSavings}
              </p>
            )}
          </div>

          {/* Continue to Address Button */}
          <button
            onClick={goToAddressStep}
            className="w-full bg-[#249b3e] hover:bg-[#1e8334] text-white font-extrabold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition"
          >
            <span>आगे बढ़ें: डिलीवरी पता भरें</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================== PAGE 2: DELIVERY ADDRESS PAGE ==================== */}
      {step === 2 && (
        <form onSubmit={goToPaymentStep} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#155ed6]" />
              <h2 className="text-base font-extrabold text-gray-900">डिलीवरी पता (Delivery Address)</h2>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> कार्ट पर जाएं
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-extrabold text-gray-700 block mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#155ed6]" /> डॉक्टर / प्राप्तकर्ता का पूरा नाम *
              </label>
              <input
                type="text"
                required
                placeholder="Dr. Rajesh Kumar"
                className="w-full border border-gray-300 p-2.5 rounded-xl focus:border-[#155ed6] focus:outline-none"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-gray-700 block mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-[#155ed6]" /> क्लिनिक / मेडिकल का नाम *
                </label>
                <input
                  type="text"
                  required
                  placeholder="City Care Clinic"
                  className="w-full border border-gray-300 p-2.5 rounded-xl focus:border-[#155ed6] focus:outline-none"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                />
              </div>

              <div>
                <label className="font-extrabold text-gray-700 block mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#155ed6]" /> मोबाइल / WhatsApp नंबर *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="10 अंकों का मोबाइल नंबर"
                  className="w-full border border-gray-300 p-2.5 rounded-xl focus:border-[#155ed6] focus:outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="font-extrabold text-gray-700 block mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#155ed6]" /> पूरा डिलीवरी पता (गांव/शहर, लैंडमार्क, जिला, पिनकोड) *
              </label>
              <textarea
                rows={3}
                required
                placeholder="उदाहरण: मेन रोड, नजदीक बस स्टैंड, गिरिडीह, झारखंड - 815301"
                className="w-full border border-gray-300 p-2.5 rounded-xl focus:border-[#155ed6] focus:outline-none"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-3 rounded-xl border border-gray-300 font-extrabold text-xs text-gray-700 hover:bg-gray-50"
            >
              ← पीछे
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#155ed6] hover:bg-[#0b49b8] text-white font-extrabold py-3 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition"
            >
              <span>आगे बढ़ें: पेमेंट करें (₹{grandTotal})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* ==================== PAGE 3: PAYMENT PAGE WITH OFFICIAL UPI LOGOS ==================== */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Selected Address Mini Summary */}
          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Deliver To:</p>
              <p className="font-extrabold text-gray-900 truncate">
                {clinicName} ({doctorName}) • {phone}
              </p>
              <p className="text-gray-500 truncate">{address}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-[#155ed6] font-extrabold px-2.5 py-1.5 bg-blue-50 rounded-lg shrink-0"
            >
              बदलें
            </button>
          </div>

          {/* Payment Box */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#155ed6]" />
                <h2 className="text-base font-extrabold text-gray-900">पेमेंट चुनें (Payment)</h2>
              </div>
              <span className="text-lg font-black text-[#155ed6]">₹{grandTotal}</span>
            </div>

            {/* Option 1: UPI Apps & QR */}
            <div className="space-y-3">
              <label
                className={`flex items-center gap-2.5 p-3 border-2 rounded-xl cursor-pointer ${
                  paymentMode === 'UPI_QR' ? 'border-[#155ed6] bg-blue-50/40' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="payMode"
                  checked={paymentMode === 'UPI_QR'}
                  onChange={() => setPaymentMode('UPI_QR')}
                />
                <span className="font-extrabold text-sm text-gray-900">
                  UPI ऐप से सीधे पे करें (PhonePe / GPay / Paytm / BHIM)
                </span>
              </label>

              {paymentMode === 'UPI_QR' && (
                <div className="bg-slate-50 border border-blue-200 rounded-2xl p-4 space-y-3.5 text-center">
                  <p className="text-xs font-extrabold text-[#0f387a]">
                    नीचे किसी भी UPI ऐप पर क्लिक करके सीधे ₹{grandTotal} पे करें:
                  </p>

                  {/* 4 OFFICIAL UPI APP LOGOS */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* 1. PhonePe Official Logo SVG */}
                    <button
                      type="button"
                      onClick={() => handleOpenUpiApp(phonePeLink)}
                      className="flex items-center gap-2.5 bg-white hover:bg-purple-50 border border-purple-200 p-2.5 rounded-xl shadow-sm transition text-left"
                    >
                      <svg className="w-9 h-9 shrink-0" viewBox="0 0 48 48">
                        <rect width="48" height="48" rx="12" fill="#5F259F" />
                        <path
                          d="M31.6 19.3c0-1.6-1.3-2.8-3-2.8h-3.1l-4.6-4.7c-.5-.5-1.3-.6-2-.3l-2.3 1c-.6.3-.8 1-.4 1.5l3.5 3.6h-4.4c-.7 0-1.2.5-1.2 1.2v1.6c0 .7.5 1.2 1.2 1.2h1.6v6.8c0 3.3 2.1 5.3 5.4 5.3 1.5 0 2.8-.4 3.8-1.1v2.6c0 .7.5 1.2 1.2 1.2h2c.7 0 1.2-.5 1.2-1.2V21.6h1.1c.7 0 1.2-.5 1.2-1.2v-1.1h-1.2zm-5.3 8.9c-.8.7-1.9 1.1-3.1 1.1-1.7 0-2.7-1-2.7-2.8v-4.9h5.8v6.6z"
                          fill="#FFFFFF"
                        />
                      </svg>
                      <div>
                        <p className="font-extrabold text-gray-900 text-xs">PhonePe</p>
                        <p className="text-[10px] text-[#5F259F] font-bold">Pay ₹{grandTotal}</p>
                      </div>
                    </button>

                    {/* 2. Google Pay Official Logo SVG */}
                    <button
                      type="button"
                      onClick={() => handleOpenUpiApp(gpayLink)}
                      className="flex items-center gap-2.5 bg-white hover:bg-blue-50 border border-blue-200 p-2.5 rounded-xl shadow-sm transition text-left"
                    >
                      <svg className="w-9 h-9 shrink-0" viewBox="0 0 48 48">
                        <rect width="48" height="48" rx="12" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1.5" />
                        <path
                          fill="#4285F4"
                          d="M35.5 24.3c0-.8-.1-1.6-.2-2.3H24v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 36c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5h-4v3.1C15.3 33.3 19.3 36 24 36z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M17.3 26.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3v-3.1h-4C12.5 20.3 12 22.1 12 24s.5 3.7 1.3 5.4l4-3.1z"
                        />
                        <path
                          fill="#EA4335"
                          d="M24 16.7c1.8 0 3.3.6 4.6 1.8l3.4-3.4C29.9 13.2 27.2 12 24 12c-4.7 0-8.7 2.7-10.7 6.6l4 3.1c.9-2.9 3.6-5 6.7-5z"
                        />
                      </svg>
                      <div>
                        <p className="font-extrabold text-gray-900 text-xs">Google Pay</p>
                        <p className="text-[10px] text-[#155ed6] font-bold">Pay ₹{grandTotal}</p>
                      </div>
                    </button>

                    {/* 3. Paytm Official Logo SVG */}
                    <button
                      type="button"
                      onClick={() => handleOpenUpiApp(paytmLink)}
                      className="flex items-center gap-2.5 bg-white hover:bg-sky-50 border border-sky-200 p-2.5 rounded-xl shadow-sm transition text-left"
                    >
                      <svg className="w-9 h-9 shrink-0" viewBox="0 0 48 48">
                        <rect width="48" height="48" rx="12" fill="#00BAF2" />
                        <text
                          x="24"
                          y="27"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="11"
                          fontWeight="900"
                          fontFamily="sans-serif"
                        >
                          Paytm
                        </text>
                        <rect x="12" y="31" width="24" height="3" rx="1.5" fill="#002E6E" />
                      </svg>
                      <div>
                        <p className="font-extrabold text-gray-900 text-xs">Paytm</p>
                        <p className="text-[10px] text-[#00BAF2] font-bold">Pay ₹{grandTotal}</p>
                      </div>
                    </button>

                    {/* 4. BHIM / Any UPI Official Logo SVG */}
                    <a
                      href={genericUpiLink}
                      className="flex items-center gap-2.5 bg-white hover:bg-orange-50 border border-orange-200 p-2.5 rounded-xl shadow-sm transition text-left"
                    >
                      <svg className="w-9 h-9 shrink-0" viewBox="0 0 48 48">
                        <rect width="48" height="48" rx="12" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1.5" />
                        <polygon points="22,10 33,24 22,38 25,24" fill="#F37021" />
                        <polygon points="16,10 27,24 16,38 19,24" fill="#097939" />
                      </svg>
                      <div>
                        <p className="font-extrabold text-gray-900 text-xs">BHIM / UPI</p>
                        <p className="text-[10px] text-[#097939] font-bold">All UPI Apps</p>
                      </div>
                    </a>
                  </div>

                  {/* QR Code Fallback */}
                  <div className="pt-2 border-t border-blue-100">
                    <p className="text-[11px] text-gray-500 font-bold mb-2">
                      या दूसरे फोन से QR कोड स्कैन करें:
                    </p>
                    <img
                      src={qrImageUrl}
                      alt="UPI QR"
                      className="w-36 h-36 mx-auto bg-white p-1.5 rounded-xl border shadow-sm"
                    />
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] bg-white py-1 px-3 rounded-lg border border-gray-200 w-fit mx-auto">
                      <span className="text-gray-600">
                        UPI ID: <b className="text-gray-900">{STORE_UPI_ID}</b>
                      </span>
                      <button type="button" onClick={handleCopyUpi} className="text-[#155ed6]">
                        {copiedUpi ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* UTR Number Input */}
                  <div className="text-left pt-1">
                    <label className="text-[11px] font-extrabold text-gray-700 block mb-1">
                      पेमेंट पूरा होने के बाद 12 अंकों का UTR / Ref No. डालें *
                    </label>
                    <input
                      type="text"
                      placeholder="उदाहरण: 432910582914"
                      className="w-full border-2 border-blue-300 bg-white p-2.5 rounded-xl text-xs font-extrabold text-center tracking-wider focus:border-[#155ed6] focus:outline-none"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Option 2: Cash on Delivery */}
              <label
                className={`flex items-center gap-2.5 p-3 border-2 rounded-xl cursor-pointer ${
                  paymentMode === 'COD' ? 'border-[#155ed6] bg-blue-50/40' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="payMode"
                  checked={paymentMode === 'COD'}
                  onChange={() => setPaymentMode('COD')}
                />
                <div>
                  <p className="font-extrabold text-sm text-gray-900">कैश ऑन डिलीवरी (Cash on Delivery)</p>
                  <p className="text-[11px] text-gray-500">दवाइयाँ क्लिनिक पर मिलने के बाद नकद भुगतान करें</p>
                </div>
              </label>
            </div>

            {/* Bottom Back & Confirm Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-3.5 rounded-xl border border-gray-300 font-extrabold text-xs text-gray-700 hover:bg-gray-50"
              >
                ← पता बदलें
              </button>
              <button
                type="button"
                disabled={placing}
                onClick={handleConfirmOrder}
                className="flex-1 bg-[#249b3e] hover:bg-[#1e8334] text-white font-extrabold py-3.5 rounded-xl shadow-md text-sm transition"
              >
                {placing ? 'ऑर्डर दर्ज हो रहा है...' : `ऑर्डर कन्फर्म करें • ₹${grandTotal}`}
              </button>
            </div>

            <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#249b3e]" /> 100% सुरक्षित और GST पक्का बिल उपलब्ध
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
