import React, { useState, useEffect } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { Trash2, Plus, Minus, ShieldCheck, CreditCard, Truck, ArrowLeft } from 'lucide-react';
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

export default function CartPage({ setActiveView }: CartPageProps) {
  const { cart, updateQty, removeFromCart, clearCart, subtotal, gstTotal, grandTotal } = useCart();
  const { user, profile } = useAuth();
  const [address, setAddress] = useState('');
  const [paymentMode, setPaymentMode] = useState<'COD' | 'UPI_DELIVERY' | 'ONLINE'>('COD');
  const [placing, setPlacing] = useState(false);

  // Auto-fill saved clinic address
  useEffect(() => {
    if (profile?.address && !address) {
      setAddress(profile.address);
    }
  }, [profile]);

  const totalMrp = cart.reduce((sum, item) => sum + item.mrp * item.qty, 0);
  const totalMarginSavings = Math.max(0, Math.round(totalMrp - grandTotal));

  const finalizeOrder = async (paymentStatus: 'Pending' | 'Paid') => {
    if (!user) return;
    setPlacing(true);
    try {
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        doctorName: profile?.doctorName || 'Doctor',
        clinicName: profile?.clinicName || user.email,
        rmpNo: profile?.rmpNo || 'N/A',
        phone: profile?.phone || '',
        address: address.trim(),
        items: cart,
        subtotal: Number(subtotal.toFixed(2)),
        gstTotal: Number(gstTotal.toFixed(2)),
        grandTotal,
        paymentMode,
        paymentStatus,
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      });

      clearCart();
      alert('Order Confirmed! Aapka medicine dispatch schedule ho gaya hai.');
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
    if (!address.trim()) {
      return alert('Kripya Clinic ka delivery address dalein!');
    }

    if (paymentMode === 'ONLINE') {
      if (!window.Razorpay) {
        alert('Razorpay SDK load nahi hua hai. index.html me Razorpay script add karein ya COD/UPI chunein.');
        return;
      }
      const options = {
        key: 'YOUR_RAZORPAY_KEY_ID', // Apna Razorpay Live/Test Key dalein
        amount: grandTotal * 100,
        currency: 'INR',
        name: 'MedKart B2B Pharma',
        description: `Medicine Order - ${profile?.clinicName || 'Clinic'}`,
        handler: function () {
          finalizeOrder('Paid');
        },
        prefill: {
          name: profile?.doctorName || '',
          email: user.email || '',
          contact: profile?.phone || ''
        },
        theme: { color: '#2874f0' }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      finalizeOrder('Pending');
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
                <button
                  onClick={() => updateQty(item.id, -1)}
                  className="p-2 hover:bg-gray-100 text-gray-700"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3.5 font-bold text-sm">{item.qty}</span>
                <button
                  onClick={() => updateQty(item.id, 1)}
                  className="p-2 hover:bg-gray-100 text-gray-700"
                >
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

      {/* Right: Billing Summary & Checkout */}
      <div className="bg-white p-5 rounded-md shadow-sm border border-gray-200/80 h-fit space-y-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider border-b pb-2.5">
          B2B Price & Margin Summary
        </h3>

        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Total MRP Value</span>
            <span>₹{totalMrp.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-800 font-medium">
            <span>Subtotal (RMP PTR)</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>GST Tax (Input Credit)</span>
            <span>+ ₹{gstTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-green-600 font-medium">
            <span>Delivery Charges</span>
            <span>FREE</span>
          </div>

          <div className="flex justify-between font-extrabold text-lg text-gray-900 border-t border-dashed pt-3">
            <span>Total Payable</span>
            <span>₹{grandTotal}</span>
          </div>

          {totalMarginSavings > 0 && (
            <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-2.5 rounded text-center border border-emerald-200">
              Your Clinic Profit Margin on this order: ₹{totalMarginSavings}
            </div>
          )}
        </div>

        {/* Delivery Address */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-[#2874f0]" /> Clinic Delivery Address *
          </label>
          <textarea
            rows={2}
            placeholder="Clinic Name, Road, Landmark, District, Pincode..."
            className="w-full border border-gray-300 p-2 rounded-sm text-xs focus:border-[#2874f0] focus:outline-none"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* Payment Options */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-[#2874f0]" /> Select Payment Option
          </label>
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 p-2.5 border rounded-sm cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="pay"
                checked={paymentMode === 'COD'}
                onChange={() => setPaymentMode('COD')}
              />
              <span className="font-semibold">Cash on Delivery (COD)</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 border rounded-sm cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="pay"
                checked={paymentMode === 'UPI_DELIVERY'}
                onChange={() => setPaymentMode('UPI_DELIVERY')}
              />
              <span className="font-semibold">UPI / QR Scan on Delivery</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 border rounded-sm cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="pay"
                checked={paymentMode === 'ONLINE'}
                onChange={() => setPaymentMode('ONLINE')}
              />
              <span className="font-semibold">Pay Online Now (UPI / Card / Netbanking)</span>
            </label>
          </div>
        </div>

        <button
          disabled={placing}
          onClick={handlePlaceOrder}
          className="w-full bg-[#fb641b] hover:bg-[#e85810] text-white font-bold py-3.5 rounded-sm shadow transition uppercase tracking-wide text-sm"
        >
          {placing ? 'Processing Order...' : `Place Order • ₹${grandTotal}`}
        </button>

        <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-4 h-4 text-green-600" /> Safe & GST Compliant Wholesale Billing
        </p>
      </div>
    </div>
  );
}
