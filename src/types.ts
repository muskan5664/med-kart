export interface Medicine {
  id: string;
  name: string;
  salt: string;
  company: string;
  category: 'Tablets' | 'Syrups' | 'Injections' | 'Antibiotics' | 'Surgical' | string;
  mrp: number;
  ptr: number; // Price to Retailer / RMP Rate
  gst: number; // e.g., 5, 12, 18
  stock: number;
  expiry: string;
  packing?: string; // e.g., "10x10 Tabs"
  imageUrl?: string;
}

export interface CartItem extends Medicine {
  qty: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  doctorName: string;
  clinicName: string;
  rmpNo: string;
  phone: string;
  address?: string;
  role: 'admin' | 'rmp';
  verified: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  doctorName: string;
  clinicName: string;
  rmpNo: string;
  phone: string;
  address: string;
  items: CartItem[];
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
  paymentMode: 'COD' | 'UPI_DELIVERY' | 'ONLINE';
  paymentStatus: 'Pending' | 'Paid';
  status: 'Confirmed' | 'Packed' | 'Dispatched' | 'Delivered' | 'Cancelled';
  createdAt: string;
}
