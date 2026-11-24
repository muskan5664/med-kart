import React, { useState } from 'react';
import {
  ArrowLeft,
  ShoppingCart,
  Share2,
  Pill,
  MapPin,
  ShieldCheck,
  Building2,
  PackageCheck,
  Percent,
  CheckCircle2,
  Plus,
  Minus,
  Calendar,
  Zap
} from 'lucide-react';
import { Medicine } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface ProductDetailModalProps {
  item: Medicine;
  onClose: () => void;
  onGoToCart: () => void;
  onSearchClick: () => void;
}

export default function ProductDetailModal({
  item,
  onClose,
  onGoToCart
}: ProductDetailModalProps) {
  const { cart, addToCart, updateQty, totalItems } = useCart();
  const { profile } = useAuth();
  const [imgFailed, setImgFailed] = useState(false);

  const inCart = cart.find((c) => c.id === item.id);
  const marginPercent = Math.max(0, Math.round(((item.mrp - item.ptr) / item.mrp) * 100));
  const profitPerUnit = Math.max(0, item.mrp - item.ptr).toFixed(2);
  const showImage = Boolean(item.imageUrl) && !imgFailed;

  const handleBuyNow = () => {
    if (!inCart) {
      addToCart(item);
    }
    onClose();
    onGoToCart();
  };

  const handleShare = () => {
    const shareText = `${item.name} (${item.salt}) - RMP Wholesale Rate: ₹${item.ptr.toFixed(2)} (MRP ₹${item.mrp}) | RMP Store`;
    if (navigator.share) {
      navigator.share({ title: item.name, text: shareText, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareText);
      alert('दवा की जानकारी कॉपी हो गई है!');
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
      className="bg-[#f1f5f9] flex flex-col overflow-y-auto"
    >
      {/* 1. RMP Store Royal Blue Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-[#0b49b8] to-[#155ed6] text-white px-3 py-3 flex items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white shrink-0"
            title="वापस जाएं"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] text-yellow-300 font-extrabold uppercase tracking-wider leading-none">
              RMP Store • दवा विवरण
            </p>
            <h2 className="text-sm sm:text-base font-extrabold truncate mt-0.5">
              {item.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShare}
            className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white"
            title="शेयर करें"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              onClose();
              onGoToCart();
            }}
            className="relative p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white"
            title="कार्ट देखें"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Scrollable Content */}
      <div className="flex-1 pb-24 max-w-3xl w-full mx-auto p-3 space-y-3">
        {/* Large Medicine Photo Card */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 relative flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-2">
            <span className="bg-blue-50 text-[#155ed6] border border-blue-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
              {item.category}
            </span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> असली थोक स्टॉक
            </span>
          </div>

          <div className="w-full h-64 sm:h-72 flex items-center justify-center my-1">
            {showImage ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                onError={() => setImgFailed(true)}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                  <Pill className="w-12 h-12 text-[#155ed6]" />
                </div>
                <span className="text-xs font-bold text-gray-400 mt-2">फोटो उपलब्ध नहीं है</span>
              </div>
            )}
          </div>

          <div className="w-full flex justify-between items-center pt-2 border-t border-gray-100 text-[11px] font-bold">
            <span className="text-gray-500 flex items-center gap-1">
              <PackageCheck className="w-3.5 h-3.5 text-[#155ed6]" /> पैकिंग: {item.packing || '1 Strip'}
            </span>
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Exp: {item.expiry || '12/2028'}
            </span>
          </div>
        </div>

        {/* 3. Medicine Name, Salt & Wholesale Rate Card */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 space-y-3">
          <div>
            <p className="text-xs font-extrabold text-[#155ed6] uppercase tracking-wide">
              {item.company}
            </p>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">
              {item.name}
            </h1>
          </div>

          {/* Salt / Composition Box */}
          <div className="bg-[#eef6ff] border border-blue-200 rounded-xl p-3 text-xs">
            <span className="font-extrabold text-[#0f387a] block mb-0.5">
              सॉल्ट / फॉर्मूला (Composition):
            </span>
            <span className="text-gray-800 font-semibold">{item.salt}</span>
          </div>

          {/* Wholesale Rate & Clinic Profit Box */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-gray-500">क्लिनिक थोक रेट (RMP PTR)</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-[#155ed6]">
                  ₹{item.ptr.toFixed(2)}
                </span>
                <span className="text-xs sm:text-sm text-gray-400 line-through font-bold">
                  MRP ₹{item.mrp.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">+{item.gst || 12}% GST लागू</p>
            </div>

            {marginPercent > 0 && (
              <div className="bg-[#249b3e] text-white px-3 py-2 rounded-xl text-center shadow-sm">
                <p className="text-sm font-black">{marginPercent}% मार्जिन</p>
                <p className="text-[10px] font-semibold">बचत ₹{profitPerUnit}/पैक</p>
              </div>
            )}
          </div>

          {/* Bulk Order Quick Add Buttons */}
          <div className="pt-1">
            <p className="text-xs font-extrabold text-gray-700 mb-2">
              थोक मात्रा चुनें (Quick Bulk Add):
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs font-extrabold">
              <button
                type="button"
                onClick={() => (inCart ? updateQty(item.id, 5) : addToCart(item))}
                className="py-2 px-2 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-[#155ed6]"
              >
                +5 स्ट्रिप / पैक
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!inCart) addToCart(item);
                  updateQty(item.id, inCart ? 10 : 9);
                }}
                className="py-2 px-2 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-[#155ed6]"
              >
                +10 बॉक्स
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!inCart) addToCart(item);
                  updateQty(item.id, inCart ? 20 : 19);
                }}
                className="py-2 px-2 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-[#155ed6]"
              >
                +20 थोक पैक
              </button>
            </div>
          </div>
        </div>

        {/* 4. Clinic Delivery & Specifications Card */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 space-y-3 text-xs">
          <div className="flex items-start gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <MapPin className="w-4 h-4 text-[#155ed6] shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-gray-900">
                डिलीवरी पता: {profile?.clinicName || 'आपके क्लिनिक पर'}
              </p>
              <p className="text-gray-600 mt-0.5">
                {profile?.address || 'तेज़ थोक डिलीवरी • कैश ऑन डिलीवरी (COD) और UPI उपलब्ध'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
            <div className="p-2.5 flex justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#155ed6]" /> कंपनी (Company)
              </span>
              <span className="font-bold text-gray-900">{item.company}</span>
            </div>
            <div className="p-2.5 flex justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-[#155ed6]" /> जीएसटी (GST)
              </span>
              <span className="font-bold text-gray-900">{item.gst || 12}%</span>
            </div>
            <div className="p-2.5 flex justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#155ed6]" /> स्टॉक स्थिति
              </span>
              <span className={`font-bold ${item.stock > 0 ? 'text-[#249b3e]' : 'text-red-600'}`}>
                {item.stock > 0 ? `उपलब्ध (${item.stock} यूनिट)` : 'स्टॉक खत्म'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Sticky Bottom Action Bar */}
      <div
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10001 }}
        className="bg-white border-t border-gray-200 p-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
      >
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-2.5">
          {inCart ? (
            <div className="flex items-center justify-between border-2 border-[#249b3e] bg-emerald-50 rounded-xl px-2.5 py-1.5">
              <button
                onClick={() => updateQty(item.id, -1)}
                className="p-1.5 bg-white rounded-lg shadow-sm text-[#249b3e]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-sm text-emerald-950">{inCart.qty} यूनिट</span>
              <button
                onClick={() => updateQty(item.id, 1)}
                className="p-1.5 bg-white rounded-lg shadow-sm text-[#249b3e]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              disabled={item.stock <= 0}
              onClick={() => addToCart(item)}
              className="w-full py-3 rounded-xl bg-[#249b3e] hover:bg-[#1e8334] disabled:bg-gray-300 text-white font-extrabold text-sm shadow-sm flex items-center justify-center gap-1.5 transition"
            >
              <ShoppingCart className="w-4 h-4 fill-current" />
              <span>कार्ट में डालें</span>
            </button>
          )}

          <button
            disabled={item.stock <= 0}
            onClick={handleBuyNow}
            className="w-full py-3 rounded-xl bg-[#155ed6] hover:bg-[#0b49b8] disabled:bg-gray-300 text-white font-extrabold text-sm shadow-sm flex items-center justify-center gap-1.5 transition"
          >
            <Zap className="w-4 h-4 fill-current text-yellow-300" />
            <span>अभी ऑर्डर करें</span>
          </button>
        </div>
      </div>
    </div>
  );
}
