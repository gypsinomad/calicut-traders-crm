import React, { useState, useEffect } from 'react';
import { 
  Ship, 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Search, 
  Filter, 
  ArrowRight, 
  ChevronRight, 
  MapPin, 
  Calendar, 
  Info,
  Calculator,
  Container,
  Anchor,
  Navigation,
  Activity,
  FileText,
  FileCheck,
  ShieldCheck,
  Plus,
  Save,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { ExportOrder, OrderStage, PaymentTerm } from '../lib/types.ts';
import { subscribeToCollection, updateDocument } from '../services/db';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Modal from './Modal.tsx';

const ORDER_STAGES: { id: OrderStage; label: string; icon: any }[] = [
  { id: 'inquiry', label: 'Inquiry', icon: Search },
  { id: 'quotationSent', label: 'Quotation', icon: FileText },
  { id: 'piIssued', label: 'PI Issued', icon: FileCheck },
  { id: 'orderConfirmed', label: 'Confirmed', icon: CheckCircle2 },
  { id: 'production', label: 'Production', icon: Package },
  { id: 'customs', label: 'Customs', icon: ShieldCheck },
  { id: 'shipped', label: 'Shipped', icon: Ship },
  { id: 'inTransit', label: 'In Transit', icon: Navigation },
  { id: 'delivered', label: 'Delivered', icon: MapPin },
  { id: 'paymentReceived', label: 'Paid', icon: DollarSign }
];

export default function ShipmentTracker() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ExportOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'shipments' | 'payments' | 'profit'>('shipments');
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [editingFinancials, setEditingFinancials] = useState<any>(null);

  useEffect(() => {
    if (!profile?.organization) return;

    const unsub = subscribeToCollection<ExportOrder>(
      'orders',
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    return () => unsub();
  }, [profile?.organization]);

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    inTransit: orders.filter(o => o.stage === 'inTransit').length,
    pendingPayments: orders.filter(o => o.stage !== 'paymentReceived' && o.stage !== 'cancelled').length,
    totalProfit: orders.reduce((acc, o) => acc + (o.financials?.netProfit || 0), 0),
    avgMargin: orders.length > 0 ? orders.reduce((acc, o) => acc + (o.financials?.margin || 0), 0) / orders.length : 0
  };

  const overdueOrders = orders.filter(o => 
    o.stage !== 'paymentReceived' && 
    o.paymentDueDate && 
    o.paymentDueDate.toDate() < new Date()
  );

  const agingBuckets = {
    current: orders.filter(o => o.stage !== 'paymentReceived' && o.paymentDueDate && o.paymentDueDate.toDate() > new Date()).length,
    overdue30: overdueOrders.length, // Real count
    overdue60: 0, 
    overdue90: 0  
  };

  const handleUpdateFinancials = async () => {
    if (!selectedOrder || !editingFinancials) return;

    const cogs = Number(editingFinancials.cogs) || 0;
    const packing = Number(editingFinancials.packingCost) || 0;
    const inland = Number(editingFinancials.inlandFreight) || 0;
    const ocean = Number(editingFinancials.oceanFreight) || 0;
    const customs = Number(editingFinancials.customsCharges) || 0;
    const terminal = Number(editingFinancials.terminalCharges) || 0;
    const bank = Number(editingFinancials.bankCharges) || 0;
    const insurance = Number(editingFinancials.insurance) || 0;

    const totalCosts = cogs + packing + inland + ocean + customs + terminal + bank + insurance;
    const netProfit = selectedOrder.totalValue - totalCosts;
    const margin = selectedOrder.totalValue > 0 ? (netProfit / selectedOrder.totalValue) * 100 : 0;

    const updatedFinancials = {
      ...editingFinancials,
      cogs,
      packingCost: packing,
      inlandFreight: inland,
      oceanFreight: ocean,
      customsCharges: customs,
      terminalCharges: terminal,
      bankCharges: bank,
      insurance,
      netProfit,
      margin: Math.round(margin * 100) / 100
    };

    try {
      await updateDocument('orders', selectedOrder.id, {
        financials: updatedFinancials
      });
      setIsFinancialModalOpen(false);
      setSelectedOrder({ ...selectedOrder, financials: updatedFinancials });
    } catch (error) {
      console.error('Error updating financials:', error);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-serif font-bold text-zinc-900 tracking-tight">Shipment & Payment</h1>
          <p className="text-zinc-500 mt-2 text-lg font-serif italic">End-to-end order lifecycle, logistics, and financial tracking.</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
          {[
            { id: 'shipments', label: 'Shipments', icon: Ship },
            { id: 'payments', label: 'Payments', icon: DollarSign },
            { id: 'profit', label: 'Profit Analysis', icon: TrendingUp }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setView(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                view === tab.id ? "bg-white text-[#064e3b] shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'In Transit', value: stats.inTransit, icon: Ship, color: 'blue' },
          { label: 'Pending Payments', value: stats.pendingPayments, icon: Clock, color: 'amber' },
          { label: 'Total Net Profit', value: `$${stats.totalProfit.toLocaleString()}`, icon: DollarSign, color: 'emerald' },
          { label: 'Avg. Margin', value: `${Math.round(stats.avgMargin)}%`, icon: TrendingUp, color: 'purple' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
                stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                stat.color === 'amber' ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
              )}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live Metric</span>
            </div>
            <p className="text-3xl font-serif font-bold text-zinc-900">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Orders List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Search shipments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
            {filteredOrders.map(order => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  "w-full p-5 rounded-3xl border transition-all text-left group",
                  selectedOrder?.id === order.id 
                    ? "bg-[#064e3b] border-[#064e3b] text-white shadow-lg shadow-emerald-900/20" 
                    : "bg-white border-zinc-200 hover:border-emerald-500 text-zinc-900"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                    selectedOrder?.id === order.id ? "bg-white/10 text-emerald-300" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {order.orderNumber}
                  </span>
                  <span className="text-[10px] font-bold opacity-60">
                    {order.paymentTerms}
                  </span>
                </div>
                <h4 className="font-bold text-lg truncate">{order.customerName}</h4>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      order.stage === 'paymentReceived' ? "bg-emerald-500" : "bg-amber-500"
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {order.stage}
                    </span>
                  </div>
                  <span className="text-sm font-bold">
                    ${order.totalValue.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail View */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                {/* Status Pipeline */}
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                  <h3 className="text-xl font-serif font-bold text-zinc-900 mb-8 flex items-center gap-2">
                    <Activity className="text-emerald-600" size={20} />
                    Shipment Lifecycle
                  </h3>
                  <div className="relative flex items-center justify-between">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-100" />
                    {ORDER_STAGES.map((stage, idx) => {
                      const isCompleted = ORDER_STAGES.findIndex(s => s.id === selectedOrder.stage) >= idx;
                      const isCurrent = selectedOrder.stage === stage.id;
                      return (
                        <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                            isCompleted ? "bg-[#064e3b] text-white shadow-lg shadow-emerald-900/20" : "bg-white border-2 border-zinc-100 text-zinc-300",
                            isCurrent && "ring-4 ring-emerald-500/20 scale-110"
                          )}>
                            <stage.icon size={18} />
                          </div>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest text-center max-w-[60px]",
                            isCompleted ? "text-zinc-900" : "text-zinc-300"
                          )}>
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {view === 'shipments' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Logistics */}
                    <div className="bg-[#064e3b] p-8 rounded-3xl text-white shadow-xl shadow-emerald-900/20">
                      <h3 className="text-lg font-serif font-bold mb-6 flex items-center gap-2">
                        <Container className="text-emerald-400" size={20} />
                        Logistics Tracking
                      </h3>
                      <div className="space-y-6">
                        <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-1">Container Number</p>
                          <p className="text-lg font-bold">{selectedOrder.containerNumber || 'TCNU-482930-1'}</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-1">Vessel Name</p>
                          <p className="text-lg font-bold">{selectedOrder.vesselName || 'MSC AMELIA'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-1">ETD</p>
                            <p className="text-sm font-bold">{selectedOrder.etd ? formatDate(selectedOrder.etd) : '2026-04-12'}</p>
                          </div>
                          <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-1">ETA</p>
                            <p className="text-sm font-bold">{selectedOrder.eta ? formatDate(selectedOrder.eta) : '2026-05-04'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                      <h3 className="text-lg font-serif font-bold text-zinc-900 mb-6 flex items-center gap-2">
                        <Anchor className="text-emerald-600" size={20} />
                        Port of Discharge
                      </h3>
                      <div className="relative h-40 bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100 mb-6">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <MapPin className="text-rose-500 animate-bounce" size={32} />
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 p-3 bg-white/90 backdrop-blur rounded-xl border border-zinc-100">
                          <p className="text-xs font-bold text-zinc-900">{selectedOrder.destination}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{selectedOrder.destinationCountry}</p>
                        </div>
                      </div>
                      <button className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all">
                        Track Real-time AIS
                      </button>
                    </div>
                  </div>
                )}

                {view === 'payments' && (
                  <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                    <h3 className="text-xl font-serif font-bold text-zinc-900 mb-8 flex items-center gap-2">
                      <DollarSign className="text-emerald-600" size={20} />
                      Payment Aging & Terms
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                      <div className="space-y-6">
                        <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Payment Terms</p>
                          <p className="text-3xl font-serif font-bold text-emerald-900">{selectedOrder.paymentTerms}</p>
                          <p className="text-xs text-emerald-700 mt-2 font-medium">Expected payment within 30 days of BL date.</p>
                        </div>
                        <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100">
                          <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">Due Date</p>
                          <p className="text-3xl font-serif font-bold text-rose-900">
                            {selectedOrder.paymentDueDate ? formatDate(selectedOrder.paymentDueDate) : '2026-05-15'}
                          </p>
                          <p className="text-xs text-rose-700 mt-2 font-medium">
                            Status: {selectedOrder.paymentDueDate && selectedOrder.paymentDueDate.toDate() < new Date() ? 'OVERDUE' : 'Outstanding'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Aging Buckets (Company-wide)</p>
                        {[
                          { label: 'Current', value: agingBuckets.current, color: 'bg-emerald-500' },
                          { label: 'Overdue', value: overdueOrders.length, color: 'bg-rose-500' }
                        ].map((bucket, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-3 h-3 rounded-full", bucket.color)} />
                              <span className="text-sm font-bold text-zinc-700">{bucket.label}</span>
                            </div>
                            <span className="text-lg font-serif font-bold text-zinc-900">{bucket.value}</span>
                          </div>
                        ))}
                        
                        {overdueOrders.length > 0 && (
                          <div className="mt-8">
                            <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <AlertTriangle size={14} />
                              Overdue Payments
                            </h4>
                            <div className="space-y-2">
                              {overdueOrders.map(o => (
                                <div key={o.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-bold text-zinc-900">{o.customerName}</p>
                                    <p className="text-[10px] text-rose-600 font-bold">{o.orderNumber}</p>
                                  </div>
                                  <span className="text-xs font-black text-rose-900">${o.totalValue.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {view === 'profit' && (
                  <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-serif font-bold text-zinc-900 flex items-center gap-2">
                        <Calculator className="text-emerald-600" size={20} />
                        Profitability Calculator
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold">
                          Margin: {selectedOrder.financials?.margin || 0}%
                        </div>
                        <button 
                          onClick={() => {
                            setEditingFinancials(selectedOrder.financials || {});
                            setIsFinancialModalOpen(true);
                          }}
                          className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-all"
                        >
                          <Calculator size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-4">
                        {[
                          { label: 'Sale Value', value: selectedOrder.totalValue, type: 'plus' },
                          { label: 'Product Cost (COGS)', value: selectedOrder.financials?.cogs || 0, type: 'minus' },
                          { label: 'Packing & Inland', value: (selectedOrder.financials?.packingCost || 0) + (selectedOrder.financials?.inlandFreight || 0), type: 'minus' },
                          { label: 'Ocean Freight', value: selectedOrder.financials?.oceanFreight || 0, type: 'minus' },
                          { label: 'Customs & Terminal', value: (selectedOrder.financials?.customsCharges || 0) + (selectedOrder.financials?.terminalCharges || 0), type: 'minus' },
                          { label: 'Bank & Insurance', value: (selectedOrder.financials?.bankCharges || 0) + (selectedOrder.financials?.insurance || 0), type: 'minus' }
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-3 border-b border-zinc-50">
                            <span className="text-sm text-zinc-500 font-medium">{item.label}</span>
                            <span className={cn(
                              "text-sm font-bold",
                              item.type === 'plus' ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {item.type === 'plus' ? '+' : '-'}${item.value.toLocaleString()}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-6">
                          <span className="text-lg font-serif font-bold text-zinc-900">Net Profit</span>
                          <span className="text-2xl font-serif font-bold text-emerald-600">
                            ${(selectedOrder.financials?.netProfit || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="bg-zinc-50 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                        <div className={cn(
                          "w-32 h-32 rounded-full border-8 flex items-center justify-center mb-6",
                          (selectedOrder.financials?.margin || 0) >= 15 ? "border-emerald-100 border-t-emerald-600" : "border-rose-100 border-t-rose-600"
                        )}>
                          <span className="text-3xl font-serif font-bold text-zinc-900">{selectedOrder.financials?.margin || 0}%</span>
                        </div>
                        <h4 className="text-lg font-serif font-bold text-zinc-900">
                          {(selectedOrder.financials?.margin || 0) >= 15 ? 'Healthy Margin' : 'Low Margin Alert'}
                        </h4>
                        <p className="text-sm text-zinc-500 mt-2 italic font-serif">
                          {(selectedOrder.financials?.margin || 0) >= 15 
                            ? "This shipment is performing above the target margin of 15%."
                            : "This shipment is below the target margin. Review costs."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-zinc-200 border-dashed">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-6">
                  <Ship size={40} />
                </div>
                <h3 className="text-xl font-serif font-bold text-zinc-900">Select a Shipment</h3>
                <p className="text-zinc-500 max-w-xs mt-2 italic font-serif">Choose an order from the list to track its lifecycle, logistics, and financial performance.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Financials Modal */}
      <Modal
        isOpen={isFinancialModalOpen}
        onClose={() => setIsFinancialModalOpen(false)}
        title="Edit Shipment Financials"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">COGS (Product Cost)</label>
              <input 
                type="number"
                value={editingFinancials?.cogs || 0}
                onChange={(e) => setEditingFinancials({ ...editingFinancials, cogs: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Ocean Freight</label>
              <input 
                type="number"
                value={editingFinancials?.oceanFreight || 0}
                onChange={(e) => setEditingFinancials({ ...editingFinancials, oceanFreight: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Packing Cost</label>
              <input 
                type="number"
                value={editingFinancials?.packingCost || 0}
                onChange={(e) => setEditingFinancials({ ...editingFinancials, packingCost: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Inland Freight</label>
              <input 
                type="number"
                value={editingFinancials?.inlandFreight || 0}
                onChange={(e) => setEditingFinancials({ ...editingFinancials, inlandFreight: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Customs Charges</label>
              <input 
                type="number"
                value={editingFinancials?.customsCharges || 0}
                onChange={(e) => setEditingFinancials({ ...editingFinancials, customsCharges: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Insurance</label>
              <input 
                type="number"
                value={editingFinancials?.insurance || 0}
                onChange={(e) => setEditingFinancials({ ...editingFinancials, insurance: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsFinancialModalOpen(false)}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpdateFinancials}
              className="px-8 py-2 bg-[#064e3b] text-white rounded-xl text-sm font-bold hover:bg-[#065f46] transition-all flex items-center gap-2"
            >
              <Save size={16} />
              Save Financials
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
