import React, { useState, useEffect } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import {
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  CreditCard,
  Truck,
  ArrowLeft,
  QrCode,
  Phone,
  User,
  Building,
  Copy,
  Check,
  Smartphone
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

  // Mandatory Customer Delivery Details
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Payment States
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

  // Common UPI Query Params
  const upiParams = `pa=${encodeURIComponent(STORE_UPI_ID)}&pn=${encodeURIComponent(
    STORE_PAYEE_NAME
  )}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('RMP Store Medicine Order')}`;

  // App-specific Deep Links (Directly launches installed UPI apps on Android/iOS)
  const genericUpiLink = `upi://pay?${upiParams}`;
  const phonePeLink = `phonepe://pay?${upiParams}`;
  const gpayLink = `tez://upi/pay?${upiParams}`;
  const paytmLink = `paytmmp://pay?${upiParams}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    genericUpiLink
  )}`;

  const handleOpenUpiApp = (primaryUrl: string) => {
    window.location.href = primaryUrl;
    // Fallback to generic UPI chooser after 1.2s if specific app scheme isn't registered
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

  const finalizeOrder = async (paymentStatus: 'Pending' | 'Paid', txnRef = '') => {
    if (!user) return;
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
        paymentStatus,
        utrNumber: txnRef,
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      });

      clearCart();
      alert('ऑर्डर सफलतापूर्वक दर्ज हो गया है! आप "ऑर्डर देखें" में लाइव स्टेटस देख सकते हैं।');
      setActiveView('orders');
    } catch (err: any) {
      alert('Order save karne me error aaya: ' + err.message);
    } finally {
      setPlacing(false);
    }
  };

  const handlePlaceOrder = () => {
    if (!user) {
      alert('ऑर्डर करने के लिए पहले RMP लॉगिन करें।');
      return setActiveView('auth');
    }

    if (!doctorName.trim() || !clinicName.trim() || !phone.trim() || !address.trim()) {
      return alert('कृपया डॉक्टर का नाम, क्लिनिक का नाम, मोबाइल नंबर और पूरा पता भरें!');
    }

    if (phone.trim().length < 10) {
      return alert('कृपया सही 10 अंकों का मोबाइल नंबर डालें!');
    }

    if (paymentMode === 'UPI_QR') {
      if (!utrNumber.trim() || utrNumber.trim().length < 6) {
        return alert('UPI ऐप से पेमेंट करने के बाद 12 अंकों का UTR / Transaction ID जरूर डालें!');
      }
      finalizeOrder('Paid', utrNumber.trim());
    } else {
      finalizeOrder('Pending', 'COD');
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
    <div className="grid lg:grid-cols-3 gap-5 pb-20">
      {/* Left: Cart Items List */}
      <div className="lg:col-span-2 space-y-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
          <h2 className="text-base sm:text-lg font-extrabold text-gray-800">
            आपका ऑर्डर कार्ट ({cart.length} दवाइयाँ)
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
            className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-200 flex flex-wrap justify-between items-center gap-3"
          >
            <div className="flex-1 min-w-[180px]">
              <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#155ed6] px-2 py-0.5 rounded">
                {item.category}
              </span>
              <h3 className="font-extrabold text-gray-900 text-sm mt-1">{item.name}</h3>
              <p className="text-xs text-gray-500">{item.salt}</p>
              <div className="flex items-center gap-2.5 mt-1.5 text-xs">
                <span className="font-extrabold text-[#155ed6]">PTR: ₹{item.ptr.toFixed(2)}</span>
                <span className="text-gray-400 line-through">MRP: ₹{item.mrp.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button onClick={() => updateQty(item.id, -1)} className="p-2 hover:bg-gray-100 text-gray-700">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 font-extrabold text-sm">{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)} className="p-2 hover:bg-gray-100 text-gray-700">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-right min-w-[75px]">
                <p className="font-extrabold text-gray-900">₹{(item.ptr * item.qty).toFixed(2)}</p>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-xs text-red-500 hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <Trash2 className="w-3 h-3" /> हटाएं
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right: Customer Details + Direct UPI Apps + Billing Summary */}
      <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 h-fit space-y-4">
        <h3 className="text-xs font-extrabold text-[#155ed6] uppercase tracking-wider border-b pb-2">
          1. डिलीवरी विवरण (अनिवार्य)
        </h3>

        <div className="space-y-2.5 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#155ed6]" /> डॉक्टर / प्राप्तकर्ता का नाम *
            </label>
            <input
              type="text"
              required
              placeholder="Dr. Rajesh Kumar"
              className="w-full border border-gray-300 p-2 rounded-lg focus:border-[#155ed6] focus:outline-none"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-gray-700 block mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-[#155ed6]" /> क्लिनिक / मेडिकल नाम *
              </label>
              <input
                type="text"
                required
                placeholder="City Care Clinic"
                className="w-full border border-gray-300 p-2 rounded-lg focus:border-[#155ed6] focus:outline-none"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#155ed6]" /> मोबाइल नंबर *
              </label>
              <input
                type="tel"
                required
                placeholder="9876543210"
                className="w-full border border-gray-300 p-2 rounded-lg focus:border-[#155ed6] focus:outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-[#155ed6]" /> पूरा डिलीवरी पता (पिनकोड सहित) *
            </label>
            <textarea
              rows={2}
              required
              placeholder="मकान/दुकान नं., रोड, गांव/शहर, जिला, पिनकोड..."
              className="w-full border border-gray-300 p-2 rounded-lg focus:border-[#155ed6] focus:outline-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Billing Summary */}
        <div className="border-t pt-3 space-y-1 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>सबटोटल (PTR)</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>जीएसटी (GST 12%)</span>
            <span>+ ₹{gstTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-black text-base text-gray-900 border-t pt-2">
            <span>कुल देय राशि (Total)</span>
            <span className="text-[#155ed6]">₹{grandTotal}</span>
          </div>
          {totalMarginSavings > 0 && (
            <p className="text-[11px] text-[#249b3e] font-extrabold text-right">
              आपकी कुल क्लिनिक बचत: ₹{totalMarginSavings}
            </p>
          )}
        </div>

        {/* Payment Options */}
        <div className="border-t pt-3">
          <label className="block text-xs font-extrabold text-[#155ed6] uppercase mb-2 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" /> 2. पेमेंट का तरीका चुनें
          </label>

          <div className="space-y-2 text-xs">
            <label
              className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer ${
                paymentMode === 'UPI_QR' ? 'border-[#155ed6] bg-blue-50/50' : ''
              }`}
            >
              <input
                type="radio"
                name="pay"
                checked={paymentMode === 'UPI_QR'}
                onChange={() => setPaymentMode('UPI_QR')}
              />
              <QrCode className="w-4 h-4 text-[#155ed6]" />
              <span className="font-extrabold">UPI ऐप से सीधे पे करें / QR स्कैन</span>
            </label>

            {paymentMode === 'UPI_QR' && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-center space-y-3">
                <p className="text-[11px] font-extrabold text-[#0f387a]">
                  अपना UPI ऐप चुनें (₹{grandTotal} सीधे खुलेगा):
                </p>

                {/* 4 DIRECT UPI APP LAUNCH CARDS WITH LOGOS */}
                <div className="grid grid-cols-2 gap-2">
                  {/* PhonePe Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenUpiApp(phonePeLink)}
                    className="flex items-center gap-2 bg-white hover:bg-purple-50 border border-purple-200 p-2 rounded-xl shadow-sm transition text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#5f259f] text-white font-black text-sm flex items-center justify-center shrink-0">
                      पे
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-xs">PhonePe</p>
                      <p className="text-[10px] text-purple-700 font-bold">Pay ₹{grandTotal}</p>
                    </div>
                  </button>

                  {/* Google Pay Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenUpiApp(gpayLink)}
                    className="flex items-center gap-2 bg-white hover:bg-blue-50 border border-blue-200 p-2 rounded-xl shadow-sm transition text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 font-black text-sm flex items-center justify-center shrink-0">
                      <span className="text-[#4285F4]">G</span>
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-xs">Google Pay</p>
                      <p className="text-[10px] text-[#155ed6] font-bold">Pay ₹{grandTotal}</p>
                    </div>
                  </button>

                  {/* Paytm Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenUpiApp(paytmLink)}
                    className="flex items-center gap-2 bg-white hover:bg-sky-50 border border-sky-200 p-2 rounded-xl shadow-sm transition text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#00baf2] text-white font-black text-[10px] flex items-center justify-center shrink-0">
                      Paytm
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-xs">Paytm</p>
                      <p className="text-[10px] text-sky-700 font-bold">Pay ₹{grandTotal}</p>
                    </div>
                  </button>

                  {/* Any Other UPI App Button */}
                  <a
                    href={genericUpiLink}
                    className="flex items-center gap-2 bg-white hover:bg-emerald-50 border border-emerald-200 p-2 rounded-xl shadow-sm transition text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#249b3e] text-white flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-xs">Any UPI</p>
                      <p className="text-[10px] text-[#249b3e] font-bold">BHIM / All</p>
                    </div>
                  </a>
                </div>

                <p className="text-[10px] text-gray-500 font-semibold">— या नीचे QR कोड स्कैन करें —</p>

                <img
                  src={qrImageUrl}
                  alt="UPI Payment QR"
                  className="w-36 h-36 mx-auto bg-white p-1.5 rounded-lg border shadow-sm"
                />

                {/* Copy UPI ID Pill */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] bg-white py-1 px-2.5 rounded-lg border border-gray-200 w-fit mx-auto">
                  <span className="text-gray-600">
                    UPI ID: <b className="text-gray-900">{STORE_UPI_ID}</b>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-[#155ed6] font-bold flex items-center gap-0.5 ml-1"
                  >
                    {copiedUpi ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="पेमेंट के बाद 12 अंकों का UTR / Ref No. डालें *"
                  className="w-full border border-blue-300 bg-white p-2 rounded-lg text-xs font-bold text-center focus:border-[#155ed6] focus:outline-none"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                />
              </div>
            )}

            <label
              className={`flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer ${
                paymentMode === 'COD' ? 'border-[#155ed6] bg-blue-50/50' : ''
              }`}
            >
              <input
                type="radio"
                name="pay"
                checked={paymentMode === 'COD'}
                onChange={() => setPaymentMode('COD')}
              />
              <span className="font-bold">कैश ऑन डिलीवरी (Cash on Delivery)</span>
            </label>
          </div>
        </div>

        <button
          disabled={placing}
          onClick={handlePlaceOrder}
          className="w-full bg-[#249b3e] hover:bg-[#1e8334] text-white font-extrabold py-3.5 rounded-xl shadow transition text-sm"
        >
          {placing ? 'ऑर्डर दर्ज हो रहा है...' : `ऑर्डर कन्फर्म करें • ₹${grandTotal}`}
        </button>

        <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-4 h-4 text-[#249b3e]" /> सुरक्षित और GST पक्का बिल उपलब्ध
        </p>
      </div>
    </div>
  );
}
