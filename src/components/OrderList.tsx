import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Ship, 
  Globe,
  DollarSign,
  ChevronRight,
  Clock,
  Package,
  RefreshCw,
  Save,
  X,
  Download,
  Trash2,
  Edit2,
  CheckSquare,
  Square,
  MoreVertical,
  ChevronDown,
  Sparkles,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { ExportOrder, OrderStage } from '../lib/types.ts';
import OrderDetails from './OrderDetails.tsx';
import Modal from './Modal.tsx';
import { subscribeToCollection, deleteDocument } from '../services/db';
import { orderService } from '../services/orderService';
import { getStatusColor, formatDate, formatCurrency, cn } from '../lib/utils';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';
import { WhatsAppService } from '../services/whatsapp';

export default function OrderList() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ExportOrder | null>(null);
  const selectedOrderRef = React.useRef<ExportOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ExportOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [checkingCompliance, setCheckingCompliance] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    selectedOrderRef.current = selectedOrder;
  }, [selectedOrder]);

  const [newOrder, setNewOrder] = useState<Partial<ExportOrder>>({
    orderNumber: `EXP-${Date.now().toString().slice(-6)}`,
    customerName: '',
    customerPhone: '',
    commodity: '',
    hsCode: '',
    quantity: 0,
    unit: 'MT',
    title: '',
    destinationCountry: '',
    totalAmount: 0,
    totalValue: 0,
    currency: 'USD',
    incoterms: 'FOB',
    stage: 'leadReceived',
    status: 'draft',
    items: [],
    documents: [],
    organization: profile?.organization || ''
  });

  useEffect(() => {
    if (!profile?.organization) return;

    const unsubscribe = subscribeToCollection<ExportOrder>(
      'orders', 
      (data) => {
        setOrders(data);
        setLoading(false);
        if (selectedOrderRef.current) {
          const updated = data.find(o => o.id === selectedOrderRef.current?.id);
          if (updated && JSON.stringify(updated) !== JSON.stringify(selectedOrderRef.current)) {
            setSelectedOrder(updated);
          }
        }
      }, 
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    return () => unsubscribe();
  }, [profile]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.customerName || !newOrder.totalAmount || !newOrder.commodity || !newOrder.quantity || !newOrder.unit) return;

    setIsSubmitting(true);
    try {
      const orderData = {
        ...newOrder,
        title: `${newOrder.orderNumber} - ${newOrder.customerName}`,
        totalValue: newOrder.totalAmount,
        assignedUserId: profile?.uid || '',
        organization: profile?.organization || ''
      };
      const orderId = await orderService.createOrder(orderData as ExportOrder);
      
      if (orderId) {
        const createdOrder: ExportOrder = { id: orderId, ...orderData } as ExportOrder;
        await WhatsAppService.sendOrderConfirmation(createdOrder);
      }

      setIsModalOpen(false);
      resetNewOrder();
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setIsSubmitting(true);
    try {
      const { id, ...data } = editingOrder;
      await orderService.updateOrder(id, editingOrder, data);
      setEditingOrder(null);
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteDocument('orders', id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const resetNewOrder = () => {
    setNewOrder({
      orderNumber: `EXP-${Date.now().toString().slice(-6)}`,
      customerName: '',
      customerPhone: '',
      commodity: '',
      hsCode: '',
      quantity: 0,
      unit: 'MT',
      title: '',
      destinationCountry: '',
      totalAmount: 0,
      totalValue: 0,
      currency: 'USD',
      incoterms: 'FOB',
      stage: 'leadReceived',
      status: 'draft',
      items: [],
      documents: [],
      organization: profile?.organization || ''
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.orderNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStage === 'all' || order.stage === filterStage;
    
    return matchesSearch && matchesFilter;
  });

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedOrderIds.length} orders?`)) return;
    try {
      await Promise.all(selectedOrderIds.map(id => deleteDocument('orders', id)));
      setSelectedOrderIds([]);
    } catch (error) {
      console.error("Error in bulk delete:", error);
    }
  };

  const handleBulkStageUpdate = async (stage: OrderStage) => {
    try {
      await Promise.all(selectedOrderIds.map(id => {
        const order = orders.find(o => o.id === id);
        if (order) {
          return orderService.updateOrder(id, order, { stage });
        }
        return Promise.resolve();
      }));
      setSelectedOrderIds([]);
    } catch (error) {
      console.error("Error in bulk stage update:", error);
    }
  };

  const checkCompliance = async (order: ExportOrder) => {
    setCheckingCompliance(order.id);
    try {
      if (!isAIAvailable()) {
        // Rule-based fallback
        const missingDocs = [];
        if (order.commodity.toLowerCase().includes('pepper') || order.commodity.toLowerCase().includes('cardamom')) {
          missingDocs.push('Phytosanitary Certificate', 'Export Board RCMC');
        }
        if (order.destinationCountry.toLowerCase().includes('uk') || order.destinationCountry.toLowerCase().includes('europe')) {
          missingDocs.push('Ethylene Oxide (EtO) Test Report');
        }
        missingDocs.push('Certificate of Origin', 'Commercial Invoice', 'Packing List');

        const compliance = {
          status: missingDocs.length > 5 ? 'critical' : 'warning',
          score: Math.max(30, 100 - (missingDocs.length * 10)),
          missingDocs,
          recommendation: `Smart Mode: Based on destination ${order.destinationCountry}, ensure all mandatory export documents are ready. Quality testing is highly recommended for this region.`
        };

        await orderService.updateOrder(order.id, order, { complianceAI: compliance });
        return;
      }

      const model = 'gemini-3-flash-preview';
      const prompt = `Check export compliance for this order:
      Order: ${order.orderNumber}
      Commodity: ${order.commodity}
      Destination: ${order.destinationCountry}
      Quantity: ${order.quantity} ${order.unit}
      
      Consider typical export regulations for products from India to ${order.destinationCountry}.
      Return a JSON object with: status ('compliant', 'warning', 'critical'), score (0-100), and missingDocs (array of strings), and recommendation (max 50 words).`;

      const response = await generateAIContent('Compliance Check', {
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const compliance = JSON.parse(response.text || '{}');
      await orderService.updateOrder(order.id, order, { complianceAI: compliance });
    } catch (error: any) {
      alert(handleAIError(error));
    } finally {
      setCheckingCompliance(null);
    }
  };

  const exportToCSV = () => {
    const headers = ['Order Number', 'Customer', 'Commodity', 'Quantity', 'Unit', 'Amount', 'Currency', 'Stage', 'Destination', 'Created At'];
    const rows = filteredOrders.map(o => [
      o.orderNumber,
      o.customerName,
      o.commodity,
      o.quantity,
      o.unit,
      o.totalAmount,
      o.currency,
      o.stage,
      o.destinationCountry,
      o.createdAt?.toDate ? format(o.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [showCalculator, setShowCalculator] = useState(false);
  const [calcData, setCalcData] = useState({ exw: 0, freight: 0, insurance: 0, duty: 0 });

  if (selectedOrder) {
    return <OrderDetails order={selectedOrder} onBack={() => setSelectedOrder(null)} />;
  }

  const OrderForm = ({ data, setData }: { data: Partial<ExportOrder>, setData: any }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Order Number</label>
        <input 
          required
          type="text" 
          value={data.orderNumber}
          onChange={(e) => setData({ ...data, orderNumber: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Customer Name</label>
        <input 
          required
          type="text" 
          value={data.customerName}
          onChange={(e) => setData({ ...data, customerName: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          placeholder="e.g. Global Products Ltd"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Customer Phone (WhatsApp)</label>
        <input 
          type="tel" 
          value={data.customerPhone}
          onChange={(e) => setData({ ...data, customerPhone: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          placeholder="e.g. +919876543210"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Commodity</label>
        <input 
          required
          type="text" 
          value={data.commodity}
          onChange={(e) => setData({ ...data, commodity: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          placeholder="e.g. Black Pepper"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">HS Code (6 Digits)</label>
        <input 
          type="text" 
          maxLength={6}
          pattern="\d{6}"
          value={data.hsCode || ''}
          onChange={(e) => setData({ ...data, hsCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          placeholder="e.g. 090411"
        />
        <p className="text-[10px] text-zinc-400">Enter the 6-digit Harmonized System code for international shipping.</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Quantity</label>
        <div className="flex gap-2">
          <input 
            required
            type="number" 
            value={data.quantity}
            onChange={(e) => setData({ ...data, quantity: parseFloat(e.target.value) })}
            className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            placeholder="0.00"
          />
          <select
            value={data.unit}
            onChange={(e) => setData({ ...data, unit: e.target.value })}
            className="w-24 px-2 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="MT">MT</option>
            <option value="KG">KG</option>
            <option value="TON">TON</option>
            <option value="LBS">LBS</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Destination Country</label>
        <input 
          required
          type="text" 
          value={data.destinationCountry}
          onChange={(e) => setData({ ...data, destinationCountry: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          placeholder="e.g. United Kingdom"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Amount</label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            required
            type="number" 
            value={data.totalAmount}
            onChange={(e) => setData({ ...data, totalAmount: parseFloat(e.target.value) })}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Incoterms</label>
        <select 
          value={data.incoterms}
          onChange={(e) => setData({ ...data, incoterms: e.target.value as any })}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        >
          <option value="FOB">FOB (Free On Board)</option>
          <option value="CIF">CIF (Cost, Insurance, Freight)</option>
          <option value="EXW">EXW (Ex Works)</option>
          <option value="DDP">DDP (Delivered Duty Paid)</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Currency</label>
        <select 
          value={data.currency}
          onChange={(e) => setData({ ...data, currency: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        >
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
          <option value="AED">AED - UAE Dirham</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Stage</label>
        <select 
          value={data.stage}
          onChange={(e) => setData({ ...data, stage: e.target.value as OrderStage })}
          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        >
          <option value="leadReceived">Lead Received</option>
          <option value="quotationSent">Quotation Sent</option>
          <option value="orderConfirmed">Order Confirmed</option>
          <option value="exportDocumentation">Export Documentation</option>
          <option value="shipmentReady">Shipment Ready</option>
          <option value="shippedDelivered">Shipped/Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-serif font-bold text-zinc-900 tracking-tight">Export Orders</h2>
          <p className="text-zinc-500 mt-2 text-lg font-serif italic">Track and manage your global export shipments.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowCalculator(true)}
            className="px-6 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-2xl text-sm font-bold hover:bg-zinc-50 transition-all shadow-sm flex items-center gap-2"
          >
            <Zap size={18} className="text-amber-500" />
            Incoterms Calc
          </button>
          <button 
            onClick={exportToCSV}
            className="px-6 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-2xl text-sm font-bold hover:bg-zinc-50 transition-all shadow-sm flex items-center gap-2"
          >
            <Download size={18} />
            Export
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-3 bg-[#064e3b] text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-2"
          >
            <Plus size={18} />
            New Order
          </button>
        </div>
      </header>

      <Modal 
        isOpen={isModalOpen || !!editingOrder} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingOrder(null);
        }} 
        title={editingOrder ? "Edit Export Order" : "Create New Export Order"}
      >
        <form onSubmit={editingOrder ? handleUpdateOrder : handleCreateOrder} className="space-y-6">
          <OrderForm data={editingOrder || newOrder} setData={editingOrder ? setEditingOrder : setNewOrder} />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button 
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingOrder(null);
              }}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              {editingOrder ? "Save Changes" : "Create Order"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        title="Incoterms Cost Calculator"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">EXW Price (Factory)</label>
              <input 
                type="number" 
                value={calcData.exw}
                onChange={(e) => setCalcData({ ...calcData, exw: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ocean Freight</label>
              <input 
                type="number" 
                value={calcData.freight}
                onChange={(e) => setCalcData({ ...calcData, freight: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Insurance</label>
              <input 
                type="number" 
                value={calcData.insurance}
                onChange={(e) => setCalcData({ ...calcData, insurance: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Import Duty (%)</label>
              <input 
                type="number" 
                value={calcData.duty}
                onChange={(e) => setCalcData({ ...calcData, duty: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
              />
            </div>
          </div>

          <div className="p-6 bg-zinc-900 rounded-3xl text-white space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-zinc-400">FOB (Free On Board)</span>
              <span className="text-sm font-black text-emerald-400">${(calcData.exw * 1.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-zinc-400">CFR (Cost & Freight)</span>
              <span className="text-sm font-black text-emerald-400">${(calcData.exw * 1.05 + calcData.freight).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-zinc-400">CIF (Cost, Insurance, Freight)</span>
              <span className="text-sm font-black text-emerald-400">${(calcData.exw * 1.05 + calcData.freight + calcData.insurance).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400">DDP (Delivered Duty Paid)</span>
              <span className="text-sm font-black text-emerald-400">
                ${((calcData.exw * 1.05 + calcData.freight + calcData.insurance) * (1 + calcData.duty/100)).toFixed(2)}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => setShowCalculator(false)}
            className="w-full py-3 bg-zinc-100 text-zinc-900 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all"
          >
            Close Calculator
          </button>
        </div>
      </Modal>

      <div className="bg-white rounded-[2.5rem] border border-zinc-200/50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-zinc-100 bg-[#fcfaf7]/50">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#064e3b] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search orders by number or customer..." 
                className="w-full pl-12 pr-6 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-zinc-400" />
              <select 
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="bg-white border border-zinc-200 rounded-2xl px-6 py-3 text-sm font-bold focus:outline-none focus:border-emerald-200 transition-all"
              >
                <option value="all">All Stages</option>
                <option value="leadReceived">Lead Received</option>
                <option value="quotationSent">Quotation Sent</option>
                <option value="orderConfirmed">Order Confirmed</option>
                <option value="exportDocumentation">Export Documentation</option>
                <option value="shipmentReady">Shipment Ready</option>
                <option value="shippedDelivered">Shipped/Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="animate-spin mx-auto text-zinc-400" size={32} />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center bg-zinc-50/50 rounded-[2rem] border border-dashed border-zinc-200">
              <p className="text-zinc-400 font-serif italic text-lg">No orders found matching your criteria.</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div 
                key={order.id} 
                className={cn(
                  "bg-white p-8 rounded-[2rem] border transition-all group relative",
                  selectedOrderIds.includes(order.id) ? "border-[#064e3b] ring-4 ring-emerald-500/5" : "border-zinc-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5"
                )}
              >
                <div className="absolute top-8 left-8 z-10">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(order.id);
                    }}
                    className={cn(
                      "p-1.5 rounded-xl transition-all",
                      selectedOrderIds.includes(order.id) ? "bg-[#064e3b] text-white" : "bg-white/80 backdrop-blur-sm text-zinc-300 border border-zinc-100 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {selectedOrderIds.includes(order.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </div>

                <div className="flex items-start justify-between pl-12" onClick={() => setSelectedOrder(order)}>
                  <div className="flex items-start gap-6 cursor-pointer">
                    <div className="p-4 bg-[#fcfaf7] rounded-2xl text-[#064e3b] group-hover:bg-[#064e3b] group-hover:text-white transition-all duration-500 shadow-inner">
                      <Ship size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-bold text-zinc-900 group-hover:text-[#064e3b] transition-colors tracking-tight">
                        {order.orderNumber} · {order.customerName}
                      </h3>
                      <div className="flex items-center gap-6 mt-3">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <DollarSign size={16} className="text-emerald-600" />
                          <span className="text-sm font-bold text-zinc-700">{formatCurrency(order.totalAmount)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Ship size={16} className="text-blue-600" />
                          <span className="text-sm font-bold text-zinc-700">{order.incoterms}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Globe size={16} className="text-indigo-600" />
                          <span className="text-sm font-bold text-zinc-700">{order.destinationCountry}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      getStatusColor(order.status)
                    )}>
                      {order.status}
                    </span>
                    <div className="flex items-center gap-2 text-zinc-400 mt-3 justify-end">
                      <Clock size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between pt-8 border-t border-zinc-100 pl-12">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Commodity Profile:</span>
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-bold font-serif italic">
                      {order.commodity} ({order.quantity} {order.unit})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        checkCompliance(order);
                      }}
                      disabled={checkingCompliance === order.id}
                      className="p-3 text-[#064e3b] hover:bg-emerald-50 rounded-2xl transition-all disabled:opacity-50"
                      title="Check Compliance"
                    >
                      {checkingCompliance === order.id ? <RefreshCw size={20} className="animate-spin" /> : <Zap size={20} />}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingOrder(order);
                      }}
                      className="p-3 text-zinc-400 hover:text-[#064e3b] hover:bg-emerald-50 rounded-2xl transition-all"
                      title="Edit Order"
                    >
                      <Edit2 size={20} />
                    </button>
                    {deleteConfirmId === order.id ? (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id);
                          }}
                          className="px-3 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
                        >
                          Del
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="px-3 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(order.id);
                        }}
                        className="p-3 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                        title="Delete Order"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="px-8 py-2.5 bg-[#064e3b] text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] transition-all shadow-lg shadow-emerald-900/10"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
