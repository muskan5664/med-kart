import React from 'react';
import {
  ShoppingCart,
  Package,
  LogOut,
  LayoutDashboard,
  Search,
  MessageCircle,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export type PageView = 'store' | 'cart' | 'orders' | 'admin' | 'auth';

interface NavbarProps {
  search: string;
  setSearch: (val: string) => void;
  activeView: PageView;
  setActiveView: (view: PageView) => void;
}

export default function Navbar({ activeView, setActiveView }: NavbarProps) {
  const { user, isAdmin, logout } = useAuth();
  const { totalItems } = useCart();

  const handleLogout = async () => {
    await logout();
    setActiveView('store');
  };

  const focusSearchBox = () => {
    if (activeView !== 'store') setActiveView('store');
    setTimeout(() => {
      document.getElementById('main-med-search')?.focus();
    }, 100);
  };

  return (
    <header className="bg-gradient-to-b from-[#0b49b8] to-[#155ed6] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-3 pt-2.5 pb-2">
        {/* Row 1: Brand Logo + WhatsApp Support Pill */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setActiveView('store')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-emerald-300 shrink-0">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#155ed6] to-emerald-500 flex items-center justify-center">
                <Plus className="w-5 h-5 text-white stroke-[3.5]" />
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">
                <span className="text-white">RMP </span>
                <span className="text-yellow-300">Store</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-blue-100 font-medium mt-0.5">
                क्लिनिक के लिए दवाइयों का भरोसेमंद साथी
              </p>
            </div>
          </button>

          {/* WhatsApp Support Badge */}
          <a
            href="https://wa.me/916203803959?text=Namaste%20RMP%20Store,%20mujhe%20medicine%20order%20ke%20baare%20me%20jaankari%20chahiye."
            target="_blank"
            rel="noreferrer"
            className="bg-[#19a84b] hover:bg-[#158f3f] text-white px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow border border-white/25 shrink-0"
          >
            <div className="bg-white text-[#19a84b] p-1 rounded-full">
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
            </div>
            <div className="leading-tight text-left">
              <p className="text-[9px] text-emerald-100 font-semibold">सहायता के लिए WhatsApp करें</p>
              <p className="text-xs font-extrabold tracking-wide">6203803959</p>
            </div>
          </a>
        </div>

        {/* Row 2: Admin / Orders / Logout / Cart / Search Quick Bar */}
        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/15">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
            {isAdmin && (
              <button
                onClick={() => setActiveView('admin')}
                className={`px-3 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition shrink-0 ${
                  activeView === 'admin'
                    ? 'bg-yellow-300 text-blue-950 ring-2 ring-white'
                    : 'bg-[#facc15] hover:bg-yellow-300 text-blue-950'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>एडमिन</span>
              </button>
            )}

            {user ? (
              <>
                <button
                  onClick={() => setActiveView('orders')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                    activeView === 'orders'
                      ? 'bg-white text-[#155ed6]'
                      : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>ऑर्डर देखें</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="bg-[#e53935] hover:bg-red-700 text-white px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>लॉगआउट</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveView('auth')}
                className="bg-yellow-300 hover:bg-yellow-200 text-blue-950 px-3.5 py-1.5 rounded-md text-xs font-extrabold shadow-sm shrink-0"
              >
                RMP लॉगिन / रजिस्टर
              </button>
            )}
          </div>

          {/* Right Cart & Search Icons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveView('cart')}
              className="relative bg-white/15 hover:bg-white/25 p-2 rounded-lg transition"
              title="Cart"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {totalItems}
                </span>
              )}
            </button>

            <button
              onClick={focusSearchBox}
              className="bg-white text-[#155ed6] p-2 rounded-full shadow hover:bg-blue-50 transition"
              title="Search Medicine"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
