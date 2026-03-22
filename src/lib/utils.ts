import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (date: Date | string | number | Timestamp | null | undefined) => {
  if (!date) return 'N/A';
  try {
    const d = date instanceof Timestamp ? date.toDate() : (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date);
    return format(d, 'MMM dd, yyyy');
  } catch (e) {
    return 'N/A';
  }
};

export const formatDateTime = (date: Date | string | number | Timestamp | null | undefined) => {
  if (!date) return 'N/A';
  try {
    const d = date instanceof Timestamp ? date.toDate() : (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date);
    return format(d, 'MMM dd, yyyy HH:mm');
  } catch (e) {
    return 'N/A';
  }
};

export const getStatusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('completed') || s.includes('shipped') || s.includes('done') || s.includes('active')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  if (s.includes('pending') || s.includes('progress') || s.includes('draft')) return 'text-amber-600 bg-amber-50 border-amber-100';
  if (s.includes('cancelled') || s.includes('failed') || s.includes('high')) return 'text-rose-600 bg-rose-50 border-rose-100';
  return 'text-zinc-600 bg-zinc-50 border-zinc-100';
};
