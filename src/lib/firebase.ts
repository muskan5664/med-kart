import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCQArLTTGHwmIylgf3UlCwlWcuzRwQ-CA0",
  authDomain: "medcart-43c85.firebaseapp.com",
  projectId: "medcart-43c85",
  storageBucket: "medcart-43c85.firebasestorage.app",
  messagingSenderId: "859223630063",
  appId: "1:859223630063:web:df2c5292c220f374eebb1a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const ADMIN_EMAIL = "admin@medkart.in";
