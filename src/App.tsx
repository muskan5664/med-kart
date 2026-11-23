import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar, { PageView } from './components/Navbar';
import StorePage from './pages/StorePage';
import CartPage from './pages/CartPage';
import AuthPage from './pages/AuthPage';
import OrdersPage from './pages/OrdersPage';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<PageView>('store');

  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen bg-[#f1f3f6] font-sans text-gray-900 flex flex-col">
          <Navbar
            search={search}
            setSearch={setSearch}
            activeView={activeView}
            setActiveView={setActiveView}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-5">
            {activeView === 'store' && <StorePage search={search} />}
            {activeView === 'cart' && <CartPage setActiveView={setActiveView} />}
            {activeView === 'auth' && <AuthPage setActiveView={setActiveView} />}
            {activeView === 'orders' && <OrdersPage />}
            {activeView === 'admin' && <AdminPanel />}
          </main>

          <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-500 mt-10">
            MedKart B2B Wholesale Pharma Portal • Exclusively for Registered Medical Practitioners (RMP)
          </footer>
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
