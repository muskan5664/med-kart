import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { PlusCircle, Trash2, CheckCircle, ShieldAlert, PackageCheck, Users, Pill, Pencil, X, ImagePlus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Medicine, Order, UserProfile } from '../types';

const EMPTY_MED = {
  name: '',
  salt: '',
  company: '',
  category: 'Tablets & Caps',
  mrp: '',
  ptr: '',
  gst: '12',
  stock: '200',
  expiry: '12/2028',
  packing: '10 Tabs / Strip',
  imageUrl: ''
};

function detectCategory(name: string, salt: string, company: string): string {
  const text = `${name} ${salt} ${company}`.toUpperCase();
  if (text.includes('(VET)') || text.includes('BOLUS') || text.includes('VETERINARY')) return 'Veterinary';
  if (text.includes('INJ') || text.includes('VIAL') || text.includes('AMP') || text.includes('INFUSION') || text.includes('500ML.')) return 'Injections';
  if (text.includes('SYP') || text.includes('SYRUP') || text.includes('SUSP') || text.includes('DROP') || text.includes('LIQ') || text.includes('SOLN')) return 'Syrups & Drops';
  if (text.includes('CREAM') || text.includes('OINT') || text.includes('GEL') || text.includes('LOTION') || text.includes('SOAP') || text.includes('SHAMPOO')) return 'Ointments & Derma';
  if (text.includes('SYRINGE') || text.includes('BANDAGE') || text.includes('TAPE') || text.includes('SURGICAL') || text.includes('PAD') || text.includes('DIAPER') || text.includes('IV SET')) return 'Surgical & Care';
  return 'Tablets & Caps';
}

const compressMedicineImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 450;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export default function AdminPanel() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'doctors'>('catalog');
  const [products, setProducts] = useState<Medicine[]>([]);
  const [firestoreIds, setFirestoreIds] = useState<Set<string>>(new Set());
  const [orders, setOrders] = useState<Order[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Search & Pagination inside Admin Catalog
  const [adminSearch, setAdminSearch] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const ADMIN_PAGE_SIZE = 20;

  const [medForm, setMedForm] = useState(EMPTY_MED);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoadingCatalog(true);
    try {
      // 1. Fetch Firestore Custom/Edited Medicines
      const pSnap = await getDocs(collection(db, 'products'));
      const fsList = pSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine));
      const fsIdSet = new Set(fsList.map((item) => item.id));
      setFirestoreIds(fsIdSet);

      // 2. Fetch Static 8000+ medicines.json
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
            // Exclude static items that were already edited & saved into Firestore
            staticList = Array.from(seenNames.values()).filter((item) => !fsIdSet.has(item.id));
          }
        }
      } catch (e) {
        console.warn('Could not load static medicines.json in admin:', e);
      }

      setProducts([...fsList, ...staticList]);

      // 3. Load Orders & RMPs
      const oSnap = await getDocs(collection(db, 'orders'));
      const oList = oSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Order))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(oList);

      const uSnap = await getDocs(collection(db, 'users'));
      setDoctors(uSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadAdminData();
  }, [isAdmin]);

  useEffect(() => {
    setAdminPage(1);
  }, [adminSearch]);

  const filteredAdminProducts = useMemo(() => {
    const q = adminSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.salt.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q)
    );
  }, [products, adminSearch]);

  const totalAdminPages = Math.ceil(filteredAdminProducts.length / ADMIN_PAGE_SIZE);
  const paginatedAdminProducts = filteredAdminProducts.slice(
    (adminPage - 1) * ADMIN_PAGE_SIZE,
    adminPage * ADMIN_PAGE_SIZE
  );

  if (!isAdmin) {
    return (
      <div className="bg-white p-10 rounded-md shadow text-center text-red-600 font-bold">
        Access Denied: Sirf Admin email se login karne par hi yeh panel khulega.
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBase64 = await compressMedicineImage(file);
      setMedForm((prev) => ({ ...prev, imageUrl: compressedBase64 }));
    } catch {
      alert('Photo process karne me problem aayi, doosri photo try karein.');
    }
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: medForm.name.trim(),
      salt: medForm.salt.trim(),
      company: medForm.company.trim(),
      category: medForm.category,
      mrp: Number(medForm.mrp),
      ptr: Number(medForm.ptr),
      gst: Number(medForm.gst),
      stock: Number(medForm.stock),
      expiry: medForm.expiry.trim(),
      packing: medForm.packing.trim(),
      imageUrl: medForm.imageUrl || ''
    };

    if (editingId) {
      // Save/Override directly into Firestore using same ID so it updates both Admin & Store
      await setDoc(doc(db, 'products', editingId), payload, { merge: true });
      alert('Medicine details & photo updated!');
    } else {
      await addDoc(collection(db, 'products'), payload);
      alert('New medicine added!');
    }

    setMedForm(EMPTY_MED);
    setEditingId(null);
    loadAdminData();
  };

  const startEditMedicine = (p: Medicine) => {
    setEditingId(p.id);
    setMedForm({
      name: p.name,
      salt: p.salt,
      company: p.company,
      category: p.category,
      mrp: String(p.mrp),
      ptr: String(p.ptr),
      gst: String(p.gst || 12),
      stock: String(p.stock),
      expiry: p.expiry,
      packing: p.packing || '10 Tabs / Strip',
      imageUrl: p.imageUrl || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMedForm(EMPTY_MED);
  };

  const handleDeleteMedicine = async (id: string) => {
    if (!firestoreIds.has(id)) {
      alert('Yeh medicine static medicines.json se aa rahi hai. Aap isko Edit karke rate/photo badal sakte hain.');
      return;
    }
    if (!window.confirm('Kya aap is custom medicine ko delete karna chahte hain?')) return;
    await deleteDoc(doc(db, 'products', id));
    if (editingId === id) cancelEdit();
    loadAdminData();
  };

  const handleOrderStatus = async (id: string, status: Order['status']) => {
    await updateDoc(doc(db, 'orders', id), { status });
    loadAdminData();
  };

  const togglePaymentPaid = async (id: string, current: 'Pending' | 'Paid') => {
    await updateDoc(doc(db, 'orders', id), { paymentStatus: current === 'Paid' ? 'Pending' : 'Paid' });
    loadAdminData();
  };

  const toggleVerifyDoctor = async (uid: string, current: boolean) => {
    await updateDoc(doc(db, 'users', uid), { verified: !current });
    loadAdminData();
  };

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? o.grandTotal : 0), 0);

  return (
    <div className="space-y-5">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-[#2874f0]">
          <p className="text-xs text-gray-500 font-bold uppercase">Total Orders</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-emerald-500">
          <p className="text-xs text-gray-500 font-bold uppercase">Total Sales (B2B)</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">₹{totalRevenue}</p>
        </div>
        <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-amber-500">
          <p className="text-xs text-gray-500 font-bold uppercase">Total Catalog Items</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{products.length.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-purple-500">
          <p className="text-xs text-gray-500 font-bold uppercase">Registered RMPs</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{doctors.length}</p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white p-3 rounded-md shadow-sm border flex flex-wrap justify-between items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 ${
              activeTab === 'catalog' ? 'bg-[#2874f0] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Pill className="w-4 h-4" /> Add / Edit Medicines ({products.length.toLocaleString()})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 ${
              activeTab === 'orders' ? 'bg-[#2874f0] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <PackageCheck className="w-4 h-4" /> Manage Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 ${
              activeTab === 'doctors' ? 'bg-[#2874f0] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" /> RMP Verification ({doctors.length})
          </button>
        </div>
      </div>

      {/* TAB 1: ADD / EDIT MEDICINES WITH PHOTO */}
      {activeTab === 'catalog' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <form onSubmit={handleSaveMedicine} className="bg-white p-5 rounded-md shadow-sm border space-y-3 text-xs h-fit">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-[#2874f0] flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                {editingId ? 'Edit Medicine & Photo' : 'Add New Medicine'}
              </h3>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="text-red-500 flex items-center gap-0.5 font-bold">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>

            {/* Medicine Photo Upload & Preview */}
            <div className="border border-dashed border-gray-300 rounded-sm p-3 bg-gray-50">
              <label className="font-bold text-gray-700 block mb-1.5 flex items-center gap-1">
                <ImagePlus className="w-4 h-4 text-[#2874f0]" /> Medicine Photo (Strip / Box / Bottle)
              </label>
              <div className="flex items-center gap-3">
                {medForm.imageUrl ? (
                  <div className="relative w-16 h-16 bg-white border rounded overflow-hidden shrink-0">
                    <img src={medForm.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setMedForm({ ...medForm, imageUrl: '' })}
                      className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-white border rounded flex items-center justify-center text-gray-300 shrink-0">
                    <Pill className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 space-y-1.5">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-[11px] text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#2874f0] hover:file:bg-blue-100"
                  />
                  <input
                    type="text"
                    placeholder="Ya direct Image URL paste karein..."
                    className="w-full border bg-white p-1.5 rounded-sm text-[11px]"
                    value={medForm.imageUrl.startsWith('data:') ? '' : medForm.imageUrl}
                    onChange={(e) => setMedForm({ ...medForm, imageUrl: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-600 block mb-1">Brand Name *</label>
              <input type="text" required placeholder="e.g. Dolo 650mg Tablet" className="w-full border p-2 rounded-sm" value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} />
            </div>

            <div>
              <label className="font-bold text-gray-600 block mb-1">Salt / Composition *</label>
              <input type="text" required placeholder="e.g. Paracetamol IP 650mg" className="w-full border p-2 rounded-sm" value={medForm.salt} onChange={(e) => setMedForm({ ...medForm, salt: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-gray-600 block mb-1">Company *</label>
                <input type="text" required placeholder="Micro Labs" className="w-full border p-2 rounded-sm" value={medForm.company} onChange={(e) => setMedForm({ ...medForm, company: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">Category *</label>
                <select className="w-full border p-2 rounded-sm" value={medForm.category} onChange={(e) => setMedForm({ ...medForm, category: e.target.value })}>
                  <option>Tablets & Caps</option>
                  <option>Syrups & Drops</option>
                  <option>Injections</option>
                  <option>Ointments & Derma</option>
                  <option>Surgical & Care</option>
                  <option>Veterinary</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold text-gray-600 block mb-1">MRP (₹) *</label>
                <input type="number" step="0.01" required placeholder="120" className="w-full border p-2 rounded-sm" value={medForm.mrp} onChange={(e) => setMedForm({ ...medForm, mrp: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">RMP PTR (₹) *</label>
                <input type="number" step="0.01" required placeholder="78" className="w-full border p-2 rounded-sm" value={medForm.ptr} onChange={(e) => setMedForm({ ...medForm, ptr: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">GST %</label>
                <select className="w-full border p-2 rounded-sm" value={medForm.gst} onChange={(e) => setMedForm({ ...medForm, gst: e.target.value })}>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold text-gray-600 block mb-1">Stock Qty</label>
                <input type="number" required className="w-full border p-2 rounded-sm" value={medForm.stock} onChange={(e) => setMedForm({ ...medForm, stock: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">Expiry *</label>
                <input type="text" required placeholder="10/2028" className="w-full border p-2 rounded-sm" value={medForm.expiry} onChange={(e) => setMedForm({ ...medForm, expiry: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">Packing</label>
                <input type="text" placeholder="10 Tabs" className="w-full border p-2 rounded-sm" value={medForm.packing} onChange={(e) => setMedForm({ ...medForm, packing: e.target.value })} />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full text-white font-bold py-2.5 rounded-sm uppercase ${
                editingId ? 'bg-[#2874f0] hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {editingId ? 'Update Medicine & Save' : 'Save New Medicine'}
            </button>
          </form>

          {/* Existing 8000+ Stock List with Search, Pagination, Edit & Photo */}
          <div className="lg:col-span-2 bg-white p-4 rounded-md shadow-sm border space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
              <h3 className="text-sm font-bold text-gray-700">
                All Medicines ({filteredAdminProducts.length.toLocaleString()})
              </h3>
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search Brand, Salt or Company to Edit..."
                  className="w-full border border-gray-300 rounded-sm py-1.5 px-3 pr-8 text-xs focus:outline-none focus:border-[#2874f0]"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-2.5 top-2" />
              </div>
            </div>

            {loadingCatalog ? (
              <p className="text-center py-8 text-xs text-gray-500">Loading 8,000+ medicines catalog...</p>
            ) : (
              <div className="space-y-2">
                {paginatedAdminProducts.map((p) => (
                  <div
                    key={p.id}
                    className={`flex justify-between items-center border p-3 rounded-sm text-xs gap-3 ${
                      editingId === p.id ? 'border-[#2874f0] bg-blue-50/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 bg-gray-50 border rounded flex items-center justify-center overflow-hidden shrink-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" />
                        ) : (
                          <Pill className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {p.name} <span className="text-xs font-normal text-gray-500">({p.company})</span>
                        </p>
                        <p className="text-gray-500 truncate">{p.salt} • Exp: {p.expiry} • {p.packing}</p>
                        <p className="mt-1 font-semibold text-[#2874f0]">
                          PTR: ₹{p.ptr} | MRP: ₹{p.mrp} | Stock: {p.stock}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditMedicine(p)}
                        className="text-[#2874f0] hover:bg-blue-100 px-2.5 py-1.5 rounded flex items-center gap-1 font-bold"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit / Photo
                      </button>
                      {firestoreIds.has(p.id) && (
                        <button
                          onClick={() => handleDeleteMedicine(p.id)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                          title="Delete Custom Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Admin Pagination */}
            {totalAdminPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t text-xs font-bold">
                <button
                  disabled={adminPage === 1}
                  onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 border rounded bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span>
                  Page {adminPage} of {totalAdminPages}
                </span>
                <button
                  disabled={adminPage === totalAdminPages}
                  onClick={() => setAdminPage((p) => Math.min(totalAdminPages, p + 1))}
                  className="flex items-center gap-1 px-3 py-1.5 border rounded bg-gray-50 disabled:opacity-40"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-white p-8 rounded-md text-center text-gray-500">Koi order nahi aaya hai.</div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200 space-y-2.5">
                <div className="flex flex-wrap justify-between items-start gap-2 border-b pb-2">
                  <div>
                    <span className="font-extrabold text-sm text-gray-900">
                      {o.clinicName} ({o.doctorName})
                    </span>
                    <span className="ml-2 text-xs bg-blue-50 text-[#2874f0] px-2 py-0.5 rounded font-bold">
                      RMP: {o.rmpNo}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      📞 {o.phone} • 📍 {o.address}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-extrabold text-base text-gray-900">₹{o.grandTotal}</p>
                    <button
                      onClick={() => togglePaymentPaid(o.id, o.paymentStatus)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        o.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {o.paymentMode} • {o.paymentStatus} (Click to toggle)
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
                  <b>Items:</b> {o.items.map((i) => `${i.name} (×${i.qty})`).join(', ')}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-bold text-gray-500">Order Status:</span>
                  {(['Confirmed', 'Packed', 'Dispatched', 'Delivered', 'Cancelled'] as Order['status'][]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleOrderStatus(o.id, st)}
                      className={`px-3 py-1 rounded-sm text-xs font-bold transition ${
                        o.status === st
                          ? 'bg-[#2874f0] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: RMP VERIFICATION */}
      {activeTab === 'doctors' && (
        <div className="bg-white p-4 rounded-md shadow-sm border space-y-2">
          {doctors.map((d) => (
            <div key={d.uid} className="flex flex-wrap justify-between items-center border p-3.5 rounded-sm text-xs gap-3">
              <div>
                <p className="font-bold text-sm text-gray-900">
                  {d.clinicName || 'Admin Account'} — {d.doctorName}
                </p>
                <p className="text-gray-600 mt-0.5">
                  RMP Reg No: <b className="text-[#2874f0]">{d.rmpNo || 'N/A'}</b> • 📞 {d.phone} • ✉️ {d.email}
                </p>
                <p className="text-gray-400 mt-0.5">📍 {d.address}</p>
              </div>

              <button
                onClick={() => toggleVerifyDoctor(d.uid, d.verified)}
                className={`px-3.5 py-1.5 rounded-sm font-bold flex items-center gap-1.5 ${
                  d.verified
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {d.verified ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Verified RMP
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" /> Pending Approval (Click to Verify)
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
