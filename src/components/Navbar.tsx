import React from 'react';
import { Search, ShoppingCart, Package, LogOut, Pill, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export type PageView = 'store' | 'cart' | 'orders' | 'admin' | 'auth';

interface NavbarProps {
  search: string;
  setSearch: (val: string) => void;
  activeView: PageView;
  setActiveView: (view: PageView) => void;
}

export default function Navbar({ search, setSearch, activeView, setActiveView }: NavbarProps) {
  const { user, profile, isAdmin, logout } = useAuth();
  const { totalItems } = useCart();

  const handleLogout = async () => {
    await logout();
    setActiveView('store');
    alert('Successfully Logged Out!');
  };

  return (
    <header className="bg-[#2874f0] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Brand Logo */}
        <button
          onClick={() => setActiveView('store')}
          className="flex items-center gap-2 text-left focus:outline-none"
        >
          <div className="bg-white p-1.5 rounded-md">
            <Pill className="w-6 h-6 text-[#2874f0]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-none">
              MedKart <span className="text-yellow-300 italic text-sm font-extrabold">B2B</span>
            </h1>
            <p className="text-[10px] text-blue-100 tracking-wide">Wholesale Pharma for RMP</p>
          </div>
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl order-3 md:order-2 w-full">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search Medicine Brand (Dolo 650), Salt (Paracetamol), or Company..."
              className="w-full py-2 px-4 pr-10 rounded-sm bg-white text-gray-800 text-sm focus:outline-none shadow-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (activeView !== 'store') setActiveView('store');
              }}
            />
            <Search className="w-5 h-5 text-[#2874f0] absolute right-3 pointer-events-none" />
          </div>
        </div>

        {/* Right Navigation */}
        <div className="flex items-center gap-2 sm:gap-3 order-2 md:order-3 text-xs sm:text-sm font-medium">
          {isAdmin && (
            <button
              onClick={() => setActiveView('admin')}
              className={`px-2.5 py-1.5 rounded-sm font-bold flex items-center gap-1 transition ${
                activeView === 'admin'
                  ? 'bg-yellow-300 text-blue-950'
                  : 'bg-yellow-400 text-blue-900 hover:bg-yellow-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}

          {user ? (
            <>
              <div className="hidden lg:flex flex-col items-end leading-tight mr-1">
                <span className="text-xs font-bold flex items-center gap-1">
                  {profile?.clinicName || user.email}
                  {profile?.verified && <ShieldCheck className="w-3.5 h-3.5 text-yellow-300" />}
                </span>
                <span className="text-[10px] text-blue-100">RMP: {profile?.rmpNo || 'Verified'}</span>
              </div>

              <button
                onClick={() => setActiveView('orders')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-sm hover:bg-blue-700 ${
                  activeView === 'orders' ? 'bg-blue-800' : ''
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Orders</span>
              </button>

              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1.5 rounded-sm font-bold flex items-center gap-1 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveView('auth')}
              className="bg-white text-[#2874f0] px-4 py-1.5 rounded-sm font-bold hover:bg-blue-50 shadow-sm"
            >
              RMP Login
            </button>
          )}

          {/* Cart Button */}
          <button
            onClick={() => setActiveView('cart')}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm hover:bg-blue-700 font-semibold ${
              activeView === 'cart' ? 'bg-blue-800' : ''
            }`}
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && (
              <span className="bg-[#ff6161] text-white text-[11px] font-bold px-1.5 rounded-full border border-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
