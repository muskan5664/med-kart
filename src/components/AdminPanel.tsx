import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { PlusCircle, Trash2, CheckCircle, ShieldAlert, Database, PackageCheck, Users, Pill } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Medicine, Order, UserProfile } from '../types';
import { INITIAL_MEDICINES } from '../data/initialMedicines';

export default function AdminPanel() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'doctors'>('orders');
  const [products, setProducts] = useState<Medicine[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [seeding, setSeeding] = useState(false);

  const [newMed, setNewMed] = useState({
    name: '',
    salt: '',
    company: '',
    category: 'Tablets',
    mrp: '',
    ptr: '',
    gst: '12',
    stock: '200',
    expiry: '12/2028',
    packing: '10 Tabs / Strip'
  });

  const loadAdminData = async () => {
    const pSnap = await getDocs(collection(db, 'products'));
    setProducts(pSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)));

    const oSnap = await getDocs(collection(db, 'orders'));
    const oList = oSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Order))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOrders(oList);

    const uSnap = await getDocs(collection(db, 'users'));
    setDoctors(uSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
  };

  useEffect(() => {
    if (isAdmin) loadAdminData();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="bg-white p-10 rounded-md shadow text-center text-red-600 font-bold">
        Access Denied: Sirf Admin email se login karne par hi yeh panel khulega.
      </div>
    );
  }

  // 1-Click Seed Initial Medicines to Firestore
  const handleSeedCatalog = async () => {
    if (!window.confirm('Kya aap 6 sample medicines Firestore database me add karna chahte hain?')) return;
    setSeeding(true);
    try {
      for (const item of INITIAL_MEDICINES) {
        await addDoc(collection(db, 'products'), item);
      }
      await loadAdminData();
      alert('Sample medicines database me add ho gayi hain!');
    } finally {
      setSeeding(false);
    }
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'products'), {
      name: newMed.name.trim(),
      salt: newMed.salt.trim(),
      company: newMed.company.trim(),
      category: newMed.category,
      mrp: Number(newMed.mrp),
      ptr: Number(newMed.ptr),
      gst: Number(newMed.gst),
      stock: Number(newMed.stock),
      expiry: newMed.expiry.trim(),
      packing: newMed.packing.trim()
    });
    setNewMed({
      name: '',
      salt: '',
      company: '',
      category: 'Tablets',
      mrp: '',
      ptr: '',
      gst: '12',
      stock: '200',
      expiry: '12/2028',
      packing: '10 Tabs / Strip'
    });
    loadAdminData();
    alert('Medicine successfully added!');
  };

  const handleDeleteMedicine = async (id: string) => {
    if (!window.confirm('Delete this medicine?')) return;
    await deleteDoc(doc(db, 'products', id));
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
      {/* Top KPI Summary Cards */}
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
          <p className="text-xs text-gray-500 font-bold uppercase">Active Medicines</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{products.length}</p>
        </div>
        <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-purple-500">
          <p className="text-xs text-gray-500 font-bold uppercase">Registered RMPs</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{doctors.length}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-3 rounded-md shadow-sm border flex flex-wrap justify-between items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 ${
              activeTab === 'orders' ? 'bg-[#2874f0] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <PackageCheck className="w-4 h-4" /> Manage Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 ${
              activeTab === 'catalog' ? 'bg-[#2874f0] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Pill className="w-4 h-4" /> Medicines Stock ({products.length})
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

        {products.length === 0 && (
          <button
            disabled={seeding}
            onClick={handleSeedCatalog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5"
          >
            <Database className="w-4 h-4" /> {seeding ? 'Seeding...' : 'Load 6 Sample Medicines'}
          </button>
        )}
      </div>

      {/* TAB 1: MANAGE ORDERS */}
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

      {/* TAB 2: ADD & MANAGE MEDICINES */}
      {activeTab === 'catalog' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <form onSubmit={handleAddMedicine} className="bg-white p-5 rounded-md shadow-sm border space-y-3 text-xs h-fit">
            <h3 className="text-sm font-bold text-[#2874f0] flex items-center gap-1.5 border-b pb-2">
              <PlusCircle className="w-4 h-4" /> Add New Wholesale Medicine
            </h3>

            <div>
              <label className="font-bold text-gray-600 block mb-1">Brand Name *</label>
              <input type="text" required placeholder="e.g. Dolo 650mg Tablet" className="w-full border p-2 rounded-sm" value={newMed.name} onChange={(e) => setNewMed({ ...newMed, name: e.target.value })} />
            </div>

            <div>
              <label className="font-bold text-gray-600 block mb-1">Salt / Composition *</label>
              <input type="text" required placeholder="e.g. Paracetamol IP 650mg" className="w-full border p-2 rounded-sm" value={newMed.salt} onChange={(e) => setNewMed({ ...newMed, salt: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-gray-600 block mb-1">Company *</label>
                <input type="text" required placeholder="Micro Labs" className="w-full border p-2 rounded-sm" value={newMed.company} onChange={(e) => setNewMed({ ...newMed, company: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">Category *</label>
                <select className="w-full border p-2 rounded-sm" value={newMed.category} onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}>
                  <option>Tablets</option>
                  <option>Syrups</option>
                  <option>Injections</option>
                  <option>Antibiotics</option>
                  <option>Surgical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold text-gray-600 block mb-1">MRP (₹) *</label>
                <input type="number" step="0.01" required placeholder="120" className="w-full border p-2 rounded-sm" value={newMed.mrp} onChange={(e) => setNewMed({ ...newMed, mrp: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">RMP PTR (₹) *</label>
                <input type="number" step="0.01" required placeholder="78" className="w-full border p-2 rounded-sm" value={newMed.ptr} onChange={(e) => setNewMed({ ...newMed, ptr: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">GST %</label>
                <select className="w-full border p-2 rounded-sm" value={newMed.gst} onChange={(e) => setNewMed({ ...newMed, gst: e.target.value })}>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold text-gray-600 block mb-1">Stock Qty</label>
                <input type="number" required className="w-full border p-2 rounded-sm" value={newMed.stock} onChange={(e) => setNewMed({ ...newMed, stock: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">Expiry *</label>
                <input type="text" required placeholder="10/2028" className="w-full border p-2 rounded-sm" value={newMed.expiry} onChange={(e) => setNewMed({ ...newMed, expiry: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">Packing</label>
                <input type="text" placeholder="10 Tabs" className="w-full border p-2 rounded-sm" value={newMed.packing} onChange={(e) => setNewMed({ ...newMed, packing: e.target.value })} />
              </div>
            </div>

            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-sm uppercase">
              Save Medicine to Store
            </button>
          </form>

          {/* Existing Stock List */}
          <div className="lg:col-span-2 bg-white p-4 rounded-md shadow-sm border space-y-2 max-h-[600px] overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-2">Current Wholesale Catalog</h3>
            {products.map((p) => (
              <div key={p.id} className="flex justify-between items-center border p-3 rounded-sm text-xs hover:bg-gray-50">
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    {p.name} <span className="text-xs font-normal text-gray-500">({p.company})</span>
                  </p>
                  <p className="text-gray-500">{p.salt} • Exp: {p.expiry}</p>
                  <p className="mt-1 font-semibold text-[#2874f0]">
                    PTR: ₹{p.ptr} | MRP: ₹{p.mrp} | Stock: {p.stock}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteMedicine(p.id)}
                  className="text-red-500 hover:bg-red-50 p-2 rounded"
                  title="Delete Medicine"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
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
