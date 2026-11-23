import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Filter, SlidersHorizontal, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { Medicine } from '../types';
import { INITIAL_MEDICINES } from '../data/initialMedicines';
import ProductCard from '../components/ProductCard';

interface StorePageProps {
  search: string;
}

const ITEMS_PER_PAGE = 24;

// Auto-detect Category from Medicine Name / Packing / Composition
function detectCategory(name: string, salt: string, company: string): string {
  const text = `${name} ${salt} ${company}`.toUpperCase();
  if (text.includes('(VET)') || text.includes('BOLUS') || text.includes('VETERINARY')) return 'Veterinary';
  if (text.includes('INJ') || text.includes('VIAL') || text.includes('AMP') || text.includes('INFUSION') || text.includes('500ML.')) return 'Injections';
  if (text.includes('SYP') || text.includes('SYRUP') || text.includes('SUSP') || text.includes('DROP') || text.includes('LIQ') || text.includes('SOLN')) return 'Syrups & Drops';
  if (text.includes('CREAM') || text.includes('OINT') || text.includes('GEL') || text.includes('LOTION') || text.includes('SOAP') || text.includes('SHAMPOO')) return 'Ointments & Derma';
  if (text.includes('SYRINGE') || text.includes('BANDAGE') || text.includes('TAPE') || text.includes('SURGICAL') || text.includes('PAD') || text.includes('DIAPER') || text.includes('IV SET')) return 'Surgical & Care';
  return 'Tablets & Caps';
}

export default function StorePage({ search }: StorePageProps) {
  const [products, setProducts] = useState<Medicine[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'default' | 'margin' | 'priceLow'>('default');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    const fetchAllMedicines = async () => {
      try {
        // 1. Load 8000+ medicines from static public/medicines.json
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

                  // Skip company header rows, null salt rows, or non-medicine charges
                  if (
                    !rawName ||
                    !salt ||
                    rawName.includes('COD CHARGE') ||
                    rawName.includes('CASH ETRA')
                  ) {
                    return;
                  }

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
                  } else if (mrp > 0) {
                    const existing = seenNames.get(key)!;
                    existing.mrp = mrp;
                    existing.ptr = ptr;
                    if (expiry && expiry !== '12/2028') existing.expiry = expiry;
                  }
                }
              });

              staticList = Array.from(seenNames.values());
            }
          }
        } catch (e) {
          console.warn('Error parsing medicines.json:', e);
        }

        // 2. Load Admin-added / Edited medicines from Firestore
        const snap = await getDocs(collection(db, 'products'));
        const firestoreList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine));

        // Override static items with Firestore edited versions (photos, updated PTR/MRP)
        const fsIdSet = new Set(firestoreList.map((item) => item.id));
        const combined = [
          ...firestoreList,
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
  }, [search, category, sortBy]);

  const categories = [
    'All',
    'Tablets & Caps',
    'Syrups & Drops',
    'Injections',
    'Ointments & Derma',
    'Surgical & Care',
    'Veterinary'
  ];

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products
      .filter((p) => {
        const matchesCat = category === 'All' || p.category === category;
        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.salt.toLowerCase().includes(q) ||
          p.company.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'margin') {
          return (b.mrp - b.ptr) / b.mrp - (a.mrp - a.ptr) / a.mrp;
        }
        if (sortBy === 'priceLow') {
          return a.ptr - b.ptr;
        }
        return 0;
      });
  }, [products, category, search, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-4">
      {/* Top Wholesale Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-[#2874f0] to-blue-600 text-white p-4 rounded-md shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-yellow-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> {products.length.toLocaleString()}+ Medicines & Medical Supplies Ready
          </div>
          <h2 className="text-lg md:text-xl font-bold mt-0.5">
            Direct Wholesale PTR Pricing for RMP Clinics
          </h2>
        </div>
        <div className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded text-xs font-medium border border-white/20">
          Instant Salt Search • GST Tax Invoice • COD Available
        </div>
      </div>

      {/* Category & Sort Bar */}
      <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-gray-400 shrink-0 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wide whitespace-nowrap transition ${
                category === cat
                  ? 'bg-[#2874f0] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500 font-semibold hidden sm:inline">
            {filteredProducts.length.toLocaleString()} items
          </span>
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-sm px-2.5 py-1.5 font-semibold text-gray-700 focus:outline-none focus:border-[#2874f0]"
            >
              <option value="default">Relevance</option>
              <option value="margin">Highest Profit Margin</option>
              <option value="priceLow">PTR: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white h-72 rounded-md animate-pulse border border-gray-200" />
          ))}
        </div>
      ) : paginatedProducts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-md shadow-sm border">
          <p className="text-gray-600 font-medium">"{search}" se milti-julti koi medicine nahi mili.</p>
          <p className="text-xs text-gray-400 mt-1">Salt / Composition name ya "All" category try karein.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedProducts.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white p-3 rounded-md shadow-sm border flex items-center justify-between text-xs font-bold mt-6">
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-sm border bg-gray-50 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <span className="text-gray-700">
                Page <span className="text-[#2874f0]">{currentPage}</span> of {totalPages} ({filteredProducts.length.toLocaleString()} Medicines)
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-sm border bg-gray-50 hover:bg-gray-100 disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
