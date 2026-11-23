import React from 'react';
import { Order } from '../types';
import { Printer, X, MessageSquare, Mail, Truck, CheckCircle2 } from 'lucide-react';
import { ADMIN_WHATSAPP_NUMBER, BOOTSTRAPPED_ADMIN_EMAIL } from '../lib/firebase';

interface OrderInvoiceModalProps {
  order: Order;
  isConfirmation?: boolean;
  onClose: () => void;
}

export const OrderInvoiceModal: React.FC<OrderInvoiceModalProps> = ({
  order,
  isConfirmation = false,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const buildWhatsAppUrl = () => {
    const itemLines = (order.items || [])
      .slice(0, 15)
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.name} (${it.pack}) x ${it.qty} = Rs.${it.lineTotal.toFixed(2)}`
      )
      .join('\n');

    const text = [
      `*AMAN MEDICAL - NEW DOCTOR ORDER*`,
      `Order No: *${order.orderNumber}*`,
      `Doctor: ${order.doctorName}`,
      `Clinic: ${order.clinicName}`,
      `City: ${order.doctorCity} | Phone: ${order.doctorPhone}`,
      `Status: ${order.status}`,
      order.courierName ? `Courier: ${order.courierName} (AWB: ${order.trackingNo || 'N/A'})` : '',
      `--------------------------`,
      itemLines,
      `--------------------------`,
      `*Total Items: ${order.totalItems} | Grand Total: Rs.${order.totalAmount.toFixed(2)}*`,
      `Delivery Mode: Courier`,
    ]
      .filter(Boolean)
      .join('\n');

    return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  const buildMailtoUrl = () => {
    const subject = `Aman Medical Order ${order.orderNumber} - ${order.doctorName} (${order.clinicName})`;
    const body = [
      `Aman Medical - Doctor Ordering Portal`,
      `Order Number: ${order.orderNumber}`,
      `Doctor: ${order.doctorName} (${order.clinicName})`,
      `City: ${order.doctorCity} | Phone: ${order.doctorPhone}`,
      `Total Items: ${order.totalItems}`,
      `Grand Total: Rs.${order.totalAmount.toFixed(2)}`,
      `Status: ${order.status}`,
    ].join('\n');
    return `mailto:${BOOTSTRAPPED_ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full overflow-hidden shadow-xl my-auto">
        {/* Top Action Bar (hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            {isConfirmation && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            <span className="text-sm font-bold font-display">
              {isConfirmation
                ? `Order Confirmed — ${order.orderNumber}`
                : `Wholesale Order Sheet — ${order.orderNumber}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp Admin
            </a>
            <a
              href={buildMailtoUrl()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <Mail className="w-3.5 h-3.5" />
              Email Alert
            </a>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="printable-order-sheet" className="p-5 sm:p-8 max-h-[80vh] overflow-y-auto">
          {isConfirmation && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
              <div className="font-bold text-sm">
                Thank you, {order.doctorName}! Your wholesale order has been saved.
              </div>
              <p className="text-xs text-emerald-800 mt-1">
                Order will be delivered via Courier. You can share the instant WhatsApp notification with Aman Medical dispatch desk using the button above.
              </p>
            </div>
          )}

          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="text-xl font-bold text-slate-900 font-display">
                AMAN MEDICAL
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                B2B Pharmaceutical Wholesale & Doctor Ordering Portal
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Dispatch Mode: Registered Medical Courier Service
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-xs text-slate-500">Order Reference</div>
              <div className="text-base font-bold font-mono text-slate-900 tabular-nums">
                {order.orderNumber}
              </div>
              <div className="text-xs text-slate-500 mt-1 tabular-nums">
                Date: {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              <div className="text-xs font-semibold text-teal-700 mt-1">
                Status: {order.status}
              </div>
            </div>
          </div>

          {/* Doctor & Courier Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
            <div>
              <div className="text-slate-500 font-medium mb-1">Billed & Shipped To (Doctor / Clinic)</div>
              <div className="font-bold text-slate-900 text-sm">{order.doctorName}</div>
              <div className="text-slate-700 font-medium">{order.clinicName}</div>
              <div className="text-slate-600 mt-0.5">
                City: {order.doctorCity} · Phone: <span className="font-mono">{order.doctorPhone}</span>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-slate-500 font-medium mb-1">Courier & Tracking Details</div>
              {order.courierName ? (
                <div>
                  <div className="inline-flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Truck className="w-4 h-4 text-teal-700" />
                    {order.courierName}
                  </div>
                  <div className="text-slate-700 font-mono mt-0.5">
                    Tracking / AWB: {order.trackingNo || 'Pending AWB'}
                  </div>
                </div>
              ) : (
                <div className="text-slate-600">
                  Courier partner & AWB tracking number will be updated upon dispatch.
                </div>
              )}
              {order.notes && (
                <div className="text-slate-600 mt-1">
                  Notes: <span className="italic">{order.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 pr-2">#</th>
                  <th className="py-2.5 px-2">Code</th>
                  <th className="py-2.5 px-2">Medicine Name</th>
                  <th className="py-2.5 px-2">Company</th>
                  <th className="py-2.5 px-2">Pack</th>
                  <th className="py-2.5 px-2 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-2 text-right">Qty</th>
                  <th className="py-2.5 pl-2 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {(order.items || []).map((item, index) => (
                  <tr key={item.id || `${item.medicineId}-${index}`}>
                    <td className="py-2.5 pr-2 font-mono text-slate-500 tabular-nums">{index + 1}</td>
                    <td className="py-2.5 px-2 font-mono text-slate-700 tabular-nums">{item.code}</td>
                    <td className="py-2.5 px-2 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-2 text-slate-600">{item.company}</td>
                    <td className="py-2.5 px-2 text-slate-600">{item.pack}</td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                      ₹{item.rate.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold tabular-nums">
                      {item.qty}
                    </td>
                    <td className="py-2.5 pl-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ₹{item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 text-sm font-bold text-slate-900">
                  <td colSpan={6} className="py-3 pr-2 text-right">
                    Grand Total ({order.totalItems} SKUs)
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular-nums">
                    {(order.items || []).reduce((acc, i) => acc + i.qty, 0)} Units
                  </td>
                  <td className="py-3 pl-2 text-right font-mono text-base text-teal-800 tabular-nums">
                    ₹{order.totalAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>Order will be delivered via Courier</span>
            <span>Aman Medical — Authorized B2B Doctor Supply</span>
          </div>
        </div>
      </div>
    </div>
  );
};
