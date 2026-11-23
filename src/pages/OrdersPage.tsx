import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Package, Printer, Clock, Truck, CheckCircle2, X, PackageCheck, XCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus } from '../types';

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);

  // Real-time listener: Admin status change updates user screen instantly
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Order))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const steps: OrderStatus[] = ['Confirmed', 'Packed', 'Shipped', 'Delivered'];

  const getStepIndex = (status: OrderStatus) => {
    return steps.indexOf(status);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[#2874f0]" />
          <h2 className="text-lg font-bold text-gray-800">My Clinic Orders & Live Tracking ({orders.length})</h2>
        </div>
        <span className="text-[11px] bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-bold border border-green-200">
          ● Live Status Active
        </span>
      </div>

      {loading ? (
        <div className="bg-white p-8 rounded-md text-center text-gray-500">Orders load ho rahe hain...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white p-10 rounded-md text-center text-gray-500 border">
          Abhi tak koi order place nahi kiya gaya hai.
        </div>
      ) : (
        orders.map((order) => {
          const currentStep = getStepIndex(order.status);
          const isCancelled = order.status === 'Cancelled';

          return (
            <div key={order.id} className="bg-white p-5 rounded-md shadow-sm border border-gray-200/80 space-y-4">
              {/* Top Info */}
              <div className="flex flex-wrap justify-between items-start gap-3 border-b pb-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-gray-900">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isCancelled
                        ? 'bg-red-100 text-red-700'
                        : order.status === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-[#2874f0]'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(order.createdAt).toLocaleString('en-IN')} • Payment: <b>{order.paymentMode}</b> ({order.paymentStatus})
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total Bill</p>
                    <p className="text-lg font-extrabold text-gray-900">₹{order.grandTotal}</p>
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(order)}
                    className="bg-blue-50 hover:bg-blue-100 text-[#2874f0] border border-blue-200 px-3 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" /> Tax Invoice
                  </button>
                </div>
              </div>

              {/* Flipkart-Style Live Progress Tracker */}
              {isCancelled ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-xs font-bold flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" /> Yeh order Admin dwara cancel kar diya gaya hai.
                </div>
              ) : (
                <div className="py-2 px-1">
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                    {steps.map((step, idx) => {
                      const done = idx <= currentStep;
                      return (
                        <div key={step} className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-1 ${
                            done ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-200 text-gray-400'
                          }`}>
                            {idx === 0 && <CheckCircle2 className="w-4 h-4" />}
                            {idx === 1 && <PackageCheck className="w-4 h-4" />}
                            {idx === 2 && <Truck className="w-4 h-4" />}
                            {idx === 3 && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          <span className={done ? 'text-emerald-700' : 'text-gray-400'}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {order.items.map((item, i) => (
                  <div key={i} className="bg-gray-50 p-2.5 rounded border border-gray-100 flex justify-between">
                    <span className="font-semibold text-gray-800 truncate pr-2">{item.name}</span>
                    <span className="text-gray-600 shrink-0">{item.qty} × ₹{item.ptr}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 flex items-center gap-1 pt-1">
                <Truck className="w-3.5 h-3.5 text-gray-400" /> Delivery Address: <b>{order.doctorName}</b> ({order.phone}) — {order.address}
              </p>
            </div>
          );
        })
      )}

      {/* GST TAX INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-md shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-lg text-gray-900">B2B GST Tax Invoice</h3>
              <button onClick={() => setSelectedInvoice(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-gray-800">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <h4 className="font-extrabold text-base text-[#2874f0]">MedKart B2B Pharma Distributors</h4>
                  <p>Wholesale Drug License: 20B / 21B</p>
                  <p>Order Status: <b>{selectedInvoice.status}</b></p>
                </div>
                <div className="text-right">
                  <p className="font-bold">Invoice No: INV-{selectedInvoice.id.slice(0, 6).toUpperCase()}</p>
                  <p>Date: {new Date(selectedInvoice.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <p className="font-bold">Billed To: {selectedInvoice.clinicName} ({selectedInvoice.doctorName})</p>
                <p>RMP Reg No: {selectedInvoice.rmpNo} | Phone: {selectedInvoice.phone}</p>
                <p>Address: {selectedInvoice.address}</p>
              </div>

              <table className="w-full border-collapse border border-gray-300 text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">Medicine Name</th>
                    <th className="border p-2">Qty</th>
                    <th className="border p-2">PTR (₹)</th>
                    <th className="border p-2">GST</th>
                    <th className="border p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border p-2 font-medium">{item.name}</td>
                      <td className="border p-2">{item.qty}</td>
                      <td className="border p-2">₹{item.ptr.toFixed(2)}</td>
                      <td className="border p-2">{item.gst || 12}%</td>
                      <td className="border p-2 text-right">₹{(item.ptr * item.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-60 space-y-1 text-right">
                  <p>Subtotal: <b>₹{selectedInvoice.subtotal.toFixed(2)}</b></p>
                  <p>Total GST: <b>₹{selectedInvoice.gstTotal.toFixed(2)}</b></p>
                  <p className="text-sm font-extrabold border-t pt-1">Grand Total: ₹{selectedInvoice.grandTotal}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button onClick={() => window.print()} className="bg-[#2874f0] text-white px-5 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700">
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
