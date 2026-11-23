import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  PlusCircle,
  Trash2,
  CheckCircle,
  ShieldAlert,
  PackageCheck,
  Users,
  Pill,
  Pencil,
  X,
  ImagePlus,
  Search,
  ChevronLeft,
  ChevronRight,
  Printer,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Medicine, Order, OrderStatus, UserProfile } from '../types';

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
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'doctors'>('orders');

  // Orders States (Real-time)
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatus>('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Catalog States
  const [products, setProducts] = useState<Medicine[]>([]);
  const [firestoreIds, setFirestoreIds] = useState<Set<string>>(new Set());
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const ADMIN_PAGE_SIZE = 20;
  const [medForm, setMedForm] = useState(EMPTY_MED);
  const [editingId, setEditingId] = useState<string | null>(null);

  // RMP Doctors States
  const [doctors, setDoctors] = useState<UserProfile[]>([]);

  // 1. Real-Time Listener for Orders & Users (Auto-updates instantly!)
  useEffect(() => {
    if (!isAdmin) return;

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Order))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(list);
      },
      (err) => console.error('Orders listener error:', err)
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setDoctors(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
      },
      (err) => console.error('Users listener error:', err)
    );

    return () => {
      unsubOrders();
      unsubUsers();
    };
  }, [isAdmin]);

  // 2. Load Catalog (Firestore + Static 8000+ JSON)
  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const pSnap = await getDocs(collection(db, 'products'));
      const fsList = pSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine));
      const fsIdSet = new Set(fsList.map((item) => item.id));
      setFirestoreIds(fsIdSet);

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
            staticList = Array.from(seenNames.values()).filter((item) => !fsIdSet.has(item.id));
          }
        }
      } catch (e) {
        console.warn('Static medicines.json error:', e);
      }

      setProducts([...fsList, ...staticList]);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadCatalog();
  }, [isAdmin]);

  useEffect(() => {
    setAdminPage(1);
  }, [adminSearch]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    const q = orderSearch.toLowerCase().trim();
    return orders.filter((o) => {
      const matchesStatus = orderStatusFilter === 'All' || o.status === orderStatusFilter;
      const matchesQuery =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.clinicName || '').toLowerCase().includes(q) ||
        (o.doctorName || '').toLowerCase().includes(q) ||
        (o.phone || '').includes(q) ||
        (o.utrNumber || '').toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  // Filtered Catalog
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
        Access Denied: Admin login required.
      </div>
    );
  }

  // Update Order Status Handler
  const handleOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (err: any) {
      alert('Status update failed: ' + err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Toggle Payment Paid/Pending
  const handleTogglePayment = async (orderId: string, current: 'Pending' | 'Paid') => {
    setUpdatingOrderId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentStatus: current === 'Paid' ? 'Pending' : 'Paid'
      });
    } catch (err: any) {
      alert('Payment status update failed: ' + err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Medicine Handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressMedicineImage(file);
      setMedForm((prev) => ({ ...prev, imageUrl: compressed }));
    } catch {
      alert('Image upload failed.');
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
      await setDoc(doc(db, 'products', editingId), payload, { merge: true });
      alert('Medicine updated!');
    } else {
      await addDoc(collection(db, 'products'), payload);
      alert('New medicine added!');
    }

    setMedForm(EMPTY_MED);
    setEditingId(null);
    loadCatalog();
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

  const handleDeleteMedicine = async (id: string) => {
    if (!firestoreIds.has(id)) {
      alert('Yeh static catalog item hai. Aap isko Edit karke update kar sakte hain.');
      return;
    }
    if (!window.confirm('Delete this medicine?')) return;
    await deleteDoc(doc(db, 'products', id));
    loadCatalog();
  };

  const toggleVerifyDoctor = async (uid: string, current: boolean) => {
    await updateDoc(doc(db, 'users', uid), { verified: !current });
  };

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? o.grandTotal : 0), 0);
  const pendingOrdersCount = orders.filter((o) => o.status === 'Confirmed' || o.status === 'Packed').length;

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Packed':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Shipped':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const formatPaymentLabel = (mode: string) => {
    if (mode === 'UPI_QR') return 'UPI QR Scan';
    if (mode === 'ONLINE') return 'Online Gateway';
    return 'Cash on Delivery (COD)';
  };

  return (
    <div className="space-y-5">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-[#2874f0]">
          <p className="text-[11px] text-gray-500 font-bold uppercase">Total Orders</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{orders.length}</p>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">{pendingOrdersCount} Active / Pending</p>
        </div>
        <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-emerald-500">
          <p className="text-[11px] text-gray-500 font-bold uppercase">Total Revenue</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Excl. Cancelled</p>
        </div>
        <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-amber-500">
          <p className="text-[11px] text-gray-500 font-bold uppercase">Catalog Medicines</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{products.length.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">8,000+ Ready Stock</p>
        </div>
        <div className="bg-white p-4 rounded-md shadow-sm border-l-4 border-purple-500">
          <p className="text-[11px] text-gray-500 font-bold uppercase">Registered RMPs</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{doctors.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Verified Clinics</p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-white p-2.5 rounded-md shadow-sm border flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'orders' ? 'bg-[#2874f0] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <PackageCheck className="w-4 h-4" /> Manage Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'catalog' ? 'bg-[#2874f0] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Pill className="w-4 h-4" /> Medicines Catalog ({products.length.toLocaleString()})
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`px-4 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 transition ${
            activeTab === 'doctors' ? 'bg-[#2874f0] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4" /> RMP Clinics ({doctors.length})
        </button>
      </div>

      {/* ==================== TAB 1: PROFESSIONAL ORDER MANAGEMENT ==================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Status Filter Strip + Search */}
          <div className="bg-white p-3.5 rounded-md shadow-sm border flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(['All', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'] as const).map((st) => {
                const count = st === 'All' ? orders.length : orders.filter((o) => o.status === st).length;
                return (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-bold transition ${
                      orderStatusFilter === st
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {st} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search Order ID, Clinic, Phone, UTR..."
                className="w-full border border-gray-300 rounded-sm py-1.5 px-3 pr-8 text-xs focus:outline-none focus:border-[#2874f0]"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-2.5 top-2" />
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-md text-center text-gray-500 border text-sm">
              Is filter me koi order nahi mila.
            </div>
          ) : (
            filteredOrders.map((o) => (
              <div key={o.id} className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                {/* Order Top Header */}
                <div className="bg-gray-50 px-4 py-3 border-b flex flex-wrap justify-between items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-extrabold text-sm text-gray-900">
                      #{o.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusStyle(o.status)}`}>
                      {o.status}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(o.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInvoiceOrder(o)}
                      className="bg-[#2874f0] hover:bg-blue-700 text-white px-3 py-1.5 rounded-sm text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" /> Generate GST Bill
                    </button>
                  </div>
                </div>

                {/* Order Body: Customer Details & Payment Info */}
                <div className="p-4 grid md:grid-cols-3 gap-4 border-b text-xs">
                  {/* Col 1: Customer & Clinic Info */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-gray-400 uppercase">Customer / Clinic Details</p>
                    <p className="font-extrabold text-sm text-gray-900">
                      {o.clinicName} <span className="font-normal text-gray-600">({o.doctorName})</span>
                    </p>
                    <p className="text-gray-700 font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#2874f0]" /> {o.phone || 'No Phone'}
                      <span className="bg-blue-50 text-[#2874f0] px-1.5 py-0.5 rounded font-bold text-[10px]">
                        RMP: {o.rmpNo}
                      </span>
                    </p>
                    <p className="text-gray-600 flex items-start gap-1.5 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{o.address}</span>
                    </p>
                  </div>

                  {/* Col 2: Payment Method & Verification */}
                  <div className="space-y-1.5 bg-gray-50 p-3 rounded border border-gray-100">
                    <p className="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-[#2874f0]" /> Payment Information
                    </p>
                    <p className="font-bold text-gray-800">
                      Method: <span className="text-[#2874f0]">{formatPaymentLabel(o.paymentMode)}</span>
                    </p>
                    {o.utrNumber && o.utrNumber !== 'COD' && (
                      <p className="text-gray-700">
                        UTR / Ref No: <span className="font-mono font-bold bg-white px-1.5 py-0.5 border rounded">{o.utrNumber}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        o.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {o.paymentStatus === 'Paid' ? '✓ PAID' : '⏳ PAYMENT PENDING'}
                      </span>
                      <button
                        disabled={updatingOrderId === o.id}
                        onClick={() => handleTogglePayment(o.id, o.paymentStatus)}
                        className="text-[11px] font-bold text-[#2874f0] hover:underline"
                      >
                        Mark as {o.paymentStatus === 'Paid' ? 'Pending' : 'Paid'}
                      </button>
                    </div>
                  </div>

                  {/* Col 3: Bill Amount Breakdown */}
                  <div className="space-y-1 bg-blue-50/40 p-3 rounded border border-blue-100 text-right flex flex-col justify-center">
                    <p className="text-gray-500">Subtotal (PTR): <b>₹{o.subtotal?.toFixed(2)}</b></p>
                    <p className="text-gray-500">GST Tax: <b>₹{o.gstTotal?.toFixed(2)}</b></p>
                    <p className="text-lg font-extrabold text-gray-900 border-t border-blue-200 pt-1 mt-1">
                      Total: ₹{o.grandTotal}
                    </p>
                  </div>
                </div>

                {/* Ordered Items Table */}
                <div className="px-4 py-3 bg-white border-b">
                  <p className="text-[11px] font-bold text-gray-400 uppercase mb-2">
                    Ordered Medicines ({o.items.length} Items)
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    {o.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded border">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-gray-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-gray-500">{item.packing || '1 Strip'} • PTR ₹{item.ptr}</p>
                        </div>
                        <span className="font-extrabold text-[#2874f0] shrink-0">
                          × {item.qty} = ₹{(item.ptr * item.qty).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Bar: Update Order Status */}
                <div className="px-4 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#2874f0]" /> Update Live Status (User ko turant dikhega):
                  </span>

                  <div className="flex flex-wrap gap-1.5">
                    {(['Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map((st) => {
                      const isCurrent = o.status === st;
                      return (
                        <button
                          key={st}
                          disabled={updatingOrderId === o.id || isCurrent}
                          onClick={() => handleOrderStatus(o.id, st)}
                          className={`px-3 py-1.5 rounded-sm text-xs font-bold flex items-center gap-1 transition ${
                            isCurrent
                              ? st === 'Cancelled'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-[#2874f0]'
                          }`}
                        >
                          {isCurrent && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {st === 'Cancelled' && !isCurrent && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ==================== TAB 2: MEDICINES CATALOG ==================== */}
      {activeTab === 'catalog' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <form onSubmit={handleSaveMedicine} className="bg-white p-5 rounded-md shadow-sm border space-y-3 text-xs h-fit">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-[#2874f0] flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4" />
                {editingId ? 'Edit Medicine & Photo' : 'Add New Medicine'}
              </h3>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setMedForm(EMPTY_MED); }} className="text-red-500 flex items-center gap-0.5 font-bold">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>

            <div className="border border-dashed border-gray-300 rounded-sm p-3 bg-gray-50">
              <label className="font-bold text-gray-700 block mb-1.5 flex items-center gap-1">
                <ImagePlus className="w-4 h-4 text-[#2874f0]" /> Medicine Photo
              </label>
              <div className="flex items-center gap-3">
                {medForm.imageUrl ? (
                  <div className="relative w-16 h-16 bg-white border rounded overflow-hidden shrink-0">
                    <img src={medForm.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                    <button type="button" onClick={() => setMedForm({ ...medForm, imageUrl: '' })} className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-white border rounded flex items-center justify-center text-gray-300 shrink-0">
                    <Pill className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 space-y-1.5">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-[11px] text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#2874f0]" />
                  <input type="text" placeholder="Ya Image URL paste karein..." className="w-full border bg-white p-1.5 rounded-sm text-[11px]" value={medForm.imageUrl.startsWith('data:') ? '' : medForm.imageUrl} onChange={(e) => setMedForm({ ...medForm, imageUrl: e.target.value })} />
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
                <input type="number" step="0.01" required className="w-full border p-2 rounded-sm" value={medForm.mrp} onChange={(e) => setMedForm({ ...medForm, mrp: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">RMP PTR (₹) *</label>
                <input type="number" step="0.01" required className="w-full border p-2 rounded-sm" value={medForm.ptr} onChange={(e) => setMedForm({ ...medForm, ptr: e.target.value })} />
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
                <label className="font-bold text-gray-600 block mb-1">Stock</label>
                <input type="number" required className="w-full border p-2 rounded-sm" value={medForm.stock} onChange={(e) => setMedForm({ ...medForm, stock: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">Expiry *</label>
                <input type="text" required className="w-full border p-2 rounded-sm" value={medForm.expiry} onChange={(e) => setMedForm({ ...medForm, expiry: e.target.value })} />
              </div>
              <div>
                <label className="font-bold text-gray-600 block mb-1">Packing</label>
                <input type="text" className="w-full border p-2 rounded-sm" value={medForm.packing} onChange={(e) => setMedForm({ ...medForm, packing: e.target.value })} />
              </div>
            </div>

            <button type="submit" className={`w-full text-white font-bold py-2.5 rounded-sm uppercase ${editingId ? 'bg-[#2874f0]' : 'bg-emerald-600'}`}>
              {editingId ? 'Update Medicine' : 'Save New Medicine'}
            </button>
          </form>

          <div className="lg:col-span-2 bg-white p-4 rounded-md shadow-sm border space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
              <h3 className="text-sm font-bold text-gray-700">All Medicines ({filteredAdminProducts.length.toLocaleString()})</h3>
              <div className="relative w-full sm:w-72">
                <input type="text" placeholder="Search Brand, Salt or Company..." className="w-full border border-gray-300 rounded-sm py-1.5 px-3 pr-8 text-xs" value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} />
                <Search className="w-4 h-4 text-gray-400 absolute right-2.5 top-2" />
              </div>
            </div>

            {loadingCatalog ? (
              <p className="text-center py-8 text-xs text-gray-500">Loading catalog...</p>
            ) : (
              <div className="space-y-2">
                {paginatedAdminProducts.map((p) => (
                  <div key={p.id} className="flex justify-between items-center border p-3 rounded-sm text-xs gap-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-gray-50 border rounded flex items-center justify-center overflow-hidden shrink-0">
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" /> : <Pill className="w-5 h-5 text-gray-300" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{p.name} <span className="text-xs font-normal text-gray-500">({p.company})</span></p>
                        <p className="text-gray-500 truncate">{p.salt} • Exp: {p.expiry}</p>
                        <p className="mt-0.5 font-semibold text-[#2874f0]">PTR: ₹{p.ptr} | MRP: ₹{p.mrp}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEditMedicine(p)} className="text-[#2874f0] hover:bg-blue-100 px-2.5 py-1.5 rounded flex items-center gap-1 font-bold">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      {firestoreIds.has(p.id) && (
                        <button onClick={() => handleDeleteMedicine(p.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalAdminPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t text-xs font-bold">
                <button disabled={adminPage === 1} onClick={() => setAdminPage((p) => Math.max(1, p - 1))} className="flex items-center gap-1 px-3 py-1.5 border rounded bg-gray-50 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span>Page {adminPage} of {totalAdminPages}</span>
                <button disabled={adminPage === totalAdminPages} onClick={() => setAdminPage((p) => Math.min(totalAdminPages, p + 1))} className="flex items-center gap-1 px-3 py-1.5 border rounded bg-gray-50 disabled:opacity-40">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: RMP CLINICS ==================== */}
      {activeTab === 'doctors' && (
        <div className="bg-white p-4 rounded-md shadow-sm border space-y-2">
          {doctors.map((d) => (
            <div key={d.uid} className="flex flex-wrap justify-between items-center border p-3.5 rounded-sm text-xs gap-3">
              <div>
                <p className="font-bold text-sm text-gray-900">{d.clinicName || 'Admin'} — {d.doctorName}</p>
                <p className="text-gray-600 mt-0.5">RMP: <b className="text-[#2874f0]">{d.rmpNo || 'N/A'}</b> • 📞 {d.phone} • ✉️ {d.email}</p>
                <p className="text-gray-400 mt-0.5">📍 {d.address}</p>
              </div>
              <button
                onClick={() => toggleVerifyDoctor(d.uid, d.verified)}
                className={`px-3.5 py-1.5 rounded-sm font-bold flex items-center gap-1.5 ${
                  d.verified ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {d.verified ? <><CheckCircle className="w-4 h-4" /> Verified RMP</> : <><ShieldAlert className="w-4 h-4" /> Pending Approval</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ==================== ADMIN GST BILL / TAX INVOICE MODAL ==================== */}
      {invoiceOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-md shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-lg text-gray-900">Wholesale B2B Tax Invoice</h3>
              <button onClick={() => setInvoiceOrder(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-gray-800">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <h4 className="font-extrabold text-base text-[#2874f0]">MedKart B2B Pharma Distributors</h4>
                  <p>Wholesale Drug License: 20B / 21B Verified</p>
                  <p>Status: <b>{invoiceOrder.status}</b> | Payment: <b>{formatPaymentLabel(invoiceOrder.paymentMode)} ({invoiceOrder.paymentStatus})</b></p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Invoice: INV-{invoiceOrder.id.slice(0, 6).toUpperCase()}</p>
                  <p>Date: {new Date(invoiceOrder.createdAt).toLocaleDateString('en-IN')}</p>
                  {invoiceOrder.utrNumber && <p>UTR: {invoiceOrder.utrNumber}</p>}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded border">
                <p className="font-bold text-sm">{invoiceOrder.clinicName} ({invoiceOrder.doctorName})</p>
                <p>RMP Reg No: <b>{invoiceOrder.rmpNo}</b> | Phone: <b>{invoiceOrder.phone}</b></p>
                <p>Delivery Address: {invoiceOrder.address}</p>
              </div>

              <table className="w-full border-collapse border border-gray-300 text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Medicine Name</th>
                    <th className="border p-2">Pack</th>
                    <th className="border p-2">Qty</th>
                    <th className="border p-2">PTR (₹)</th>
                    <th className="border p-2 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border p-2">{idx + 1}</td>
                      <td className="border p-2 font-semibold">{item.name}</td>
                      <td className="border p-2">{item.packing || '1 Strip'}</td>
                      <td className="border p-2">{item.qty}</td>
                      <td className="border p-2">₹{item.ptr.toFixed(2)}</td>
                      <td className="border p-2 text-right">₹{(item.ptr * item.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-right bg-gray-50 p-3 rounded border">
                  <p>Subtotal (PTR): <b>₹{invoiceOrder.subtotal.toFixed(2)}</b></p>
                  <p>GST (12%): <b>₹{invoiceOrder.gstTotal.toFixed(2)}</b></p>
                  <p className="text-base font-extrabold text-[#2874f0] border-t pt-1">Grand Total: ₹{invoiceOrder.grandTotal}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button onClick={() => setInvoiceOrder(null)} className="px-4 py-2 border rounded-sm text-xs font-bold">
                Close
              </button>
              <button onClick={() => window.print()} className="bg-[#2874f0] text-white px-5 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700">
                <Printer className="w-4 h-4" /> Print / Save PDF Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
