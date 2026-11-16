export const STATUSES = ['pending', 'slip_uploaded', 'approved', 'rejected', 'delivered'] as const;

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  slip_uploaded: 'Slip Uploaded',
  approved: 'Approved',
  rejected: 'Rejected',
  delivered: 'Delivered',
};

export const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  slip_uploaded: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  delivered: 'bg-teal-100 text-teal-800',
};

// Transitions staff can make from the order page (system handles pending -> slip_uploaded)
export const STAFF_NEXT: Record<string, string[]> = {
  pending: [],
  slip_uploaded: ['approved', 'rejected'],
  rejected: [],
  approved: ['delivered'],
  delivered: [],
};

export const DELIVERY_AREAS = ['Malé', 'Hulhumalé'] as const;

export const ORDER_TYPE_LABEL: Record<string, string> = {
  pickup: 'Pickup from cafe',
  delivery: 'Home delivery',
};

export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'MVR';
export const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
