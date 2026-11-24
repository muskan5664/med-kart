import React, { useState } from 'react';
import { Plus, Minus, ShoppingCart, Pill } from 'lucide-react';
import { Medicine } from '../types';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  item: Medicine;
  onSelect?: (item: Medicine) => void;
}

export default function ProductCard({ item, onSelect }: ProductCardProps) {
  const { cart, addToCart, updateQty } = useCart();
  const [imgFailed, setImgFailed] = useState(false);
  const inCart = cart.find((c) => c.id === item.id);

  const showImage = Boolean(item.imageUrl) && !imgFailed;

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 overflow-hidden flex flex-col justify-between">
      {/* Clickable Top Area -> Opens Full Product Details */}
      <div
        onClick={() => onSelect?.(item)}
        className="cursor-pointer group"
      >
        <div className="w-full h-28 sm:h-36 bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-2 border-b border-gray-100 relative">
          {showImage ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-blue-200">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <Pill className="w-6 h-6 text-[#155ed6]" />
              </div>
              <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase">{item.category}</span>
            </div>
          )}

          <span className="absolute top-1.5 right-1.5 bg-blue-50 text-[#155ed6] text-[9px] font-bold px-1.5 py-0.5 rounded">
            {item.packing || '1 Strip'}
          </span>
        </div>

        <div className="p-2.5 sm:p-3">
          <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm leading-snug line-clamp-1 group-hover:text-[#155ed6]" title={item.name}>
            {item.name}
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1" title={item.salt}>
            {item.salt}
          </p>

          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-base sm:text-lg font-extrabold text-[#155ed6]">
              ₹{item.ptr.toFixed(2)}
            </span>
            <span className="text-[11px] text-gray-400 line-through">
              MRP ₹{item.mrp.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Cart Controls */}
      <div className="p-2 pt-0">
        {inCart ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-lg p-1">
              <button
                onClick={() => updateQty(item.id, -1)}
                className="p-1 bg-white rounded shadow-sm text-emerald-700 hover:bg-emerald-100"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-extrabold text-emerald-900 text-xs">{inCart.qty} यूनिट</span>
              <button
                onClick={() => updateQty(item.id, 1)}
                className="p-1 bg-white rounded shadow-sm text-emerald-700 hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => updateQty(item.id, 5)}
                className="text-[10px] font-bold py-0.5 bg-gray-100 hover:bg-blue-50 text-gray-700 rounded"
              >
                +5 और
              </button>
              <button
                onClick={() => updateQty(item.id, 10)}
                className="text-[10px] font-bold py-0.5 bg-gray-100 hover:bg-blue-50 text-gray-700 rounded"
              >
                +10 बॉक्स
              </button>
            </div>
          </div>
        ) : (
          <button
            disabled={item.stock <= 0}
            onClick={() => addToCart(item)}
            className="w-full bg-[#249b3e] hover:bg-[#1e8334] disabled:bg-gray-300 text-white font-bold py-2 px-2 rounded-lg text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 transition"
          >
            <ShoppingCart className="w-3.5 h-3.5 fill-current" />
            <span>{item.stock > 0 ? 'कार्ट में डालें' : 'स्टॉक खत्म'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
