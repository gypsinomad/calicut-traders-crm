import React, { useState, useEffect } from 'react';
import { 
  Ship, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ArrowRight,
  Package,
  Globe,
  DollarSign,
  MessageSquare,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToCollection } from '../services/db';
import { ExportOrder, Document } from '../lib/types';
import { useAuth } from './Auth';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';

export default function CustomerPortal() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ExportOrder | null>(null);

  useEffect(() => {
    if (!profile?.organization) return;

    // In a real customer portal, we would filter by customerId
    // For this demo, we'll show orders for the organization
    const unsubOrders = subscribeToCollection<ExportOrder>(
      'orders',
      (data) => {
        setOrders(data.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
        setLoading(false);
      },
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    const unsubDocs = subscribeToCollection<Document>(
      'documents',
      (data) => setDocuments(data),
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    return () => {
      unsubOrders();
      unsubDocs();
    };
  }, [profile]);

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-xl shadow-zinc-900/20">
            <Globe size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-zinc-900">Customer Portal</h2>
            <p className="text-zinc-500 mt-1">Welcome back! Track your shipments and documents here.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-2">
            <MessageSquare size={16} />
            Support Chat
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Ship size={20} />
            </div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Active Shipments</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{activeOrders.length}</p>
          <p className="text-sm text-zinc-500 mt-1">Orders currently in transit</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Value</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(totalValue)}</p>
          <p className="text-sm text-zinc-500 mt-1">Across all orders</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <ShieldCheck size={20} />
            </div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Compliance</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">Verified</p>
          <p className="text-sm text-zinc-500 mt-1">All documents up to date</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900">My Orders</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="text"
                  placeholder="Search orders..."
                  className="pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                />
              </div>
            </div>
            <div className="divide-y divide-zinc-100">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 rounded-xl text-zinc-500 group-hover:bg-white transition-colors">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{order.orderNumber}</p>
                      <p className="text-xs text-zinc-500">{order.commodity} · {order.quantity} {order.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Status</p>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">ETA</p>
                      <p className="text-sm font-bold text-zinc-900">Feb 28, 2024</p>
                    </div>
                    <ArrowRight size={20} className="text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                  </div>
                </div>
              ))}
              {orders.length === 0 && !loading && (
                <div className="p-12 text-center">
                  <p className="text-zinc-500 italic">No orders found</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <FileText size={16} className="text-amber-500" />
              Recent Documents
            </h3>
            <div className="space-y-3">
              {documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 group hover:bg-white transition-all">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-900 truncate max-w-[120px]">{doc.name}</span>
                  </div>
                  <button className="p-1.5 text-zinc-400 hover:text-zinc-900 transition-colors">
                    <Download size={14} />
                  </button>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-4 italic">No documents available</p>
              )}
            </div>
          </section>

          <section className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4">Need Help?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Our support team is available 24/7 to assist with your shipments and documentation.
            </p>
            <button className="w-full py-3 bg-white text-zinc-900 rounded-xl text-xs font-bold hover:bg-zinc-100 transition-all flex items-center justify-center gap-2">
              <MessageSquare size={14} />
              Contact Support
            </button>
          </section>
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 rounded-2xl text-zinc-900">
                      <Ship size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">{selectedOrder.orderNumber}</h3>
                      <p className="text-sm text-zinc-500">{selectedOrder.commodity}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 transition-colors"
                  >
                    <ArrowRight size={20} className="rotate-45" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Shipment Progress</h4>
                      <div className="space-y-4">
                        {[
                          { label: 'Order Confirmed', date: 'Feb 01', done: true },
                          { label: 'Documentation', date: 'Feb 05', done: true },
                          { label: 'In Transit', date: 'Feb 15', done: true },
                          { label: 'Customs Clearance', date: 'Feb 25', done: false },
                          { label: 'Delivered', date: 'Feb 28', done: false },
                        ].map((step, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              step.done ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-zinc-400'
                            }`}>
                              {step.done ? <CheckCircle2 size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                              <span className={`text-xs font-medium ${step.done ? 'text-zinc-900' : 'text-zinc-400'}`}>{step.label}</span>
                              <span className="text-[10px] text-zinc-400">{step.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Destination</p>
                        <p className="text-sm font-bold text-zinc-900">{selectedOrder.destinationCountry}</p>
                      </div>
                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Incoterms</p>
                        <p className="text-sm font-bold text-zinc-900">{selectedOrder.incoterms}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Order Documents</h4>
                      <div className="space-y-2">
                        {documents.filter(d => d.relatedOrderId === selectedOrder.id).map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-zinc-100 rounded-xl">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-zinc-400" />
                              <span className="text-xs font-medium text-zinc-900">{doc.name}</span>
                            </div>
                            <button className="p-1 text-zinc-400 hover:text-zinc-900">
                              <Download size={14} />
                            </button>
                          </div>
                        ))}
                        {documents.filter(d => d.relatedOrderId === selectedOrder.id).length === 0 && (
                          <p className="text-xs text-zinc-400 italic">No documents linked to this order</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
