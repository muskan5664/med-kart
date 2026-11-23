/**
 * Firestore Security Rules Test Suite — Dirty Dozen Verification
 */

export interface TestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
}

export const dirtyDozenTests: TestCase[] = [
  { id: 1, name: 'Reject unverified email admin spoof', collection: 'medicines', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Reject self-approved doctor registration', collection: 'profiles', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Reject shadow field injection on profile update', collection: 'profiles', operation: 'update', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Reject PII blanket read by non-owner', collection: 'profiles', operation: 'get', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Reject invalid document ID format', collection: 'medicines', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Reject negative medicine rate or oversized string', collection: 'medicines', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Reject order creation by unapproved doctor', collection: 'orders', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Reject order creation with mismatched doctorId', collection: 'orders', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Reject doctor modifying order status or courier tracking', collection: 'orders', operation: 'update', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Reject non-admin update on terminal Delivered order', collection: 'orders', operation: 'update', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Reject orphaned order item without existing parent order', collection: 'orders/ord1/items', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Reject cross-doctor read on order items subcollection', collection: 'orders/ord1/items', operation: 'get', expected: 'PERMISSION_DENIED' },
];
