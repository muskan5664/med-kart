import React, { useEffect, useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import {
  ShieldCheck,
  ArrowLeft,
  Copy,
  Check,
  Lock,
  ChevronDown,
  ChevronUp,
  QrCode,
  Banknote,
  CheckCircle2,
  MapPin,
  ReceiptText,
  Sparkles,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { PageView } from '../components/Navbar';
import { DeliveryDetails } from './AddressPage';

interface PaymentPageProps {
  delivery: DeliveryDetails;
  setActiveView: (view: PageView) => void;
}

const STORE_UPI_ID = '6203803959@ybl';
const STORE_PAYEE_NAME = 'RMP Store';

type UpiAppOption = 'PHONEPE' | 'GPAY' | 'PAYTM' | 'BHIM_QR';

/* --- Local Uploaded Brand Logo Component with Safe Fallback --- */
const BrandLogo = ({
  src,
  alt,
  fallbackText,
}: {
  src: string;
  alt: string;
  fallbackText: string;
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden p-1">
      {!imgError ? (
        <img
          src={src}
          alt={alt}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain"
        />
      ) : (
        <span className="text-[10px] font-black text-[#2874f0] tracking-tighter">
          {fallbackText}
        </span>
      )}
    </div>
  );
};

export default function PaymentPage({ delivery, setActiveView }: PaymentPageProps) {
  const { cart, clearCart, subtotal, gstTotal, grandTotal } = useCart();
  const { user, profile } = useAuth();

  const [paymentMode, setPaymentMode] = useState<'UPI' | 'COD'>('UPI');
  const [selectedUpiApp, setSelectedUpiApp] = useState<UpiAppOption>('PHONEPE');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (cart.length === 0 && !placing) setActiveView('cart');
  }, [cart.length, placing, setActiveView]);

  if (cart.length === 0) return null;

  // Direct UPI Deep Links
  const upiParams = `pa=${encodeURIComponent(STORE_UPI_ID)}&pn=${encodeURIComponent(
    STORE_PAYEE_NAME
  )}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('RMP Store Order')}`;

  const genericUpiLink = `upi://pay?${upiParams}`;
  const phonePeLink = `phonepe://pay?${upiParams}`;
  const gpayLink = `tez://upi/pay?${upiParams}`;
  const paytmLink = `paytmmp://pay?${upiParams}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
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

    if (profile && !profile.verified) {
      return alert(
        'आपका RMP अकाउंट अभी वेरिफाई नहीं हुआ है। वेरिफिकेशन के बाद ही ऑर्डर हो पाएगा — सपोर्ट से संपर्क करें।'
      );
    }

    if (paymentMode === 'UPI') {
      if (!/^\d{12}$/.test(utrNumber.trim())) {
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
        paymentMode: paymentMode === 'UPI' ? 'UPI_QR' : 'COD',
        paymentApp: paymentMode === 'UPI' ? selectedUpiApp : 'COD',
        paymentStatus: 'Pending',
        utrNumber: paymentMode === 'UPI' ? utrNumber.trim() : 'COD',
        status: 'Confirmed',
        createdAt: new Date().toISOString(),
      });

      setActiveView('orders');
      clearCart();
      alert('ऑर्डर सफलतापूर्वक दर्ज हो गया है! आप "ऑर्डर देखें" में लाइव स्टेटस ट्रैक कर सकते हैं।');
    } catch (err: any) {
      alert('Order save error: ' + err.message);
    } finally {
      setPlacing(false);
    }
  };

  const upiOptions: {
    id: UpiAppOption;
    name: string;
    tag?: string;
    subtitle: string;
    icon: React.ReactNode;
    deepLink: string;
    btnColor: string;
  }[] = [
    {
      id: 'PHONEPE',
      name: 'PhonePe',
      tag: 'FASTEST',
      subtitle: 'Pay directly via PhonePe UPI',
      icon: <BrandLogo src="/logos/phonepe.png" alt="PhonePe" fallbackText="Pe" />,
      deepLink: phonePeLink,
      btnColor: 'bg-[#5F259F] hover:bg-[#4d1d82]',
    },
    {
      id: 'GPAY',
      name: 'Google Pay',
      subtitle: 'Instant payment via GPay UPI',
      icon: <BrandLogo src="/logos/gpay.png" alt="Google Pay" fallbackText="GPay" />,
      deepLink: gpayLink,
      btnColor: 'bg-[#1a73e8] hover:bg-[#1557b0]',
    },
    {
      id: 'PAYTM',
      name: 'Paytm UPI',
      subtitle: 'Pay using Paytm Wallet or UPI',
      icon: <BrandLogo src="/logos/paytm.png" alt="Paytm" fallbackText="Paytm" />,
      deepLink: paytmLink,
      btnColor: 'bg-[#00BAF2] hover:bg-[#009ecd]',
    },
    {
      id: 'BHIM_QR',
      name: 'Other UPI Apps / BHIM',
      subtitle: 'BHIM, Amazon Pay, CRED, WhatsApp',
      icon: <BrandLogo src="/logos/bhim.png" alt="BHIM UPI" fallbackText="UPI" />,
      deepLink: genericUpiLink,
      btnColor: 'bg-[#097939] hover:bg-[#075e2c]',
    },
  ];

  const totalItemsCount = cart.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div className="max-w-2xl mx-auto pb-44 md:pb-28 space-y-3">
      {/* 1. Flipkart-Style Top Header & 3-Step Stepper */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveView('address')}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition"
              aria-label="Back to Address"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-gray-900 leading-tight">Payments</h1>
              <p className="text-[11px] text-gray-500 font-medium">
                {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'} • Total ₹{grandTotal}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-bold">
            <Lock className="w-3 h-3" /> 100% Secure
          </div>
        </div>

        {/* 3-Step Visual Stepper */}
        <div className="bg-slate-50/80 px-6 py-2.5 flex items-center justify-between text-[11px] font-bold">
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="w-4 h-4 fill-emerald-600 text-white" />
            <span>Cart</span>
          </div>
          <div className="h-[2px] flex-1 mx-2 bg-emerald-500 rounded" />
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="w-4 h-4 fill-emerald-600 text-white" />
            <span>Address</span>
          </div>
          <div className="h-[2px] flex-1 mx-2 bg-[#2874f0] rounded" />
          <div className="flex items-center gap-1.5 text-[#2874f0]">
            <span className="w-4 h-4 rounded-full bg-[#2874f0] text-white flex items-center justify-center text-[10px] font-black">
              3
            </span>
            <span>Payment</span>
          </div>
        </div>
      </div>

      {/* 2. Compact Delivery Address Summary Strip */}
      <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2874f0] flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-gray-900 truncate">
                {delivery.clinicName}
              </span>
              <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">
                Clinic
              </span>
            </div>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              Dr. {delivery.doctorName} • {delivery.address} ({delivery.phone})
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveView('address')}
          className="text-xs font-extrabold text-[#2874f0] border border-blue-200 bg-blue-50/60 hover:bg-blue-100 px-3 py-1.5 rounded-lg shrink-0 transition"
        >
          Change
        </button>
      </div>

      {/* 3. Flipkart-Style UPI Payment Gateway Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div
          onClick={() => setPaymentMode('UPI')}
          className={`px-4 py-3.5 flex items-center justify-between cursor-pointer border-b ${
            paymentMode === 'UPI' ? 'bg-blue-50/40 border-blue-100' : 'border-gray-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BrandLogo src="/logos/bhim.png" alt="UPI" fallbackText="UPI" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-gray-900">UPI</span>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Recommended
                </span>
              </div>
              <p className="text-[11px] text-gray-500">Pay by any UPI app • Instant confirmation</p>
            </div>
          </div>
          <input
            type="radio"
            name="mainPaymentMode"
            checked={paymentMode === 'UPI'}
            onChange={() => setPaymentMode('UPI')}
            className="w-4 h-4 accent-[#2874f0]"
          />
        </div>

        {/* Expandable UPI App List */}
        {paymentMode === 'UPI' && (
          <div className="divide-y divide-gray-100">
            {upiOptions.map((app) => {
              const isSelected = selectedUpiApp === app.id;
              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedUpiApp(app.id)}
                  className={`p-4 transition cursor-pointer ${
                    isSelected ? 'bg-[#f5f8ff]' : 'hover:bg-gray-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="upiAppChoice"
                        checked={isSelected}
                        onChange={() => setSelectedUpiApp(app.id)}
                        className="w-4 h-4 accent-[#2874f0]"
                      />
                      {app.icon}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{app.name}</span>
                          {app.tag && (
                            <span className="text-[9px] font-black tracking-wide bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                              {app.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500">{app.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Direct Pay Button inside selected UPI row */}
                  {isSelected && (
                    <div className="mt-3 pl-7">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenUpiApp(app.deepLink);
                        }}
                        className={`w-full ${app.btnColor} text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2`}
                      >
                        Pay ₹{grandTotal} via {app.name}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Collapsible Scan & Pay QR + Copy UPI ID Box */}
            <div className="p-4 bg-slate-50/70">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowQrScanner(!showQrScanner)}
                  className="flex items-center gap-2 text-xs font-extrabold text-[#2874f0] hover:underline"
                >
                  <QrCode className="w-4 h-4" />
                  {showQrScanner ? 'Hide UPI QR Code' : 'Show QR Code to Scan & Pay'}
                  {showQrScanner ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="flex items-center gap-1.5 text-[11px] font-bold bg-white border border-gray-200 px-2.5 py-1 rounded-lg text-gray-700 hover:border-blue-300 transition"
                >
                  <span>{STORE_UPI_ID}</span>
                  {copiedUpi ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#2874f0]" />
                  )}
                </button>
              </div>

              {showQrScanner && (
                <div className="mt-3 bg-white border border-gray-200 rounded-xl p-4 text-center space-y-2">
                  <p className="text-xs font-bold text-gray-700">
                    Scan with PhonePe, GPay, Paytm or any UPI app
                  </p>
                  <div className="p-2 bg-white border-2 border-dashed border-blue-200 rounded-xl w-fit mx-auto">
                    <img src={qrImageUrl} alt="Store UPI QR" className="w-40 h-40 rounded-lg" />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Payee: <strong className="text-gray-800">{STORE_PAYEE_NAME}</strong> • Amount:{' '}
                    <strong className="text-gray-900">₹{grandTotal}</strong>
                  </p>
                </div>
              )}

              {/* Mandatory 12-Digit UTR Input Card */}
              <div className="mt-3.5 bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-gray-900">
                    Enter 12-Digit UPI Ref / UTR Number <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Required for Verification
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="e.g. 432910582914"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border-2 border-amber-300 focus:border-[#2874f0] rounded-xl px-3.5 py-2.5 text-sm font-extrabold tracking-widest text-gray-900 focus:outline-none"
                />
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  पेमेंट पूरा करने के बाद UPI ऐप की रसीद से 12 अंकों का <b>UTR / UPI Ref No.</b> यहाँ डालें।
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Cash on Delivery Option Card */}
      <div
        onClick={() => setPaymentMode('COD')}
        className={`bg-white p-4 rounded-2xl shadow-sm border transition cursor-pointer flex items-center justify-between ${
          paymentMode === 'COD'
            ? 'border-[#2874f0] bg-blue-50/30 ring-1 ring-[#2874f0]'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900">Cash on Delivery (COD)</p>
            <p className="text-[11px] text-gray-500">
              दवाइयाँ क्लिनिक पर मिलने के बाद नकद भुगतान करें
            </p>
          </div>
        </div>
        <input
          type="radio"
          name="mainPaymentMode"
          checked={paymentMode === 'COD'}
          onChange={() => setPaymentMode('COD')}
          className="w-4 h-4 accent-[#2874f0]"
        />
      </div>

      {/* 5. Flipkart-Style Price Details Card */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
          <ReceiptText className="w-3.5 h-3.5 text-gray-400" /> Price Details ({totalItemsCount} Items)
        </div>

        <div className="flex justify-between text-xs text-gray-600">
          <span>Medicine Subtotal</span>
          <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-xs text-gray-600">
          <span>GST (Taxable Wholesale Invoice)</span>
          <span className="font-semibold text-gray-900">₹{gstTotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-xs text-gray-600">
          <span>Clinic Delivery Charges</span>
          <span className="font-extrabold text-emerald-600">FREE</span>
        </div>

        <div className="pt-2.5 border-t border-dashed border-gray-200 flex justify-between items-center">
          <span className="text-sm font-extrabold text-gray-900">Total Payable</span>
          <span className="text-lg font-black text-gray-900">₹{grandTotal}</span>
        </div>
      </div>

      {/* Trust Badge */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 py-1">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Safe and Secure Payments • 100% Authentic Wholesale Medicines with GST Bill</span>
      </div>

      {/* 6. Fixed Flipkart-Style Sticky Bottom Checkout Bar (Positioned above Mobile Bottom Nav) */}
      <div className="fixed bottom-[64px] md:bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-black text-gray-900 leading-none">₹{grandTotal}</p>
            <p className="text-[11px] font-bold text-[#2874f0] mt-1">
              {paymentMode === 'UPI' ? 'UPI Payment Selected' : 'Cash on Delivery'}
            </p>
          </div>

          <button
            type="button"
            disabled={placing}
            onClick={handleConfirmOrder}
            className="bg-[#fb641b] hover:bg-[#e85a13] disabled:opacity-60 text-white font-extrabold text-sm px-7 py-3 rounded-xl shadow-md transition cursor-pointer"
          >
            {placing ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
