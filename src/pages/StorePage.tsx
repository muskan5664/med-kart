import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import {
  Search,
  CheckCircle2,
  Pill,
  FlaskConical,
  Droplets,
  Syringe,
  BadgeCheck,
  Truck,
  Handshake,
  Headphones,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';
import { db } from '../lib/firebase';
import { Medicine } from '../types';
import { INITIAL_MEDICINES } from '../data/initialMedicines';
import ProductCard from '../components/ProductCard';
import ProductDetailModal from '../components/ProductDetailModal';
import { PageView } from '../components/Navbar';

interface StorePageProps {
  search: string;
  setSearch: (val: string) => void;
  setActiveView?: (view: PageView) => void;
}

const ITEMS_PER_PAGE = 24;

function detectCategory(name: string, salt: string, company: string): string {
  const text = `${name} ${salt} ${company}`.toUpperCase();
  if (text.includes('(VET)') || text.includes('BOLUS') || text.includes('VETERINARY')) return 'Veterinary';
  if (text.includes('INJ') || text.includes('VIAL') || text.includes('AMP') || text.includes('INFUSION') || text.includes('500ML.')) return 'Injection';
  if (text.includes('DROP')) return 'Drops';
  if (text.includes('SYP') || text.includes('SYRUP') || text.includes('SUSP') || text.includes('LIQ') || text.includes('SOLN')) return 'Syrup';
  if (text.includes('CAP')) return 'Capsule';
  return 'Tablet';
}

export default function StorePage({ search, setSearch, setActiveView }: StorePageProps) {
  const [products, setProducts] = useState<Medicine[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);

  useEffect(() => {
    const fetchAllMedicines = async () => {
      try {
        let staticList: Medicine[] = [];
        try {
          const res = await fetch('/medicines.json');
          if (res.ok) {
            const rawData = await res.json();
            if (Array.isArray(rawData)) {
              const seenNames = new Map<string, Medicine>();
              rawData.forEach((row: any, index: number) => {
                if (Array.isArray(row)) {
                  const rawName = String(row[0] || '').trim();
                  const salt = row[1] ? String(row[1]).trim() : '';
                  const packing = row[2] ? String(row[2]).trim() : '1 Unit';
                  const company = row[3] ? String(row[3]).trim() : 'Standard Pharma';
                  const rawPrice = row[5] ? String(row[5]).replace(/[^0-9.]/g, '') : '';
                  const expiry = row[6] && row[6] !== '/' ? String(row[6]).trim() : '12/2028';
                  const closingStock = Number(row[10] ?? 50);

                  if (!rawName || !salt || rawName.includes('COD CHARGE') || rawName.includes('CASH ETRA')) return;

                  const mrp = parseFloat(rawPrice) || 50;
                  const ptr = Number((mrp * 0.75).toFixed(2));
                  const stock = closingStock > 0 ? Math.ceil(closingStock) : 50;
                  const key = `${rawName.toUpperCase()}_${packing.toUpperCase()}`;

                  if (!seenNames.has(key)) {
                    seenNames.set(key, {
                      id: `med-${index}`,
                      name: rawName,
                      salt,
                      company,
                      category: detectCategory(rawName, salt, company),
                      mrp,
                      ptr,
                      gst: 12,
                      stock,
                      expiry,
                      packing
                    });
                  }
                }
              });
              staticList = Array.from(seenNames.values());
            }
          }
        } catch (e) {
          console.warn('Error parsing medicines.json:', e);
        }

        let rawFsList: (Medicine & { hidden?: boolean })[] = [];
        try {
          const snap = await getDocs(collection(db, 'products'));
          rawFsList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine & { hidden?: boolean }));
        } catch (e) {
          console.warn('Firestore products load failed, using static catalog only:', e);
        }
        const fsIdSet = new Set(rawFsList.map((item) => item.id));
        const visibleFsList = rawFsList.filter((item) => !item.hidden);

        const combined = [
          ...visibleFsList,
          ...staticList.filter((item) => !fsIdSet.has(item.id))
        ];

        setProducts(
          combined.length > 0
            ? combined
            : INITIAL_MEDICINES.map((m, idx) => ({ ...m, id: `demo-${idx}` }))
        );
      } catch (err) {
        console.error('Error loading catalog:', err);
        setProducts(INITIAL_MEDICINES.map((m, idx) => ({ ...m, id: `demo-${idx}` })));
      } finally {
        setLoading(false);
      }
    };

    fetchAllMedicines();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category]);

  const categoryTabs = [
    { id: 'All', label: 'सभी दवाइयाँ', icon: Layers },
    { id: 'Tablet', label: 'Tablet', icon: Pill },
    { id: 'Capsule', label: 'Capsule', icon: Pill },
    { id: 'Syrup', label: 'Syrup', icon: FlaskConical },
    { id: 'Drops', label: 'Drops', icon: Droplets },
    { id: 'Injection', label: 'Injection', icon: Syringe }
  ];

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCat =
        category === 'All' ||
        p.category.toLowerCase().includes(category.toLowerCase());
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.salt.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, category, search]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-3.5 pb-16">
      {/* 1. HERO PROMO BANNER */}
      <div className="bg-gradient-to-r from-[#d8ecff] via-[#eef6ff] to-[#d8ecff] rounded-2xl p-3.5 sm:p-5 border border-blue-200 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-12 items-center gap-2">
          <div className="col-span-3 sm:col-span-2 flex justify-center">
            <img
              src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80"
              alt="RMP Doctor"
              className="w-20 h-24 sm:w-28 sm:h-32 object-cover rounded-xl border-2 border-white shadow"
            />
          </div>

          <div className="col-span-6 sm:col-span-7 text-center px-1">
            <span className="inline-block bg-[#0f489c] text-white text-[11px] sm:text-xs font-extrabold px-3 py-0.5 rounded-full shadow-sm">
              RMP <span className="text-yellow-300">Store</span>
            </span>
            <h2 className="text-base sm:text-2xl font-black text-[#0f387a] leading-tight mt-1">
              क्लिनिक के लिए
              <span className="block text-2xl sm:text-4xl text-[#d61f26] tracking-tight">
                दवाइयाँ
              </span>
            </h2>
            <div className="mt-1.5 inline-block bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-300 text-[#0f387a] text-[10px] sm:text-xs font-extrabold px-3 py-1 rounded-full border border-yellow-400 shadow-sm">
              अब थोक दाम पर दवाइयाँ मंगाना हुआ आसान !
            </div>
          </div>

          <div className="col-span-3 sm:col-span-3 space-y-1.5 text-[10px] sm:text-xs font-extrabold text-[#0f387a]">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-[#19a84b] shrink-0 fill-emerald-100" />
              <span>बेहतर थोक रेट</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-[#19a84b] shrink-0 fill-emerald-100" />
              <span>आसान ऑर्डर</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-[#19a84b] shrink-0 fill-emerald-100" />
              <span>नया स्टॉक</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. HINDI SEARCH BAR */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-300 flex items-center overflow-hidden">
        <div className="pl-3.5 text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          id="main-med-search"
          type="text"
          placeholder="दवा का नाम खोजें... (जैसे: Dolo, Paracetamol, Azithral)"
          className="w-full py-2.5 px-3 text-sm text-gray-800 focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="bg-[#155ed6] hover:bg-blue-800 text-white font-bold px-5 py-2.5 text-sm shrink-0 transition"
        >
          खोजें
        </button>
      </div>

      {/* 3. ICON CATEGORY PILLS */}
      <div id="category-strip" className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categoryTabs.map((tab) => {
          const IconComponent = tab.icon;
          const active = category === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-extrabold whitespace-nowrap transition shadow-sm ${
                active
                  ? 'bg-[#155ed6] text-white border-[#155ed6]'
                  : 'bg-white text-gray-800 border-gray-200 hover:bg-blue-50'
              }`}
            >
              <div className={`p-1 rounded-lg ${active ? 'bg-white/20' : 'bg-blue-50 text-[#155ed6]'}`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. 4-COLUMN TRUST STRIP */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2.5 grid grid-cols-4 gap-1.5 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
          <BadgeCheck className="w-6 h-6 text-[#155ed6] shrink-0" />
          <span className="text-[10px] sm:text-xs font-extrabold text-gray-800 leading-tight">
            बेस्ट रेट गारंटी
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 border-l border-gray-100">
          <Truck className="w-6 h-6 text-[#155ed6] shrink-0" />
          <span className="text-[10px] sm:text-xs font-extrabold text-gray-800 leading-tight">
            जल्दी डिलीवरी
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 border-l border-gray-100">
          <Handshake className="w-6 h-6 text-[#155ed6] shrink-0" />
          <span className="text-[10px] sm:text-xs font-extrabold text-gray-800 leading-tight">
            विश्वसनीय सप्लायर
          </span>
        </div>
        <a
          href="tel:6203803959"
          className="flex flex-col sm:flex-row items-center justify-center gap-1.5 border-l border-gray-100 hover:opacity-80"
        >
          <Headphones className="w-6 h-6 text-[#155ed6] shrink-0" />
          <span className="text-[10px] sm:text-xs font-extrabold text-gray-800 leading-tight">
            सहयोग हेतु कॉल करें
          </span>
        </a>
      </div>

      {/* Results Info Bar */}
      <div className="flex items-center justify-between text-xs text-gray-600 px-1">
        <span className="font-bold">
          कुल दवाइयाँ: <span className="text-[#155ed6]">{filteredProducts.length.toLocaleString()}</span>
        </span>
        {search && (
          <button onClick={() => setSearch('')} className="text-red-600 font-bold hover:underline">
            सर्च हटाएं ✕
          </button>
        )}
      </div>

      {/* 5. PRODUCT GRID */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white h-60 rounded-xl animate-pulse border border-gray-200" />
          ))}
        </div>
      ) : paginatedProducts.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-xl shadow-sm border">
          <p className="text-gray-700 font-bold">"{search}" नाम से कोई दवा नहीं मिली।</p>
          <p className="text-xs text-gray-400 mt-1">सॉल्ट (Composition) या "सभी दवाइयाँ" पर क्लिक करके देखें।</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {paginatedProducts.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onSelect={(med) => setSelectedMed(med)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white p-3 rounded-xl shadow-sm border flex items-center justify-between text-xs font-bold mt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> पिछला पेज
              </button>

              <span className="text-gray-700">
                पेज <span className="text-[#155ed6]">{currentPage}</span> / {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100 disabled:opacity-40"
              >
                अगला पेज <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Flipkart-Style Full Screen Product Detail Modal */}
      {selectedMed && (
        <ProductDetailModal
          item={selectedMed}
          onClose={() => setSelectedMed(null)}
          onGoToCart={() => setActiveView?.('cart')}
          onSearchClick={() => {
            setTimeout(() => document.getElementById('main-med-search')?.focus(), 100);
          }}
        />
      )}
    </div>
  );
}
