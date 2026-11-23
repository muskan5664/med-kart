import { Medicine } from '../types';

export const INITIAL_MEDICINES: Omit<Medicine, 'id'>[] = [
  {
    name: 'Dolo 650mg Tablet',
    salt: 'Paracetamol IP 650mg',
    company: 'Micro Labs Ltd',
    category: 'Tablets',
    mrp: 33.60,
    ptr: 24.50,
    gst: 12,
    stock: 500,
    expiry: '08/2028',
    packing: '15 Tabs / Strip'
  },
  {
    name: 'Pan-D Capsule PR',
    salt: 'Pantoprazole 40mg + Domperidone 30mg',
    company: 'Alkem Laboratories',
    category: 'Tablets',
    mrp: 240.00,
    ptr: 168.00,
    gst: 12,
    stock: 200,
    expiry: '11/2027',
    packing: '15 Caps / Strip'
  },
  {
    name: 'Augmentin 625 Duo Tablet',
    salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    company: 'GSK Pharmaceuticals',
    category: 'Antibiotics',
    mrp: 223.40,
    ptr: 162.00,
    gst: 12,
    stock: 150,
    expiry: '05/2028',
    packing: '10 Tabs / Strip'
  },
  {
    name: 'Azithral 500 Tablet',
    salt: 'Azithromycin IP 500mg',
    company: 'Alembic Pharma',
    category: 'Antibiotics',
    mrp: 132.00,
    ptr: 95.00,
    gst: 12,
    stock: 300,
    expiry: '09/2028',
    packing: '5 Tabs / Strip'
  },
  {
    name: 'Ceftriaxone 1g Injection',
    salt: 'Ceftriaxone Sodium IP 1000mg',
    company: 'Aristo Pharma',
    category: 'Injections',
    mrp: 68.00,
    ptr: 32.00,
    gst: 12,
    stock: 400,
    expiry: '03/2028',
    packing: '1 Vial + WFI'
  },
  {
    name: 'Ascoril LS Syrup 100ml',
    salt: 'Levosalbutamol + Ambroxol + Guaiphenesin',
    company: 'Glenmark Pharma',
    category: 'Syrups',
    mrp: 128.00,
    ptr: 89.50,
    gst: 12,
    stock: 120,
    expiry: '07/2027',
    packing: '100ml Bottle'
  }
];
