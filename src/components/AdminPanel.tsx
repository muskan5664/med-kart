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
  Clock,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ClipboardList,
  IndianRupee
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

const loadImage = (src: string, cors: boolean): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });

// Any format (png/jpg/webp/gif...) -> small JPEG data URL (white background for transparent images)
const imageToJpegDataUrl = (img: HTMLImageElement): string => {
  const MAX_SIZE = 450;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (width > height && width > MAX_SIZE) {
    height *= MAX_SIZE / width;
    width = MAX_SIZE;
  } else if (height > MAX_SIZE) {
    width *= MAX_SIZE / height;
    height = MAX_SIZE;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.75);
};

const compressMedicineImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const img = await loadImage(reader.result as string, false);
        resolve(imageToJpegDataUrl(img));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Share/page links -> direct image links
const normalizeImageUrl = (raw: string): string => {
  let u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
  const drive = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w600`;
  if (/dropbox\.com/i.test(u)) return u.replace(/([?&])dl=0/, '$1raw=1');
  const imgur = u.match(/^https?:\/\/(?:www\.)?imgur\.com\/([A-Za-z0-9]+)\/?$/);
  if (imgur) return `https://i.imgur.com/${imgur[1]}.jpg`;
  return u;
};

export default function AdminPanel() {
  const { isAdmin } = useAuth();
  // Default 'catalog' tab so Add / Edit / Delete medicine tools are immediately visible
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'doctors'>('orders');

  // Orders States (Real-time)
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatus>('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Status Confirmation Modal & Toast States
  const [statusModal, setStatusModal] = useState<{ order: Order; nextStatus: OrderStatus } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Catalog States
  const [products, setProducts] = useState<Medicine[]>([]);
  const [firestoreIds, setFirestoreIds] = useState<Set<string>>(new Set());
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const ADMIN_PAGE_SIZE = 20;
  const [medForm, setMedForm] = useState(EMPTY_MED);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageLink, setImageLink] = useState('');
  const [imageState, setImageState] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; msg: string }>({ status: 'idle', msg: '' });

  // RMP Doctors States
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [doctorFilter, setDoctorFilter] = useState<'All' | 'Pending' | 'Verified'>('All');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Real-Time Listener for Orders & Users
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
      const rawFsList = pSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine & { hidden?: boolean }));
      const fsIdSet = new Set(rawFsList.map((item) => item.id));
      setFirestoreIds(fsIdSet);

      // Visible Firestore products (exclude soft-deleted static items)
      const visibleFsList = rawFsList.filter((item) => !item.hidden);

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

      setProducts([...visibleFsList, ...staticList]);
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
      <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-red-600 font-bold">
        Access Denied: Admin login required.
      </div>
    );
  }

  // Open Confirmation Popup before changing Order Status
  const openStatusConfirmation = (order: Order, nextStatus: OrderStatus) => {
    setCancelReason('');
    setStatusModal({ order, nextStatus });
  };

  // Confirm & Save Status Update to Firestore
  const confirmOrderStatusUpdate = async () => {
    if (!statusModal) return;
    const { order, nextStatus } = statusModal;
    setUpdatingOrderId(order.id);
    try {
      const updatePayload: any = { status: nextStatus };
      if (nextStatus === 'Cancelled' && cancelReason.trim()) {
        updatePayload.cancelReason = cancelReason.trim();
      }
      await updateDoc(doc(db, 'orders', order.id), updatePayload);
      showToast(`Order #${order.id.slice(0, 6).toUpperCase()} status updated to "${nextStatus}"!`);
      setStatusModal(null);
    } catch (err: any) {
      alert('Status update failed: ' + err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleTogglePayment = async (order: Order) => {
    const nextPayStatus = order.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
    if (!window.confirm(`Kya aap Order #${order.id.slice(0, 6).toUpperCase()} ka payment "${nextPayStatus}" mark karna chahte hain?`)) {
      return;
    }
    setUpdatingOrderId(order.id);
    try {
      await updateDoc(doc(db, 'orders', order.id), { paymentStatus: nextPayStatus });
      showToast(`Payment marked as ${nextPayStatus}!`);
    } catch (err: any) {
      alert('Payment status update failed: ' + err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Any image link (png/jpg/webp/share links) -> fetched, converted to small JPEG, stored with the product
  const importImageFromLink = async (raw: string): Promise<string | null> => {
    const url = normalizeImageUrl(raw);
    if (!url) return null;
    setImageState({ status: 'loading', msg: 'Image la rahe hain…' });
    const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=450&h=450&fit=inside&output=jpg&q=75`;
    for (const src of [url, proxied]) {
      try {
        const img = await loadImage(src, true);
        const dataUrl = imageToJpegDataUrl(img);
        setMedForm((prev) => ({ ...prev, imageUrl: dataUrl }));
        setImageLink('');
        setImageState({ status: 'ok', msg: 'Image add ho gayi ✓' });
        return dataUrl;
      } catch {
        /* try next source */
      }
    }
    setImageState({
      status: 'error',
      msg: 'Is link se image nahi mili. Image par right-click → "Copy image address" wala link daalein, ya upar se file upload karein.'
    });
    return null;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressMedicineImage(file);
      setMedForm((prev) => ({ ...prev, imageUrl: compressed }));
      setImageLink('');
      setImageState({ status: 'ok', msg: 'Image add ho gayi ✓' });
    } catch {
      alert('Image upload failed.');
    }
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medForm.name.trim() || !medForm.salt.trim() || !medForm.company.trim()) {
      return alert('Name, Salt aur Company zaroori hain.');
    }
    if (![medForm.mrp, medForm.ptr, medForm.gst, medForm.stock].every((v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0)) {
      return alert('MRP, PTR, GST aur Stock sahi number hone chahiye.');
    }
    let finalImage = medForm.imageUrl;
    if (imageLink.trim()) {
      const got = await importImageFromLink(imageLink);
      if (got) finalImage = got;
      else if (!window.confirm('Image link load nahi hui. Bina nayi image ke save karein?')) return;
    }
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
      imageUrl: finalImage || '',
      hidden: false
    };

    try {
      if (editingId) {
        await setDoc(doc(db, 'products', editingId), payload, { merge: true });
        showToast('Medicine updated successfully!');
      } else {
        await addDoc(collection(db, 'products'), payload);
        showToast('New medicine added to store!');
      }
    } catch (err: any) {
      return alert('Save failed: ' + (err?.message || err));
    }

    setMedForm(EMPTY_MED);
    setEditingId(null);
    setImageLink('');
    setImageState({ status: 'idle', msg: '' });
    loadCatalog();
  };

  const startEditMedicine = (p: Medicine) => {
    setEditingId(p.id);
    setImageLink('');
    setImageState({ status: 'idle', msg: '' });
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

  // Delete Custom Medicine OR Hide Static JSON Medicine
  const handleDeleteMedicine = async (p: Medicine) => {
    if (!window.confirm(`Kya aap "${p.name}" ko catalog se delete karna chahte hain?`)) return;
    try {
      if (firestoreIds.has(p.id) && !p.id.startsWith('med-')) {
        await deleteDoc(doc(db, 'products', p.id));
      } else {
        await setDoc(doc(db, 'products', p.id), { ...p, hidden: true }, { merge: true });
      }
    } catch (err: any) {
      return alert('Delete failed: ' + (err?.message || err));
    }
    if (editingId === p.id) {
      setEditingId(null);
      setMedForm(EMPTY_MED);
    }
    showToast(`"${p.name}" deleted from catalog!`);
    loadCatalog();
  };

  const toggleVerifyDoctor = async (uid: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { verified: !current });
      showToast(!current ? 'RMP Doctor Verified!' : 'RMP Verification Revoked');
    } catch (err: any) {
      alert('Verify update failed: ' + (err?.message || err));
    }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? o.grandTotal : 0), 0);
  const pendingOrdersCount = orders.filter((o) => o.status === 'Confirmed' || o.status === 'Packed').length;

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-teal-100 text-teal-800 border-teal-300';
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

  const inputCls =
    'w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-teal-600/10 focus:outline-none transition';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5';
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
  const STEPS: OrderStatus[] = ['Confirmed', 'Packed', 'Shipped', 'Delivered'];

  const pendingDoctors = doctors.filter((d) => !d.verified && d.role !== 'admin').length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length;

  const livePtr = Number(medForm.ptr);
  const liveMrp = Number(medForm.mrp);
  const liveMargin = liveMrp > 0 && livePtr > 0 ? ((liveMrp - livePtr) / liveMrp) * 100 : null;

  const filteredDoctors = doctors.filter((d) => {
    const q = doctorSearch.toLowerCase().trim();
    const matchesFilter =
      doctorFilter === 'All' || (doctorFilter === 'Pending' ? !d.verified : !!d.verified);
    const matchesQuery =
      !q ||
      (d.clinicName || '').toLowerCase().includes(q) ||
      (d.doctorName || '').toLowerCase().includes(q) ||
      (d.rmpNo || '').toLowerCase().includes(q) ||
      (d.phone || '').includes(q) ||
      (d.email || '').toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const tabs = [
    { id: 'orders' as const, label: 'Orders', icon: PackageCheck, count: orders.length, alert: pendingOrdersCount },
    { id: 'catalog' as const, label: 'Catalog', icon: Pill, count: products.length, alert: 0 },
    { id: 'doctors' as const, label: 'RMP Clinics', icon: Users, count: doctors.length, alert: pendingDoctors }
  ];

  const kpis = [
    { label: 'Total orders', value: orders.length.toLocaleString('en-IN'), sub: `${pendingOrdersCount} to fulfil`, subTone: pendingOrdersCount ? 'text-amber-600' : 'text-slate-400', icon: ClipboardList, tint: 'bg-teal-50 text-teal-700' },
    { label: 'Revenue', value: inr(totalRevenue), sub: 'Excludes cancelled', subTone: 'text-slate-400', icon: IndianRupee, tint: 'bg-emerald-50 text-emerald-700' },
    { label: 'Catalog items', value: products.length.toLocaleString('en-IN'), sub: `${lowStockCount} low stock`, subTone: lowStockCount ? 'text-amber-600' : 'text-slate-400', icon: Pill, tint: 'bg-sky-50 text-sky-700' },
    { label: 'RMP clinics', value: doctors.length.toLocaleString('en-IN'), sub: `${pendingDoctors} awaiting approval`, subTone: pendingDoctors ? 'text-amber-600' : 'text-slate-400', icon: Users, tint: 'bg-violet-50 text-violet-700' }
  ];

  const Pager = ({ page, total, onChange }: { page: number; total: number; onChange: (n: number) => void }) =>
    total > 1 ? (
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
        <span>Page {page} of {total}</span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => onChange(page - 1)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button disabled={page === total} onClick={() => onChange(page + 1)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    ) : null;

  const searchBox = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <div className="relative w-full sm:w-80">
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder={placeholder}
        className={`${inputCls} pl-9`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-6 relative animate-fade-up">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 left-5 sm:left-auto z-[60] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Console</h2>
          <p className="text-sm text-slate-500 mt-0.5">Orders, catalog aur RMP clinics ek hi jagah se manage karein.</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">{k.label}</p>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tabular-nums truncate">{k.value}</p>
              <p className={`text-xs font-medium mt-1 ${k.subTone}`}>{k.sub}</p>
            </div>
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${k.tint}`}>
              <k.icon className="w-5 h-5" />
            </span>
          </div>
        ))}
      </div>

      {/* Pending approvals banner */}
      {pendingDoctors > 0 && activeTab !== 'doctors' && (
        <button
          onClick={() => { setActiveTab('doctors'); setDoctorFilter('Pending'); }}
          className="w-full flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl px-4 py-3 text-sm text-left hover:bg-amber-100 transition"
        >
          <span className="flex items-center gap-2.5 font-semibold">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            {pendingDoctors} RMP clinic{pendingDoctors > 1 ? 's' : ''} verification ka intezaar kar rahe hain
          </span>
          <span className="flex items-center gap-1 font-bold shrink-0">Review <ArrowRight className="w-4 h-4" /></span>
        </button>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative px-4 py-3 text-sm font-bold flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px transition ${
                active ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold tabular-nums ${active ? 'bg-teal-50 text-brand' : 'bg-slate-100 text-slate-500'}`}>
                {t.count.toLocaleString('en-IN')}
              </span>
              {t.alert > 0 && <span className="w-2 h-2 rounded-full bg-orange-500" title={`${t.alert} need attention`} />}
            </button>
          );
        })}
      </div>

      {/* ==================== CATALOG ==================== */}
      {activeTab === 'catalog' && (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
          <form onSubmit={handleSaveMedicine} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-brand flex items-center justify-center">
                  {editingId ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                </span>
                {editingId ? 'Edit medicine' : 'Add medicine'}
              </h3>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setMedForm(EMPTY_MED); }} className="text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Photo */}
              <div>
                <span className={labelCls}>Photo</span>
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                  {medForm.imageUrl ? (
                    <div className="relative w-16 h-16 bg-white border rounded-lg overflow-hidden shrink-0">
                      <img src={medForm.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                      <button type="button" onClick={() => setMedForm({ ...medForm, imageUrl: '' })} className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl" aria-label="Remove photo">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-white border rounded-lg flex items-center justify-center text-slate-300 shrink-0">
                      <ImagePlus className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-brand hover:file:bg-teal-100" />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="url"
                        placeholder="…ya image ka link paste karein (png/jpg/webp)"
                        className={`${inputCls} h-9 text-xs`}
                        value={imageLink}
                        onChange={(e) => { setImageLink(e.target.value); if (imageState.status !== 'idle') setImageState({ status: 'idle', msg: '' }); }}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text');
                          if (text.trim()) { e.preventDefault(); setImageLink(text.trim()); importImageFromLink(text); }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); importImageFromLink(imageLink); } }}
                      />
                      <button
                        type="button"
                        disabled={!imageLink.trim() || imageState.status === 'loading'}
                        onClick={() => importImageFromLink(imageLink)}
                        className="h-9 px-3 rounded-lg bg-brand text-white text-xs font-bold disabled:opacity-40 shrink-0"
                      >
                        {imageState.status === 'loading' ? '…' : 'Lo'}
                      </button>
                    </div>
                    {imageState.msg && (
                      <p className={`text-[11px] font-semibold ${imageState.status === 'error' ? 'text-red-600' : imageState.status === 'ok' ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {imageState.msg}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Brand name *</label>
                <input type="text" required placeholder="e.g. Dolo 650mg Tablet" className={inputCls} value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Salt / composition *</label>
                <input type="text" required placeholder="e.g. Paracetamol IP 650mg" className={inputCls} value={medForm.salt} onChange={(e) => setMedForm({ ...medForm, salt: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Company *</label>
                  <input type="text" required placeholder="Micro Labs" className={inputCls} value={medForm.company} onChange={(e) => setMedForm({ ...medForm, company: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Category *</label>
                  <select className={inputCls} value={medForm.category} onChange={(e) => setMedForm({ ...medForm, category: e.target.value })}>
                    <option>Tablets & Caps</option>
                    <option>Syrups & Drops</option>
                    <option>Injections</option>
                    <option>Ointments & Derma</option>
                    <option>Surgical & Care</option>
                    <option>Veterinary</option>
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Pricing</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>MRP (₹) *</label>
                    <input type="number" step="any" min="0" required placeholder="120" className={inputCls} value={medForm.mrp} onChange={(e) => setMedForm({ ...medForm, mrp: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>PTR (₹) *</label>
                    <input type="number" step="any" min="0" required placeholder="78" className={inputCls} value={medForm.ptr} onChange={(e) => setMedForm({ ...medForm, ptr: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>GST</label>
                    <select className={inputCls} value={medForm.gst} onChange={(e) => setMedForm({ ...medForm, gst: e.target.value })}>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                    </select>
                  </div>
                </div>
                {liveMargin !== null && (
                  <p className={`mt-2 text-xs font-semibold rounded-lg px-3 py-2 ${liveMargin < 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {liveMargin < 0 ? 'PTR, MRP se zyada hai — check karein.' : `Doctor margin: ${liveMargin.toFixed(1)}% (₹${(liveMrp - livePtr).toFixed(2)} per unit)`}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Stock</label>
                  <input type="number" required className={inputCls} value={medForm.stock} onChange={(e) => setMedForm({ ...medForm, stock: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Expiry *</label>
                  <input type="text" required placeholder="12/2028" className={inputCls} value={medForm.expiry} onChange={(e) => setMedForm({ ...medForm, expiry: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Packing</label>
                  <input type="text" placeholder="10 Tabs" className={inputCls} value={medForm.packing} onChange={(e) => setMedForm({ ...medForm, packing: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="sticky bottom-[64px] lg:bottom-0 z-10 px-5 py-3 bg-white/95 backdrop-blur border-t border-slate-200 rounded-b-2xl shadow-[0_-6px_12px_-8px_rgba(15,23,42,0.18)]">
              <button type="submit" className="w-full h-11 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl text-sm shadow-sm transition active:scale-[0.99]">
                {editingId ? 'Update medicine' : 'Save medicine'}
              </button>
            </div>
          </form>

          {/* Catalog list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
            <div className="flex flex-wrap justify-between items-center gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                All medicines <span className="text-slate-400 font-semibold text-sm ml-1">{filteredAdminProducts.length.toLocaleString('en-IN')}</span>
              </h3>
              {searchBox(adminSearch, setAdminSearch, 'Search brand, salt or company…')}
            </div>

            {loadingCatalog ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4, 5].map((n) => <div key={n} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : paginatedAdminProducts.length === 0 ? (
              <p className="text-center py-14 text-sm text-slate-500">Koi medicine nahi mili.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="text-left font-bold px-5 py-3">Medicine</th>
                        <th className="text-left font-bold px-3 py-3">Pack / Expiry</th>
                        <th className="text-right font-bold px-3 py-3">PTR</th>
                        <th className="text-right font-bold px-3 py-3">MRP</th>
                        <th className="text-right font-bold px-3 py-3">Stock</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedAdminProducts.map((p) => (
                        <tr key={p.id} className={editingId === p.id ? 'bg-teal-50/60' : 'hover:bg-slate-50'}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="w-full h-full object-contain" /> : <Pill className="w-4 h-4 text-slate-300" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate max-w-[260px]">{p.name}</p>
                                <p className="text-xs text-slate-500 truncate max-w-[260px]">{p.company} · {p.salt}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-600">
                            <p className="truncate max-w-[130px]">{p.packing}</p>
                            <p className="text-slate-400">Exp {p.expiry}</p>
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums">₹{p.ptr}</td>
                          <td className="px-3 py-3 text-right text-slate-500 tabular-nums">₹{p.mrp}</td>
                          <td className="px-3 py-3 text-right">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full tabular-nums ${
                              p.stock <= 0 ? 'bg-red-50 text-red-600' : p.stock <= 10 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {p.stock <= 0 ? 'Out' : p.stock}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => startEditMedicine(p)} className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-brand text-slate-700 text-xs font-bold flex items-center gap-1.5 transition">
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button onClick={() => handleDeleteMedicine(p)} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition" title="Delete" aria-label={`Delete ${p.name}`}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {paginatedAdminProducts.map((p) => (
                    <div key={p.id} className={`p-4 ${editingId === p.id ? 'bg-teal-50/60' : ''}`}>
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                          {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="w-full h-full object-contain" /> : <Pill className="w-5 h-5 text-slate-300" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-sm leading-snug">{p.name}</p>
                          <p className="text-xs text-slate-500 truncate">{p.company} · {p.salt}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{p.packing} · Exp {p.expiry}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-baseline gap-2 tabular-nums">
                          <span className="font-extrabold text-slate-900">₹{p.ptr}</span>
                          <span className="text-xs text-slate-400 line-through">₹{p.mrp}</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            p.stock <= 0 ? 'bg-red-50 text-red-600' : p.stock <= 10 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {p.stock <= 0 ? 'Out' : `${p.stock} in stock`}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => startEditMedicine(p)} className="h-9 px-3 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button onClick={() => handleDeleteMedicine(p)} className="h-9 w-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center" aria-label={`Delete ${p.name}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Pager page={adminPage} total={totalAdminPages} onChange={setAdminPage} />
          </div>
        </div>
      )}

      {/* ==================== ORDERS ==================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-full">
              {(['All', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'] as const).map((st) => {
                const count = st === 'All' ? orders.length : orders.filter((o) => o.status === st).length;
                const active = orderStatusFilter === st;
                return (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition ${
                      active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {st} <span className={active ? 'text-slate-300' : 'text-slate-400'}>{count}</span>
                  </button>
                );
              })}
            </div>
            {searchBox(orderSearch, setOrderSearch, 'Order ID, clinic, phone, UTR…')}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white p-14 rounded-2xl text-center border border-slate-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <PackageCheck className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Is filter me koi order nahi mila.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((o) => {
                const open = expandedOrderId === o.id;
                const stepIdx = STEPS.indexOf(o.status);
                return (
                  <div key={o.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${open ? 'border-teal-300' : 'border-slate-200'}`}>
                    {/* Summary row */}
                    <button
                      onClick={() => setExpandedOrderId(open ? null : o.id)}
                      aria-expanded={open}
                      className="w-full text-left px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-5 hover:bg-slate-50/70 transition"
                    >
                      <div className="min-w-0 flex-1 grid sm:grid-cols-[150px_1fr] gap-x-6 gap-y-1.5 items-center">
                        <div className="flex sm:flex-col sm:items-start items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">#{o.id.slice(0, 8).toUpperCase()}</span>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusStyle(o.status)}`}>{o.status}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {o.clinicName} <span className="font-medium text-slate-500">· {o.doctorName}</span>
                          </p>
                          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(o.createdAt)}</span>
                            <span>{o.items.length} item{o.items.length > 1 ? 's' : ''}</span>
                            <span className={`font-bold ${o.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {o.paymentStatus === 'Paid' ? 'Paid' : 'Payment pending'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-extrabold text-slate-900 tabular-nums">{inr(o.grandTotal)}</p>
                        <p className="text-[11px] text-slate-400 hidden sm:block">{formatPaymentLabel(o.paymentMode)}</p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>

                    {open && (
                      <div className="border-t border-slate-100">
                        {/* Progress */}
                        <div className="px-4 sm:px-5 pt-5">
                          {o.status === 'Cancelled' ? (
                            <div className="flex items-center gap-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                              <XCircle className="w-4 h-4 shrink-0" />
                              Order cancelled{(o as any).cancelReason ? ` — ${(o as any).cancelReason}` : ''}
                            </div>
                          ) : (
                            <ol className="flex items-center">
                              {STEPS.map((s, i) => {
                                const done = i <= stepIdx;
                                return (
                                  <li key={s} className="flex items-center flex-1 last:flex-none">
                                    <div className="flex flex-col items-center gap-1.5">
                                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-brand text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                                      </span>
                                      <span className={`text-[11px] font-semibold ${done ? 'text-slate-800' : 'text-slate-400'}`}>{s}</span>
                                    </div>
                                    {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 mx-2 mb-5 rounded ${i < stepIdx ? 'bg-brand' : 'bg-slate-200'}`} />}
                                  </li>
                                );
                              })}
                            </ol>
                          )}
                        </div>

                        {/* Details */}
                        <div className="p-4 sm:p-5 grid md:grid-cols-3 gap-4 text-sm">
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer</p>
                            <p className="font-bold text-slate-900">{o.clinicName}</p>
                            <p className="text-slate-600">{o.doctorName}</p>
                            <p className="text-slate-600 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{o.phone || 'No phone'}
                              <span className="bg-teal-50 text-brand px-1.5 py-0.5 rounded font-bold text-[10px]">RMP {o.rmpNo}</span>
                            </p>
                            <p className="text-slate-600 flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" /><span>{o.address}</span></p>
                          </div>

                          <div className="space-y-2 bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />Payment</p>
                            <p className="font-semibold text-slate-800">{formatPaymentLabel(o.paymentMode)}</p>
                            {o.utrNumber && o.utrNumber !== 'COD' && (
                              <p className="text-xs text-slate-600">UTR <span className="font-mono font-bold bg-white px-1.5 py-0.5 border rounded">{o.utrNumber}</span></p>
                            )}
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${o.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {o.paymentStatus === 'Paid' ? 'Paid' : 'Pending'}
                              </span>
                              <button disabled={updatingOrderId === o.id} onClick={() => handleTogglePayment(o)} className="text-xs font-bold text-brand hover:underline disabled:opacity-50">
                                Mark as {o.paymentStatus === 'Paid' ? 'pending' : 'paid'}
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-1.5 text-sm">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount</p>
                            <div className="flex justify-between text-slate-600"><span>Subtotal (PTR)</span><span className="tabular-nums">₹{o.subtotal?.toFixed(2)}</span></div>
                            <div className="flex justify-between text-slate-600"><span>GST</span><span className="tabular-nums">₹{o.gstTotal?.toFixed(2)}</span></div>
                            <div className="flex justify-between font-extrabold text-slate-900 text-base border-t border-slate-200 pt-2 mt-1"><span>Total</span><span className="tabular-nums">₹{o.grandTotal}</span></div>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="px-4 sm:px-5 pb-5">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Items ({o.items.length})</p>
                          <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                                <tr>
                                  <th className="text-left font-bold px-4 py-2.5">Medicine</th>
                                  <th className="text-right font-bold px-3 py-2.5">PTR</th>
                                  <th className="text-right font-bold px-3 py-2.5">Qty</th>
                                  <th className="text-right font-bold px-4 py-2.5">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {o.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-2.5">
                                      <p className="font-semibold text-slate-800">{item.name}</p>
                                      <p className="text-xs text-slate-400">{item.packing || '1 Strip'}</p>
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">₹{item.ptr}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{item.qty}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-900">₹{(item.ptr * item.qty).toFixed(0)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="px-4 sm:px-5 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mr-1"><Truck className="w-4 h-4" />Update status</span>
                            {(['Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map((st) => {
                              const isCurrent = o.status === st;
                              return (
                                <button
                                  key={st}
                                  disabled={updatingOrderId === o.id || isCurrent}
                                  onClick={() => openStatusConfirmation(o, st)}
                                  className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                    isCurrent
                                      ? st === 'Cancelled' ? 'bg-red-600 text-white cursor-default' : 'bg-brand text-white cursor-default'
                                      : st === 'Cancelled'
                                      ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                                      : 'bg-white border border-slate-300 text-slate-700 hover:border-brand hover:text-brand'
                                  }`}
                                >
                                  {isCurrent && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                          <button onClick={() => setInvoiceOrder(o)} className="h-9 px-4 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition">
                            <Printer className="w-3.5 h-3.5" /> GST bill
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== DOCTORS ==================== */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
            <div className="flex gap-1.5">
              {(['All', 'Pending', 'Verified'] as const).map((f) => {
                const count = f === 'All' ? doctors.length : doctors.filter((d) => (f === 'Pending' ? !d.verified : d.verified)).length;
                const active = doctorFilter === f;
                return (
                  <button key={f} onClick={() => setDoctorFilter(f)} className={`px-3.5 py-2 rounded-full text-xs font-bold border transition ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    {f} <span className={active ? 'text-slate-300' : 'text-slate-400'}>{count}</span>
                  </button>
                );
              })}
            </div>
            {searchBox(doctorSearch, setDoctorSearch, 'Clinic, doctor, RMP no, phone…')}
          </div>

          {filteredDoctors.length === 0 ? (
            <p className="text-center py-14 text-sm text-slate-500">Koi clinic nahi mili.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredDoctors.map((d) => (
                <li key={d.uid} className="px-4 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-teal-50 text-brand font-extrabold flex items-center justify-center shrink-0">
                      {(d.clinicName || d.doctorName || d.email || '?').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {d.clinicName || 'Admin'} <span className="font-medium text-slate-500">· {d.doctorName}</span>
                      </p>
                      <p className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        <span>RMP <b className="text-slate-700">{d.rmpNo || 'N/A'}</b></span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{d.phone}</span>
                        <span className="truncate">{d.email}</span>
                      </p>
                      {d.address && <p className="text-xs text-slate-400 flex items-start gap-1 mt-0.5"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{d.address}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleVerifyDoctor(d.uid, d.verified)}
                    className={`h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                      d.verified
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                        : 'bg-brand text-white hover:bg-brand-dark'
                    }`}
                    title={d.verified ? 'Click to revoke verification' : 'Click to approve'}
                  >
                    {d.verified ? <><CheckCircle className="w-4 h-4" /> Verified</> : <><ShieldAlert className="w-4 h-4" /> Approve</>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ==================== STATUS CONFIRM MODAL ==================== */}
      {statusModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setStatusModal(null)}>
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusModal.nextStatus === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-brand'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </span>
                Confirm status change
              </h3>
              <button onClick={() => setStatusModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1 text-xs text-slate-500">
                <p>Order <b className="text-slate-900 font-mono">#{statusModal.order.id.slice(0, 8).toUpperCase()}</b></p>
                <p>Clinic <b className="text-slate-900">{statusModal.order.clinicName} ({statusModal.order.doctorName})</b></p>
                <p>Amount <b className="text-slate-900">{inr(statusModal.order.grandTotal)}</b></p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(statusModal.order.status)}`}>{statusModal.order.status}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(statusModal.nextStatus)}`}>{statusModal.nextStatus}</span>
              </div>

              <p className="text-slate-500 text-center text-xs">Yeh status customer ko turant dikhne lagega.</p>

              {statusModal.nextStatus === 'Cancelled' && (
                <div>
                  <label className={labelCls}>Cancellation reason (optional)</label>
                  <input type="text" placeholder="e.g. Stock unavailable / Doctor requested cancel" className={inputCls} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 px-5 py-4 bg-slate-50 border-t border-slate-100">
              <button type="button" onClick={() => setStatusModal(null)} className="h-10 px-4 border border-slate-300 bg-white rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100">
                Go back
              </button>
              <button
                type="button"
                disabled={updatingOrderId === statusModal.order.id}
                onClick={confirmOrderStatusUpdate}
                className={`h-10 px-5 rounded-lg text-sm font-bold text-white shadow-sm disabled:opacity-60 ${statusModal.nextStatus === 'Cancelled' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'}`}
              >
                {updatingOrderId === statusModal.order.id ? 'Updating…' : `Mark ${statusModal.nextStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== GST INVOICE MODAL ==================== */}
      {invoiceOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setInvoiceOrder(null)}>
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-slate-900">Tax invoice</h3>
              <button onClick={() => setInvoiceOrder(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>

            <div id="printable-order-sheet" className="p-6 space-y-5 text-xs text-slate-800 bg-white">
              <div className="flex justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h4 className="font-extrabold text-lg text-brand">MedKart B2B Pharma Distributors</h4>
                  <p className="text-slate-500 mt-0.5">Wholesale Drug License: 20B / 21B Verified</p>
                  <p className="mt-1">Status: <b>{invoiceOrder.status}</b> · Payment: <b>{formatPaymentLabel(invoiceOrder.paymentMode)} ({invoiceOrder.paymentStatus})</b></p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">INV-{invoiceOrder.id.slice(0, 6).toUpperCase()}</p>
                  <p className="text-slate-500">{new Date(invoiceOrder.createdAt).toLocaleDateString('en-IN')}</p>
                  {invoiceOrder.utrNumber && <p className="text-slate-500">UTR: {invoiceOrder.utrNumber}</p>}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bill to</p>
                <p className="font-bold text-sm">{invoiceOrder.clinicName} ({invoiceOrder.doctorName})</p>
                <p>RMP Reg No: <b>{invoiceOrder.rmpNo}</b> · Phone: <b>{invoiceOrder.phone}</b></p>
                <p className="text-slate-600">{invoiceOrder.address}</p>
              </div>

              <table className="w-full text-left">
                <thead className="border-y border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2">Medicine</th>
                    <th className="py-2">Pack</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">PTR</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-2 text-slate-400">{idx + 1}</td>
                      <td className="py-2 font-semibold">{item.name}</td>
                      <td className="py-2 text-slate-500">{item.packing || '1 Strip'}</td>
                      <td className="py-2 text-right">{item.qty}</td>
                      <td className="py-2 text-right">₹{item.ptr.toFixed(2)}</td>
                      <td className="py-2 text-right font-semibold">₹{(item.ptr * item.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600"><span>Subtotal (PTR)</span><b>₹{invoiceOrder.subtotal.toFixed(2)}</b></div>
                  <div className="flex justify-between text-slate-600"><span>GST</span><b>₹{invoiceOrder.gstTotal.toFixed(2)}</b></div>
                  <div className="flex justify-between text-base font-extrabold text-brand border-t border-slate-200 pt-2"><span>Grand total</span><span>₹{invoiceOrder.grandTotal}</span></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setInvoiceOrder(null)} className="h-10 px-4 border border-slate-300 bg-white rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100">Close</button>
              <button onClick={() => window.print()} className="h-10 bg-brand text-white px-5 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-brand-dark">
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
