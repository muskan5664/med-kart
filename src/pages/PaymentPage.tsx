import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { Wallet, ShieldCheck, ArrowLeft, Copy, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { PageView } from '../components/Navbar';
import { DeliveryDetails } from './AddressPage';

interface PaymentPageProps {
  delivery: DeliveryDetails;
  setActiveView: (view: PageView) => void;
}

const STORE_UPI_ID = "6203803959@ybl";
const STORE_PAYEE_NAME = "RMP Store";

export default function PaymentPage({ delivery, setActiveView }: PaymentPageProps) {
  const { cart, clearCart, subtotal, gstTotal, grandTotal } = useCart();
  const { user, profile } = useAuth();

  const [paymentMode, setPaymentMode] = useState<'UPI_QR' | 'COD'>('UPI_QR');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [placing, setPlacing] = useState(false);

  if (cart.length === 0) {
    setActiveView('cart');
    return null;
  }

  // Direct UPI Deep Links
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

  const handleConfirmOrder = async () => {
    if (!user) {
      alert('कृपया पहले लॉगिन करें।');
      return setActiveView('auth');
    }

    if (!delivery.doctorName || !delivery.phone || !delivery.address) {
      alert('कृपया पहले डिलीवरी पता भरें।');
      return setActiveView('address');
    }

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
        doctorName: delivery.doctorName,
        clinicName: delivery.clinicName,
        rmpNo: profile?.rmpNo || 'N/A',
        phone: delivery.phone,
        address: delivery.address,
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

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24">
      {/* Step Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-extrabold text-[#155ed6] uppercase">Step 3 of 3</span>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-1.5">
            <Wallet className="w-5 h-5 text-[#155ed6]" /> पेमेंट पेज (Payment)
          </h2>
        </div>
        <span className="text-xl font-black text-[#155ed6]">₹{grandTotal}</span>
      </div>

      {/* Saved Address Strip */}
      <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between gap-2 text-xs">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Deliver To:</p>
          <p className="font-extrabold text-gray-900 truncate">
            {delivery.clinicName} ({delivery.doctorName}) • {delivery.phone}
          </p>
          <p className="text-gray-500 truncate">{delivery.address}</p>
        </div>
        <button
          type="button"
          onClick={() => setActiveView('address')}
          className="text-[#155ed6] font-extrabold px-3 py-1.5 bg-blue-50 rounded-lg shrink-0"
        >
          पता बदलें
        </button>
      </div>

      {/* Payment Box */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
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
                {/* 1. PhonePe Official Logo */}
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

                {/* 2. Google Pay Official Logo */}
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

                {/* 3. Paytm Official Logo */}
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

                {/* 4. BHIM / Any UPI Official Logo */}
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

              {/* UTR Input */}
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
            onClick={() => setActiveView('address')}
            className="px-4 py-3.5 rounded-xl border border-gray-300 font-extrabold text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> पता
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
  );
}
