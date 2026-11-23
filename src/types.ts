export interface Medicine {
  id: string;
  name: string;
  salt: string;
  company: string;
  category: string;
  mrp: number;
  ptr: number;
  gst: number;
  stock: number;
  expiry: string;
  packing?: string;
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

export type OrderStatus = 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Order {
  id: string;
  userId: string;
  userEmail?: string;
  doctorName: string;
  clinicName: string;
  rmpNo: string;
  phone: string;
  address: string;
  items: CartItem[];
  subtotal: number;
  gstTotal: number;
  grandTotal: number;
  paymentMode: 'UPI_QR' | 'COD' | 'ONLINE' | string;
  paymentStatus: 'Pending' | 'Paid';
  utrNumber?: string;
  status: OrderStatus;
  createdAt: string;
}
