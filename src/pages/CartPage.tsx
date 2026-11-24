import React, { useState, useEffect } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { Trash2, Plus, Minus, ShieldCheck, CreditCard, Truck, ArrowLeft, QrCode, Phone, User, Building } from 'lucide-react';
import { db } from '../lib/firebase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { PageView } from '../components/Navbar';

interface CartPageProps {
  setActiveView: (view: PageView) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

// APNA REAL UPI ID AUR STORE NAME YAHAN DALEIN (QR Code isi par payment bhejega)
const STORE_UPI_ID = "6203803959@ybl";
const STORE_PAYEE_NAME = "MedKart B2B Pharma";

export default function CartPage({ setActiveView }: CartPageProps) {
  const { cart, updateQty, removeFromCart, clearCart, subtotal, gstTotal, grandTotal } = useCart();
  const { user, profile } = useAuth();

  // Mandatory Customer Delivery Details
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Payment States
  const [paymentMode, setPaymentMode] = useState<'UPI_QR' | 'COD' | 'ONLINE'>('UPI_QR');
  const [utrNumber, setUtrNumber] = useState('');
  const [placing, setPlacing] = useState(false);

  // Pre-fill from profile if available
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

  // Dynamic UPI QR URL with exact amount
  const upiLink = `upi://pay?pa=${encodeURIComponent(STORE_UPI_ID)}&pn=${encodeURIComponent(STORE_PAYEE_NAME)}&am=${grandTotal}&cu=INR`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;

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
      alert('Order Successfully Placed! Admin panel me aapka order aur details bhej di gayi hain.');
      setActiveView('orders');
    } catch (err: any) {
      alert('Order save karne me error aaya: ' + err.message);
    } finally {
      setPlacing(false);
    }
  };

  const handlePlaceOrder = () => {
    if (!user) {
      alert('Order place karne ke liye pehle RMP Login karein.');
      return setActiveView('auth');
    }

    // Strict Validation for User Details
    if (!doctorName.trim() || !clinicName.trim() || !phone.trim() || !address.trim()) {
      return alert('Kripya Doctor Name, Clinic Name, Mobile Number, aur Full Delivery Address sabhi details bharein!');
    }

    if (phone.trim().length < 10) {
      return alert('Kripya sahi 10-digit Mobile Number dalein!');
    }

    if (paymentMode === 'UPI_QR') {
      if (!utrNumber.trim() || utrNumber.trim().length < 6) {
        return alert('QR Code scan karke payment karne ke baad 12-digit UPI UTR / Reference No. dalein!');
      }
      finalizeOrder('Paid', utrNumber.trim());
    } else if (paymentMode === 'ONLINE') {
      if (!window.Razorpay) {
        alert('Razorpay key configure nahi hai. Kripya "Pay via UPI QR Scan" ya "Cash on Delivery" chunein.');
        return;
      }
      const options = {
        key: 'YOUR_RAZORPAY_KEY_ID',
        amount: grandTotal * 100,
        currency: 'INR',
        name: STORE_PAYEE_NAME,
        description: `Medicine Order - ${clinicName}`,
        handler: function (response: any) {
          finalizeOrder('Paid', response.razorpay_payment_id || 'RAZORPAY_PAID');
        },
        prefill: {
          name: doctorName,
          email: user.email || '',
          contact: phone
        },
        theme: { color: '#2874f0' }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      finalizeOrder('Pending', 'COD');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="bg-white p-12 rounded-md shadow-sm text-center max-w-lg mx-auto mt-8 border">
        <h2 className="text-xl font-bold text-gray-800">Aapka Medicine Cart Khali Hai</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Wholesale PTR rates par medicines add karne ke liye store par jayein.</p>
        <button
          onClick={() => setActiveView('store')}
          className="bg-[#2874f0] text-white font-bold px-6 py-2.5 rounded-sm text-sm inline-flex items-center gap-2 hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4" /> Browse Medicines
        </button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left: Cart Items List */}
      <div className="lg:col-span-2 space-y-3">
        <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200/80 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">My Order Cart ({cart.length} Medicines)</h2>
          <button
            onClick={() => setActiveView('store')}
            className="text-xs font-bold text-[#2874f0] hover:underline"
          >
            + Add More Medicines
          </button>
        </div>

        {cart.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200/80 flex flex-wrap justify-between items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#2874f0] px-2 py-0.5 rounded">
                {item.category}
              </span>
              <h3 className="font-bold text-gray-900 mt-1">{item.name}</h3>
              <p className="text-xs text-gray-500">{item.salt} • {item.company}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="font-bold text-gray-900">PTR: ₹{item.ptr.toFixed(2)}</span>
                <span className="text-gray-400 line-through">MRP: ₹{item.mrp.toFixed(2)}</span>
                <span className="text-gray-500">GST: {item.gst || 12}%</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-300 rounded-sm">
                <button onClick={() => updateQty(item.id, -1)} className="p-2 hover:bg-gray-100 text-gray-700">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3.5 font-bold text-sm">{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)} className="p-2 hover:bg-gray-100 text-gray-700">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-right min-w-[80px]">
                <p className="font-bold text-gray-900">₹{(item.ptr * item.qty).toFixed(2)}</p>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-xs text-red-500 hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right: Customer Details + Payment + Billing Summary */}
      <div className="bg-white p-5 rounded-md shadow-sm border border-gray-200/80 h-fit space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b pb-2.5">
          1. Delivery Details (Mandatory)
        </h3>

        <div className="space-y-2.5 text-xs">
          <div>
            <label className="font-bold text-gray-600 block mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#2874f0]" /> Doctor / Receiver Name *
            </label>
            <input
              type="text"
              required
              placeholder="Dr. Rajesh Kumar"
              className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#2874f0] focus:outline-none"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-gray-600 block mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-[#2874f0]" /> Clinic / Medical Name *
              </label>
              <input
                type="text"
                required
                placeholder="City Care Clinic"
                className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#2874f0] focus:outline-none"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
              />
            </div>
            <div>
              <label className="font-bold text-gray-600 block mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#2874f0]" /> Mobile / WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="9876543210"
                className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#2874f0] focus:outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-600 block mb-1 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-[#2874f0]" /> Full Delivery Address with Pincode *
            </label>
            <textarea
              rows={2}
              required
              placeholder="House/Shop No., Road, Landmark, Village/City, District, Pincode..."
              className="w-full border border-gray-300 p-2 rounded-sm focus:border-[#2874f0] focus:outline-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Billing Summary */}
        <div className="border-t pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600 text-xs">
            <span>Subtotal (PTR)</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600 text-xs">
            <span>GST (12%)</span>
            <span>+ ₹{gstTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-base text-gray-900 border-t pt-2">
            <span>Total Payable</span>
            <span>₹{grandTotal}</span>
          </div>
          {totalMarginSavings > 0 && (
            <p className="text-[11px] text-emerald-700 font-bold text-right">
              Your Clinic Profit: ₹{totalMarginSavings}
            </p>
          )}
        </div>

        {/* Payment Options */}
        <div className="border-t pt-3">
          <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-[#2874f0]" /> 2. Select Payment Method
          </label>
          <div className="space-y-2 text-xs">
            <label className={`flex items-center gap-2 p-2.5 border rounded-sm cursor-pointer ${paymentMode === 'UPI_QR' ? 'border-[#2874f0] bg-blue-50/50' : ''}`}>
              <input
                type="radio"
                name="pay"
                checked={paymentMode === 'UPI_QR'}
                onChange={() => setPaymentMode('UPI_QR')}
              />
              <QrCode className="w-4 h-4 text-[#2874f0]" />
              <span className="font-bold">Pay via UPI QR Scan (PhonePe / GPay / Paytm)</span>
            </label>

            {paymentMode === 'UPI_QR' && (
              <div className="bg-gray-50 border border-blue-200 rounded p-3 text-center space-y-2">
                <p className="text-[11px] font-bold text-gray-700">
                  Scan QR & Pay <span className="text-[#2874f0] text-sm">₹{grandTotal}</span>
                </p>
                <img
                  src={qrImageUrl}
                  alt="UPI Payment QR"
                  className="w-40 h-40 mx-auto bg-white p-1.5 rounded border shadow-sm"
                />
                <p className="text-[10px] text-gray-500">UPI ID: <b>{STORE_UPI_ID}</b></p>
                <input
                  type="text"
                  placeholder="Enter 12-Digit UPI UTR / Ref No. *"
                  className="w-full border border-gray-300 bg-white p-2 rounded-sm text-xs font-semibold text-center focus:border-[#2874f0] focus:outline-none"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                />
              </div>
            )}

            <label className={`flex items-center gap-2 p-2.5 border rounded-sm cursor-pointer ${paymentMode === 'COD' ? 'border-[#2874f0] bg-blue-50/50' : ''}`}>
              <input
                type="radio"
                name="pay"
                checked={paymentMode === 'COD'}
                onChange={() => setPaymentMode('COD')}
              />
              <span className="font-semibold">Cash on Delivery (COD)</span>
            </label>
          </div>
        </div>

        <button
          disabled={placing}
          onClick={handlePlaceOrder}
          className="w-full bg-[#fb641b] hover:bg-[#e85810] text-white font-bold py-3.5 rounded-sm shadow transition uppercase tracking-wide text-sm"
        >
          {placing ? 'Placing Order...' : `Confirm Order • ₹${grandTotal}`}
        </button>

        <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-4 h-4 text-green-600" /> Safe & GST Compliant Wholesale Billing
        </p>
      </div>
    </div>
  );
}
