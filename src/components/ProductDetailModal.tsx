import React from 'react';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Share2,
  Pill,
  Home,
  ShieldCheck,
  Building2,
  PackageCheck,
  Percent,
  CheckCircle2,
  Plus,
  Minus
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
  onGoToCart,
  onSearchClick
}: ProductDetailModalProps) {
  const { cart, addToCart, updateQty, totalItems } = useCart();
  const { profile } = useAuth();

  const inCart = cart.find((c) => c.id === item.id);
  const marginPercent = Math.max(0, Math.round(((item.mrp - item.ptr) / item.mrp) * 100));
  const profitPerUnit = Math.max(0, item.mrp - item.ptr).toFixed(2);

  const handleBuyNow = () => {
    if (!inCart) {
      addToCart(item);
    }
    onClose();
    onGoToCart();
  };

  const handleShare = () => {
    const shareText = `${item.name} (${item.salt}) - Wholesale PTR: ₹${item.ptr.toFixed(2)} (MRP ₹${item.mrp}) on RMP Store!`;
    if (navigator.share) {
      navigator.share({ title: item.name, text: shareText, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareText);
      alert('Medicine details copied to clipboard!');
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
      className="bg-white flex flex-col overflow-y-auto animate-fadeIn"
    >
      {/* 1. Top Flipkart-Style Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-3 py-2.5 flex items-center gap-2.5 shadow-sm">
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-800 shrink-0"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            onClose();
            onSearchClick();
          }}
          className="flex-1 flex items-center gap-2 border border-blue-400 rounded-full px-3.5 py-1.5 text-left text-xs text-gray-500 bg-blue-50/30"
        >
          <Search className="w-4 h-4 text-[#155ed6] shrink-0" />
          <span className="truncate">दवा का नाम या सॉल्ट खोजें...</span>
        </button>

        <button
          onClick={() => {
            onClose();
            onGoToCart();
          }}
          className="relative p-2 text-gray-800 hover:bg-gray-100 rounded-full shrink-0"
        >
          <ShoppingCart className="w-5 h-5" />
          {totalItems > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[10px] font-extrabold px-1.5 rounded-full">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* 2. Main Scrollable Content */}
      <div className="flex-1 pb-24 max-w-3xl w-full mx-auto">
        {/* Large Product Image Area */}
        <div className="relative w-full h-72 sm:h-80 bg-gradient-to-b from-slate-50 to-white border-b border-gray-200 flex items-center justify-center p-6">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="max-h-full max-w-full object-contain drop-shadow-sm"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                <Pill className="w-12 h-12 text-[#155ed6]" />
              </div>
              <span className="text-xs font-bold text-gray-500 mt-2 uppercase">{item.category}</span>
            </div>
          )}

          {/* Top-Right Share Icon */}
          <button
            onClick={handleShare}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white p-2 rounded-full shadow border border-gray-200 text-gray-700"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Bottom-Left Verified Badge */}
          <div className="absolute bottom-3 left-3 bg-white/95 px-2.5 py-1 rounded-md shadow-sm border border-gray-200 flex items-center gap-1 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Genuine Stock</span>
          </div>

          {/* Bottom-Right Expiry Pill (Exact Flipkart style) */}
          <div className="absolute bottom-3 right-3 bg-gray-800/90 text-white px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm">
            Expiry {item.expiry || '12/2028'}
          </div>
        </div>

        {/* 3. Title, Company, Composition & Price Section */}
        <div className="p-4 space-y-2 border-b-8 border-gray-100">
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">
            {item.company}
          </p>
          <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">
            {item.name}{' '}
            <span className="text-sm font-semibold text-gray-500">({item.packing || '1 Strip'})</span>
          </h1>

          {/* Composition / Salt Box */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-950 font-semibold">
            <span className="text-[#155ed6] font-extrabold">Salt / Composition: </span>
            {item.salt}
          </div>

          {/* Price & Discount Row (Flipkart Green % + Strikethrough MRP + PTR) */}
          <div className="pt-2 flex items-baseline gap-2.5 flex-wrap">
            {marginPercent > 0 && (
              <span className="text-lg sm:text-xl font-extrabold text-[#19a84b]">
                ↓{marginPercent}% off
              </span>
            )}
            <span className="text-base text-gray-400 line-through font-semibold">
              ₹{item.mrp.toFixed(2)}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-gray-900">
              ₹{item.ptr.toFixed(2)}
            </span>
          </div>

          <p className="text-xs font-bold text-emerald-700">
            क्लिनिक मुनाफा (Clinic Margin): ₹{profitPerUnit} प्रति पैक • +{item.gst || 12}% GST
          </p>
        </div>

        {/* 4. Delivery Details Section */}
        <div className="p-4 space-y-2.5 border-b-8 border-gray-100">
          <h2 className="text-sm font-extrabold text-gray-900">Delivery details</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2.5 text-xs">
            <Home className="w-4 h-4 text-[#155ed6] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-800 truncate">
                {profile?.clinicName ? `${profile.clinicName} — ` : 'CLINIC DELIVERY — '}
                <span className="font-normal text-gray-600">
                  {profile?.address || 'Giridih, Jharkhand (Same-Day / Next-Day Dispatch)'}
                </span>
              </p>
              <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                ✓ Express Wholesale Delivery Available • Cash on Delivery / UPI
              </p>
            </div>
          </div>
        </div>

        {/* 5. Medicine Specifications Table */}
        <div className="p-4 space-y-3">
          <h2 className="text-sm font-extrabold text-gray-900">Medicine Specifications</h2>
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 text-xs">
            <div className="p-3 flex justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" /> Manufacturer / Company
              </span>
              <span className="font-bold text-gray-900 text-right">{item.company}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-gray-400" /> Pack Size
              </span>
              <span className="font-bold text-gray-900">{item.packing || '1 Strip'}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-gray-400" /> Applicable GST
              </span>
              <span className="font-bold text-gray-900">{item.gst || 12}% GST</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gray-400" /> Stock Status
              </span>
              <span className={`font-bold ${item.stock > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {item.stock > 0 ? `In Stock (${item.stock} Units)` : 'Out of Stock'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Sticky Bottom Flipkart-Style Action Bar ("Add to cart" + Yellow "Buy now") */}
      <div
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10001 }}
        className="bg-white border-t border-gray-200 p-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
      >
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-2.5">
          {inCart ? (
            <div className="flex items-center justify-between border-2 border-[#155ed6] bg-blue-50 rounded-lg px-2 py-1.5">
              <button
                onClick={() => updateQty(item.id, -1)}
                className="p-1.5 bg-white rounded shadow-sm text-[#155ed6]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-sm text-blue-950">{inCart.qty} in Cart</span>
              <button
                onClick={() => updateQty(item.id, 1)}
                className="p-1.5 bg-white rounded shadow-sm text-[#155ed6]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              disabled={item.stock <= 0}
              onClick={() => addToCart(item)}
              className="w-full py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-extrabold text-sm shadow-sm transition"
            >
              Add to cart
            </button>
          )}

          <button
            disabled={item.stock <= 0}
            onClick={handleBuyNow}
            className="w-full py-3 rounded-lg bg-[#ffc200] hover:bg-[#f5b800] disabled:bg-gray-300 text-gray-950 font-extrabold text-sm shadow-sm transition"
          >
            Buy now
          </button>
        </div>
      </div>
    </div>
  );
}
