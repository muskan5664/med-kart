import React from 'react';
import { Trash2, Plus, Minus, ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { PageView } from '../components/Navbar';

interface CartPageProps {
  setActiveView: (view: PageView) => void;
}

export default function CartPage({ setActiveView }: CartPageProps) {
  const { cart, updateQty, removeFromCart, subtotal, gstTotal, grandTotal } = useCart();
  const { user } = useAuth();

  const totalMrp = cart.reduce((sum, item) => sum + item.mrp * item.qty, 0);
  const totalMarginSavings = Math.max(0, Math.round(totalMrp - grandTotal));

  const handleProceedToAddress = () => {
    if (!user) {
      alert('ऑर्डर करने के लिए पहले RMP लॉगिन करें।');
      return setActiveView('auth');
    }
    setActiveView('address');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (cart.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm text-center max-w-lg mx-auto mt-8 border">
        <ShoppingBag className="w-12 h-12 text-blue-200 mx-auto mb-3" />
        <h2 className="text-xl font-extrabold text-gray-800">आपका कार्ट खाली है</h2>
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
      {/* Step Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-extrabold text-[#155ed6] uppercase">Step 1 of 3</span>
          <h2 className="text-lg font-black text-gray-900">आपका कार्ट ({cart.length} दवाइयाँ)</h2>
        </div>
        <button
          onClick={() => setActiveView('store')}
          className="text-xs font-extrabold text-[#155ed6] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
        >
          + और जोड़ें
        </button>
      </div>

      {/* Cart Items List */}
      <div className="space-y-3">
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
      </div>

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

      {/* Next Page Button -> Address Page */}
      <button
        onClick={handleProceedToAddress}
        className="w-full bg-[#249b3e] hover:bg-[#1e8334] text-white font-extrabold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition"
      >
        <span>आगे बढ़ें: डिलीवरी पता भरें</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
