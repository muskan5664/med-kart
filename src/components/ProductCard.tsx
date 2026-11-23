import React from 'react';
import { Plus, Minus, Building2, Calendar, PackageCheck } from 'lucide-react';
import { Medicine } from '../types';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  item: Medicine;
}

export default function ProductCard({ item }: ProductCardProps) {
  const { cart, addToCart, updateQty } = useCart();
  const inCart = cart.find((c) => c.id === item.id);

  // Doctor profit margin calculation
  const marginPercent = Math.round(((item.mrp - item.ptr) / item.mrp) * 100);
  const profitPerUnit = (item.mrp - item.ptr).toFixed(2);

  return (
    <div className="bg-white rounded-md shadow-sm hover:shadow-lg transition-all duration-200 p-4 flex flex-col justify-between border border-gray-200/80 group">
      <div>
        {/* Top Badges: Category & Profit Margin */}
        <div className="flex justify-between items-center gap-2 mb-2.5">
          <span className="text-[11px] bg-blue-50 text-[#2874f0] px-2.5 py-0.5 rounded-sm font-semibold uppercase tracking-wider">
            {item.category}
          </span>
          <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-sm font-bold">
            {marginPercent}% Margin (Save ₹{profitPerUnit})
          </span>
        </div>

        {/* Brand & Salt Name */}
        <h3 className="font-bold text-gray-900 text-base group-hover:text-[#2874f0] transition-colors line-clamp-1">
          {item.name}
        </h3>
        <p className="text-xs text-gray-600 font-medium mt-0.5 line-clamp-1" title={item.salt}>
          {item.salt}
        </p>

        {/* Meta Info: Company, Packing, Expiry */}
        <div className="mt-3 space-y-1 text-[11px] text-gray-500 bg-gray-50 p-2 rounded">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{item.company}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <PackageCheck className="w-3.5 h-3.5 text-gray-400" />
              {item.packing || '1 Strip'}
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              Exp: {item.expiry}
            </span>
          </div>
        </div>
      </div>

      {/* Pricing & Bulk Add Controls */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-gray-900">₹{item.ptr.toFixed(2)}</span>
              <span className="text-xs text-gray-400 line-through">MRP ₹{item.mrp.toFixed(2)}</span>
            </div>
            <span className="text-[10px] text-gray-500">
              RMP Rate (PTR) + {item.gst || 12}% GST
            </span>
          </div>
          <span className="text-[11px] font-semibold text-green-600">
            {item.stock > 0 ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>

        {inCart ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-sm p-1">
              <button
                onClick={() => updateQty(item.id, -1)}
                className="p-1.5 bg-white rounded-sm shadow-sm text-[#2874f0] hover:bg-blue-100"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold text-blue-950 text-sm">{inCart.qty} Units</span>
              <button
                onClick={() => updateQty(item.id, 1)}
                className="p-1.5 bg-white rounded-sm shadow-sm text-[#2874f0] hover:bg-blue-100"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {/* Quick Bulk Add Buttons for Doctors */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => updateQty(item.id, 5)}
                className="text-[11px] font-bold py-1 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-[#2874f0] rounded-sm transition"
              >
                +5 More
              </button>
              <button
                onClick={() => updateQty(item.id, 10)}
                className="text-[11px] font-bold py-1 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-[#2874f0] rounded-sm transition"
              >
                +10 Box
              </button>
            </div>
          </div>
        ) : (
          <button
            disabled={item.stock <= 0}
            onClick={() => addToCart(item)}
            className="w-full bg-[#fb641b] hover:bg-[#e85810] disabled:bg-gray-300 text-white font-bold py-2.5 rounded-sm text-sm shadow-sm transition uppercase tracking-wide"
          >
            {item.stock > 0 ? 'Add to Order' : 'Out of Stock'}
          </button>
        )}
      </div>
    </div>
  );
}
