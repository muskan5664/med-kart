import React, { Suspense, lazy, useState } from 'react';
import { Home, LayoutGrid, ShoppingCart, Headphones, MoreHorizontal } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import Navbar, { PageView } from './components/Navbar';
import StorePage from './pages/StorePage';
import CartPage from './pages/CartPage';
import AddressPage, { DeliveryDetails } from './pages/AddressPage';
import PaymentPage from './pages/PaymentPage';
import OrdersPage from './pages/OrdersPage';
import AuthPage from './pages/AuthPage';
const AdminPanel = lazy(() => import('./components/AdminPanel'));

function MainAppContent() {
  const [search, setSearch] = useState<string>('');
  const [activeView, setActiveView] = useState<PageView>('store');
  const [delivery, setDelivery] = useState<DeliveryDetails>({
    doctorName: '',
    clinicName: '',
    phone: '',
    address: ''
  });

  const { totalItems } = useCart();
  const { user, isAdmin } = useAuth();

  const handleCategoryJump = () => {
    setActiveView('store');
    setTimeout(() => {
      document.getElementById('category-strip')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleMoreClick = () => {
    if (isAdmin) {
      setActiveView('admin');
    } else if (user) {
      setActiveView('orders');
    } else {
      setActiveView('auth');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans text-gray-900 pb-20">
      <Navbar
        search={search}
        setSearch={setSearch}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-4 py-3 sm:py-5">
        {activeView === 'store' && (
          <StorePage search={search} setSearch={setSearch} setActiveView={setActiveView} />
        )}
        {activeView === 'cart' && <CartPage setActiveView={setActiveView} />}
        {activeView === 'address' && (
          <AddressPage
            delivery={delivery}
            setDelivery={setDelivery}
            setActiveView={setActiveView}
          />
        )}
        {activeView === 'payment' && (
          <PaymentPage delivery={delivery} setActiveView={setActiveView} />
        )}
        {activeView === 'orders' && <OrdersPage />}
        {activeView === 'auth' && <AuthPage setActiveView={setActiveView} />}
        {activeView === 'admin' && (
          <Suspense fallback={<div className="p-8 text-center text-gray-500">Admin panel load ho raha hai...</div>}>
            <AdminPanel />
          </Suspense>
        )}
      </main>

      {/* Bottom Fixed Navigation Bar */}
      <nav
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}
        className="bg-white border-t border-gray-300 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] grid grid-cols-5 py-2 text-[11px] font-extrabold"
      >
        <button
          type="button"
          onClick={() => setActiveView('store')}
          className={`flex flex-col items-center justify-center gap-0.5 ${
            activeView === 'store' ? 'text-[#155ed6]' : 'text-gray-700'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>होम</span>
        </button>

        <button
          type="button"
          onClick={handleCategoryJump}
          className="flex flex-col items-center justify-center gap-0.5 text-gray-700 hover:text-[#155ed6]"
        >
          <LayoutGrid className="w-5 h-5" />
          <span>कैटेगरी</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('cart')}
          className={`flex flex-col items-center justify-center gap-0.5 ${
            activeView === 'cart' || activeView === 'address' || activeView === 'payment'
              ? 'text-[#155ed6]'
              : 'text-gray-700'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-2.5 bg-red-600 text-white text-[10px] font-extrabold px-1.5 rounded-full">
              {totalItems}
            </span>
          </div>
          <span>कार्ट</span>
        </button>

        <a
          href="https://wa.me/916203803959"
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center gap-0.5 text-gray-700 hover:text-[#19a84b]"
        >
          <Headphones className="w-5 h-5" />
          <span>सपोर्ट</span>
        </a>

        <button
          type="button"
          onClick={handleMoreClick}
          className={`flex flex-col items-center justify-center gap-0.5 ${
            activeView === 'admin' || activeView === 'orders' || activeView === 'auth'
              ? 'text-[#155ed6]'
              : 'text-gray-700'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>और अधिक</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainAppContent />
      </CartProvider>
    </AuthProvider>
  );
}
