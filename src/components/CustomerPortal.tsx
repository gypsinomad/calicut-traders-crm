import React, { useState, useEffect } from 'react';
import { Ship, Search, CheckCircle2, ArrowRight, Package, Globe, DollarSign } from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { PortalExportOrder, ShipmentDocument } from '../lib/types';
import { useAuth } from './Auth';
import { db } from '../services/db';

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
}

function formatDate(ts: any) {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN');
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-blue-100 text-blue-700',
    shipped: 'bg-yellow-100 text-yellow-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

export default function CustomerPortal() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<PortalExportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!profile?.organization) { setLoading(false); return; }
    const q = query(
      collection(db, 'orders'),
      where('organization', '==', profile.organization),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as PortalExportOrder)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [profile?.organization]);

  const filtered = orders.filter(o => {
    const s = searchTerm.toLowerCase();
    return (statusFilter === 'all' || o.status === statusFilter) &&
      (!s || o.orderNumber?.toLowerCase().includes(s) || o.buyerName?.toLowerCase().includes(s));
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
          <p className="text-sm text-gray-500">Track export orders and shipment documents</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Orders', value: orders.length, icon: Package },
          { label: 'Active', value: orders.filter(o => ['confirmed','shipped'].includes(o.status)).length, icon: Ship },
          { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, icon: CheckCircle2 },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <input type="text" placeholder="Search orders..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          {['all','draft','confirmed','shipped','delivered','cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>{['Order #','Buyer','Product','Value','Status','Date'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>
            ) : filtered.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{order.orderNumber}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{order.buyerName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{order.product}</td>
                <td className="px-4 py-3 text-sm">{formatCurrency(order.totalValue, order.currency)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>{order.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}