import React, { useState, useEffect } from 'react';
import { MapPin, User, Building, Phone, Truck, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { PageView } from '../components/Navbar';

export interface DeliveryDetails {
  doctorName: string;
  clinicName: string;
  phone: string;
  address: string;
}

interface AddressPageProps {
  delivery: DeliveryDetails;
  setDelivery: (details: DeliveryDetails) => void;
  setActiveView: (view: PageView) => void;
}

export default function AddressPage({ delivery, setDelivery, setActiveView }: AddressPageProps) {
  const { profile } = useAuth();
  const { cart, grandTotal } = useCart();

  const [doctorName, setDoctorName] = useState(delivery.doctorName || '');
  const [clinicName, setClinicName] = useState(delivery.clinicName || '');
  const [phone, setPhone] = useState(delivery.phone || '');
  const [address, setAddress] = useState(delivery.address || '');

  useEffect(() => {
    if (profile) {
      if (profile.doctorName && !doctorName) setDoctorName(profile.doctorName);
      if (profile.clinicName && !clinicName) setClinicName(profile.clinicName);
      if (profile.phone && !phone) setPhone(profile.phone);
      if (profile.address && !address) setAddress(profile.address);
    }
  }, [profile]);

  if (cart.length === 0) {
    setActiveView('cart');
    return null;
  }

  const handleSaveAndProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim() || !clinicName.trim() || !phone.trim() || !address.trim()) {
      return alert('कृपया सभी डिलीवरी विवरण भरें!');
    }
    if (phone.trim().length < 10) {
      return alert('कृपया सही 10 अंकों का मोबाइल नंबर डालें!');
    }

    setDelivery({
      doctorName: doctorName.trim(),
      clinicName: clinicName.trim(),
      phone: phone.trim(),
      address: address.trim()
    });

    setActiveView('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24">
      {/* Step Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-extrabold text-[#155ed6] uppercase">Step 2 of 3</span>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-1.5">
            <MapPin className="w-5 h-5 text-[#155ed6]" /> डिलीवरी पता (Delivery Address)
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setActiveView('cart')}
          className="text-xs font-extrabold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> कार्ट
        </button>
      </div>

      {/* Address Form Card */}
      <form
        onSubmit={handleSaveAndProceed}
        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4 text-xs"
      >
        <div>
          <label className="font-extrabold text-gray-700 block mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-[#155ed6]" /> डॉक्टर / प्राप्तकर्ता का पूरा नाम *
          </label>
          <input
            type="text"
            required
            placeholder="Dr. Rajesh Kumar"
            className="w-full border border-gray-300 p-3 rounded-xl focus:border-[#155ed6] focus:outline-none text-sm"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="font-extrabold text-gray-700 block mb-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-[#155ed6]" /> क्लिनिक / मेडिकल का नाम *
            </label>
            <input
              type="text"
              required
              placeholder="City Care Clinic"
              className="w-full border border-gray-300 p-3 rounded-xl focus:border-[#155ed6] focus:outline-none text-sm"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
            />
          </div>

          <div>
            <label className="font-extrabold text-gray-700 block mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-[#155ed6]" /> मोबाइल / WhatsApp नंबर *
            </label>
            <input
              type="tel"
              required
              placeholder="10 अंकों का मोबाइल नंबर"
              className="w-full border border-gray-300 p-3 rounded-xl focus:border-[#155ed6] focus:outline-none text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="font-extrabold text-gray-700 block mb-1 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-[#155ed6]" /> पूरा डिलीवरी पता (गांव/शहर, लैंडमार्क, जिला, पिनकोड) *
          </label>
          <textarea
            rows={3}
            required
            placeholder="उदाहरण: मेन रोड, नजदीक बस स्टैंड, गिरिडीह, झारखंड - 815301"
            className="w-full border border-gray-300 p-3 rounded-xl focus:border-[#155ed6] focus:outline-none text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={() => setActiveView('cart')}
            className="px-4 py-3.5 rounded-xl border border-gray-300 font-extrabold text-xs text-gray-700 hover:bg-gray-50"
          >
            ← पीछे जाएं
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#155ed6] hover:bg-[#0b49b8] text-white font-extrabold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition"
          >
            <span>आगे बढ़ें: पेमेंट करें (₹{grandTotal})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
