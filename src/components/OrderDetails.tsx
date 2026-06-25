import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Ship, 
  Globe, 
  Calendar, 
  Clock, 
  FileText,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  DollarSign,
  Package,
  Truck,
  ShieldCheck,
  Download,
  RefreshCw,
  Save,
  X,
  Send,
  TrendingUp,
  PieChart
} from 'lucide-react';
import { ExportOrder, OrderStage } from '../lib/types.ts';
import { getStatusColor, formatDate, formatCurrency } from '../lib/utils';
import { orderService } from '../services/orderService';
import Modal from './Modal.tsx';
import DocumentGenerator from './DocumentGenerator.tsx';
import { AnimatePresence, motion } from 'motion/react';
import SendToBuyerDialog from './SendToBuyerDialog';

export default function OrderDetails({ order, onBack }: { order: ExportOrder, onBack: () => void }) {
  const [updating, setUpdating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFinancialsOpen, setIsFinancialsOpen] = useState(false);
  const [isDocGenOpen, setIsDocGenOpen] = useState(false);
  const [isSendDocsOpen, setIsSendDocsOpen] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Partial<ExportOrder>>(order);
  const [financials, setFinancials] = useState(order.financials || {
    cogs: 0,
    packingCost: 0,
    inlandFreight: 0,
    terminalCharges: 0,
    oceanFreight: 0,
    insurance: 0,
    bankCharges: 0,
    customsCharges: 0,
    otherCosts: 0,
    totalCost: 0,
    netProfit: 0,
    margin: 0
  });

  const calculateFinancials = (data: typeof financials) => {
    const totalCost = 
      (Number(data.cogs) || 0) + 
      (Number(data.packingCost) || 0) + 
      (Number(data.inlandFreight) || 0) + 
      (Number(data.terminalCharges) || 0) + 
      (Number(data.oceanFreight) || 0) + 
      (Number(data.insurance) || 0) + 
      (Number(data.bankCharges) || 0) + 
      (Number(data.customsCharges) || 0) + 
      (Number(data.otherCosts) || 0);
    
    const netProfit = (order.totalAmount || 0) - totalCost;
    const margin = order.totalAmount > 0 ? (netProfit / order.totalAmount) * 100 : 0;

    return { ...data, totalCost, netProfit, margin };
  };

  const handleFinancialsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const updatedFinancials = calculateFinancials(financials);
      await orderService.updateOrder(order.id, order, { financials: updatedFinancials });
      setIsFinancialsOpen(false);
    } catch (error) {
      console.error('Error updating financials:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await orderService.updateOrder(order.id, order, editedOrder);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating order:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStage) => {
    setUpdating(true);
    try {
      await orderService.updateOrder(order.id, order, { stage: newStatus });
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const stages: { id: OrderStage; label: string }[] = [
    { id: 'inquiry', label: 'Inquiry' },
    { id: 'orderConfirmed', label: 'Confirmed' },
    { id: 'production', label: 'Production' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'delivered', label: 'Delivered' },
  ];

  const currentStageIndex = stages.findIndex(s => s.id === order.stage);

  const triggerComplianceAI = (message: string) => {
    const event = new CustomEvent('trigger-compliance-ai', { detail: { message } });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-zinc-900">{order.orderNumber}</h2>
              <div className="relative group">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border cursor-pointer ${getStatusColor(order.stage)}`}>
                  {order.stage}
                </span>
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2">
                  {stages.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => handleStatusChange(stage.id)}
                      disabled={updating}
                      className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors flex items-center justify-between"
                    >
                      {stage.label}
                      {updating && stage.id === order.stage && <RefreshCw size={12} className="animate-spin" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-zinc-500 mt-1">Ref: {order.customerName} · {order.destinationCountry}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => triggerComplianceAI(`Check APEDA compliance for order ${order.orderNumber}: ${order.items?.[0]?.productName} to ${order.destinationCountry}`)}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-2"
          >
            <ShieldCheck size={16} className="text-emerald-600" />
            Check Compliance
          </button>
          <button 
            onClick={() => {
              setEditedOrder(order);
              setIsEditModalOpen(true);
            }}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Edit Order
          </button>
          <button 
            onClick={() => setIsSendDocsOpen(true)}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-2"
          >
            <Send size={16} className="text-emerald-600" />
            Send Documents
          </button>
          <button 
            onClick={() => setIsFinancialsOpen(true)}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <TrendingUp size={16} className="text-emerald-600" />
            Financials
          </button>
          <button 
            onClick={() => setIsDocGenOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <FileText size={16} />
            Generate Documents
          </button>
        </div>
      </header>

      <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          {stages.map((stage, i) => (
            <React.Fragment key={stage.id}>
              <div className="flex flex-col items-center gap-2 relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  i <= currentStageIndex 
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'bg-white border-zinc-200 text-zinc-400'
                }`}>
                  {i < currentStageIndex ? <CheckCircle2 size={20} /> : <span className="text-sm font-bold">{i + 1}</span>}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  i <= currentStageIndex ? 'text-emerald-600' : 'text-zinc-400'
                }`}>
                  {stage.label}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 -mt-6 ${
                  i < currentStageIndex ? 'bg-emerald-500' : 'bg-zinc-100'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Order Value</p>
              <div className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
                <DollarSign size={20} className="text-emerald-500" />
                <span>{formatCurrency(order.totalAmount)}</span>
                <span className="text-sm text-zinc-400 font-medium">{order.currency}</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Incoterms</p>
              <div className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
                <Ship size={20} className="text-blue-500" />
                <span>{order.incoterms}</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Documentation</p>
              <div className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
                <FileText size={20} className="text-amber-500" />
                <span>{order.documents?.filter(d => d.status === 'verified').length || 0}/{order.documents?.length || 0}</span>
                <span className="text-sm text-zinc-400 font-medium">Verified</span>
              </div>
            </div>
          </div>

          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Ship size={20} className="text-emerald-600" />
                Live Container Tracking
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Current Vessel</p>
                  <p className="text-sm font-black text-zinc-900">MSC AMALFI V.2401</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Last Port</p>
                  <p className="text-sm font-black text-zinc-900">Colombo, Sri Lanka</p>
                </div>
              </div>

              <div className="relative pt-4 pb-8">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-100 -translate-y-1/2 rounded-full" />
                <div className="absolute top-1/2 left-0 w-2/3 h-1 bg-emerald-500 -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                
                <div className="relative flex justify-between">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                    <span className="text-[10px] font-bold text-zinc-900">Kochi</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 absolute left-2/3 -translate-x-1/2">
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-lg">
                      <Ship size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">At Sea</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-zinc-200 border-4 border-white shadow-sm" />
                    <span className="text-[10px] font-bold text-zinc-400">London</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Estimated Arrival</p>
                  <p className="text-sm font-black text-zinc-900">Mar 28, 2024</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</p>
                  <p className="text-sm font-black text-emerald-600">On Schedule</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Shipment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400">
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Product & HS Code</p>
                    <p className="text-sm font-bold text-zinc-900 mt-1">{order.items?.[0]?.productName || 'Multiple Products'}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">HS Code: {order.items?.[0]?.hsCode || '09041100'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400">
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Container Type</p>
                    <p className="text-sm font-bold text-zinc-900 mt-1">{order.containerType || '20ft Container'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Estimated Dates</p>
                    <div className="flex items-center gap-4 mt-1">
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">ETD</p>
                        <p className="text-sm font-bold text-zinc-900">Feb 15, 2024</p>
                      </div>
                      <div className="h-8 w-px bg-zinc-100" />
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase font-bold">ETA</p>
                        <p className="text-sm font-bold text-zinc-900">Feb 28, 2024</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Compliance Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-emerald-600">Verified</span>
                      <span className="text-xs text-zinc-500">· ICEGATE Submitted</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-zinc-900">Required Documents</h3>
              <button 
                onClick={() => setIsDocGenOpen(true)}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Manage & Generate
              </button>
            </div>
            <div className="space-y-3">
              {(order.documents || []).map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 border border-zinc-100 group">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-900">{doc.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                      doc.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {doc.status}
                    </span>
                    <button className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors">
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {(order.documents || []).length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4 italic">No documents uploaded yet</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-4">Customer Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold">
                  GS
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">Global Products Ltd</p>
                  <p className="text-xs text-zinc-500">London, United Kingdom</p>
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-100 space-y-2">
                <p className="text-xs text-zinc-500 flex items-center gap-2">
                  <Clock size={12} />
                  Last order: 3 months ago
                </p>
                <p className="text-xs text-zinc-500 flex items-center gap-2">
                  <ShieldCheck size={12} />
                  IEC: UK12345678
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-4">Payment Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Total Amount</span>
                <span className="text-sm font-bold text-zinc-900">$45,000.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Advance Received</span>
                <span className="text-sm font-bold text-emerald-600">$22,500.00</span>
              </div>
              <div className="pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-500">Balance Due</span>
                  <span className="text-sm font-bold text-rose-600">$22,500.00</span>
                </div>
                <p className="text-[10px] text-zinc-400">Due before shipment (Mar 10, 2024)</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Modal 
        isOpen={isFinancialsOpen} 
        onClose={() => setIsFinancialsOpen(false)} 
        title="Shipment Profitability Calculator"
      >
        <form onSubmit={handleFinancialsSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <PieChart size={14} />
                Cost Breakdown
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'COGS (Product Cost)', key: 'cogs' },
                  { label: 'Packing & Labeling', key: 'packingCost' },
                  { label: 'Inland Freight', key: 'inlandFreight' },
                  { label: 'Terminal Charges (THC)', key: 'terminalCharges' },
                  { label: 'Ocean/Air Freight', key: 'oceanFreight' },
                  { label: 'Insurance', key: 'insurance' },
                  { label: 'Bank Charges', key: 'bankCharges' },
                  { label: 'Other Costs', key: 'otherCosts' },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{field.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                      <input 
                        type="number" 
                        value={financials[field.key as keyof typeof financials] || ''}
                        onChange={(e) => setFinancials({ ...financials, [field.key]: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-7 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-900 rounded-2xl p-6 text-white space-y-4">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Profitability Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Revenue</span>
                    <span className="text-lg font-bold">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Total Costs</span>
                    <span className="text-lg font-bold text-rose-400">-{formatCurrency(calculateFinancials(financials).totalCost)}</span>
                  </div>
                  <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-sm font-bold text-emerald-400">Net Profit</span>
                    <span className="text-2xl font-black text-emerald-400">{formatCurrency(calculateFinancials(financials).netProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Profit Margin</span>
                    <span className={`text-sm font-bold ${calculateFinancials(financials).margin > 15 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {calculateFinancials(financials).margin.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <strong>Pro Tip:</strong> Ensure all terminal handling charges (THC) and bank commission for LC/TT are included for accurate margin calculation.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100">
            <button 
              type="button"
              onClick={() => setIsFinancialsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={updating}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {updating ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              Save Financials
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit Export Order"
      >
        <form onSubmit={handleEditSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Customer Name</label>
              <input 
                required
                type="text" 
                value={editedOrder.customerName}
                onChange={(e) => setEditedOrder({ ...editedOrder, customerName: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Commodity</label>
              <input 
                required
                type="text" 
                value={editedOrder.commodity}
                onChange={(e) => setEditedOrder({ ...editedOrder, commodity: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Quantity</label>
              <input 
                required
                type="number" 
                value={editedOrder.quantity}
                onChange={(e) => setEditedOrder({ ...editedOrder, quantity: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Destination Country</label>
              <input 
                required
                type="text" 
                value={editedOrder.destinationCountry}
                onChange={(e) => setEditedOrder({ ...editedOrder, destinationCountry: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input 
                  required
                  type="number" 
                  value={editedOrder.totalAmount}
                  onChange={(e) => setEditedOrder({ ...editedOrder, totalAmount: parseFloat(e.target.value) })}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Incoterms</label>
              <select 
                value={editedOrder.incoterms}
                onChange={(e) => setEditedOrder({ ...editedOrder, incoterms: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="EXW">EXW</option>
                <option value="DDP">DDP</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</label>
              <select 
                value={editedOrder.status}
                onChange={(e) => setEditedOrder({ ...editedOrder, status: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button 
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={updating}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {updating ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Generator Modal */}
      <AnimatePresence>
        {isDocGenOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDocGenOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-white border-b border-zinc-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-zinc-900">Document Generation Center</h3>
                  <p className="text-sm text-zinc-500">Order: {order.orderNumber} · {order.customerName}</p>
                </div>
                <button 
                  onClick={() => setIsDocGenOpen(false)}
                  className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <DocumentGenerator order={order} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isSendDocsOpen && (
        <SendToBuyerDialog
          isOpen={isSendDocsOpen}
          onClose={() => setIsSendDocsOpen(false)}
          order={order}
          onSent={() => setIsSendDocsOpen(false)}
        />
      )}
    </div>
  );
}
