import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Filter, SlidersHorizontal, Sparkles } from 'lucide-react';
import { db } from '../lib/firebase';
import { Medicine } from '../types';
import { INITIAL_MEDICINES } from '../data/initialMedicines';
import ProductCard from '../components/ProductCard';

interface StorePageProps {
  search: string;
}

export default function StorePage({ search }: StorePageProps) {
  const [products, setProducts] = useState<Medicine[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'default' | 'margin' | 'priceLow'>('default');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine));
          setProducts(list);
        } else {
          // Fallback to demo catalog if Firestore is empty
          setProducts(
            INITIAL_MEDICINES.map((m, idx) => ({ ...m, id: `demo-${idx}` }))
          );
        }
      } catch (err) {
        console.error('Error loading products:', err);
        setProducts(
          INITIAL_MEDICINES.map((m, idx) => ({ ...m, id: `demo-${idx}` }))
        );
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const categories = ['All', 'Tablets', 'Syrups', 'Injections', 'Antibiotics', 'Surgical'];

  // Filter by Category & Search Query (Brand, Salt, or Company)
  const filteredProducts = products
    .filter((p) => {
      const matchesCat = category === 'All' || p.category === category;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.salt.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'margin') {
        const marginA = (a.mrp - a.ptr) / a.mrp;
        const marginB = (b.mrp - b.ptr) / b.mrp;
        return marginB - marginA;
      }
      if (sortBy === 'priceLow') {
        return a.ptr - b.ptr;
      }
      return 0;
    });

  return (
    <div className="space-y-4">
      {/* Top Wholesale Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-[#2874f0] to-blue-600 text-white p-4 rounded-md shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-yellow-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Direct Distributor Pricing for RMP Clinics
          </div>
          <h2 className="text-lg md:text-xl font-bold mt-0.5">
            Up to 65% Margin on Generic & Ethical Medicines
          </h2>
        </div>
        <div className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded text-xs font-medium border border-white/20">
          Same-Day Dispatch • GST Tax Invoice • COD Available
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
              className={`px-3.5 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wide whitespace-nowrap transition ${
                category === cat
                  ? 'bg-[#2874f0] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <span className="text-gray-500 font-medium">Sort:</span>
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

      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white h-64 rounded-md animate-pulse border border-gray-200" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-md shadow-sm border">
          <p className="text-gray-600 font-medium">"{search}" se milti-julti koi medicine nahi mili.</p>
          <p className="text-xs text-gray-400 mt-1">Salt name ya dusri category try karein.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
