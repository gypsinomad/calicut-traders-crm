import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Truck, 
  Package, 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  ArrowRight,
  DollarSign,
  Calendar,
  FileText,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './Auth.tsx';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';

interface ProcurementOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  supplierId: string;
  product: string;
  quantity: number;
  unit: string;
  grade: string;
  totalAmount: number;
  status: 'draft' | 'pending' | 'shipped' | 'received' | 'cancelled';
  expectedDelivery: any;
  createdAt: any;
  organization: string;
}

export default function Procurement() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ProcurementOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!profile?.organization) return;

    const q = query(
      collection(db, 'procurement_orders'),
      where('organization', '==', profile.organization),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProcurementOrder[];
      setOrders(newOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching procurement orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.organization]);

  const filteredOrders = orders.filter(o => 
    o.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Active Orders', value: orders.filter(o => o.status === 'pending' || o.status === 'shipped').length, icon: Truck, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Spend', value: formatCurrency(orders.reduce((sum, o) => sum + o.totalAmount, 0)), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Pending Delivery', value: orders.filter(o => o.status === 'shipped').length, icon: Package, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Suppliers', value: new Set(orders.map(o => o.supplierId)).size, icon: Building2, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">Procurement Workflow</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-lg font-serif italic">Manage spice sourcing, supplier orders, and inbound logistics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2">
            <Download size={18} />
            Export Data
          </button>
          <button 
            onClick={() => setShowNewOrder(true)}
            className="px-8 py-3 bg-[#064e3b] dark:bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] dark:hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-2"
          >
            <Plus size={18} />
            New Purchase Order
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Live</span>
            </div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders, suppliers, products..."
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all">
              <Filter size={18} />
            </button>
            <button className="p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/50">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Order Details</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Supplier</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Product & Grade</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Delivery</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <Loader2 className="animate-spin text-emerald-600 mx-auto mb-4" size={32} />
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">Loading procurement data...</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Package className="text-zinc-300" size={32} />
                    </div>
                    <h4 className="text-lg font-bold text-zinc-900 dark:text-white">No purchase orders found</h4>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">Start by creating a new purchase order for your suppliers.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
                          <FileText size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900 dark:text-white">{order.orderNumber}</p>
                          <p className="text-[10px] font-medium text-zinc-400 mt-0.5">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{order.supplierName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{order.product}</p>
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">Grade: {order.grade}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(order.totalAmount)}</p>
                      <p className="text-[10px] font-medium text-zinc-400 mt-0.5">{order.quantity} {order.unit}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                        <Calendar size={14} />
                        <span className="text-xs font-medium">{formatDate(order.expectedDelivery)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
