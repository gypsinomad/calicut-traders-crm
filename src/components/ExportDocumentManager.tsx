import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Upload, 
  Search, 
  Filter,
  MoreVertical,
  Download,
  Eye,
  Calendar,
  ShieldCheck,
  Package,
  Ship,
  ArrowRight,
  Plus,
  Trash2
} from 'lucide-react';
import { ExportOrder } from '../lib/types.ts';
import { subscribeToCollection } from '../services/db';
import { orderService } from '../services/orderService';
import { generateComplianceInsights } from '../services/aiService';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Modal from './Modal.tsx';

const DOCUMENT_TYPES = [
  { id: 'shippingBill', label: 'Shipping Bill' },
  { id: 'billOfLading', label: 'Bill of Lading' },
  { id: 'commercialInvoice', label: 'Commercial Invoice' },
  { id: 'packingList', label: 'Packing List' },
  { id: 'certificateOfOrigin', label: 'Certificate of Origin' },
  { id: 'phytosanitaryCertificate', label: 'Phytosanitary Certificate' },
  { id: 'fssaiCertificate', label: 'FSSAI Certificate' },
  { id: 'gstInvoice', label: 'GST Invoice' },
  { id: 'letterOfCredit', label: 'Letter of Credit (LC)' }
];

export default function ExportDocumentManager() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ExportOrder | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [newCert, setNewCert] = useState({ type: '', number: '', expiryDate: '' });
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

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

  const toggleDocument = async (order: ExportOrder, docId: string) => {
    const currentChecklist = order.documentChecklist || {};
    const newChecklist = {
      ...currentChecklist,
      [docId]: !currentChecklist[docId]
    };

    const docsCompleted = Object.values(newChecklist).filter(Boolean).length;
    
    try {
      await orderService.updateOrder(order.id, order, {
        documentChecklist: newChecklist,
        docsCompleted
      });
    } catch (error) {
      console.error('Error updating document checklist:', error);
    }
  };

  const addCertificate = async () => {
    if (!selectedOrder || !newCert.type || !newCert.expiryDate) return;

    const expiryDate = new Date(newCert.expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    let status: 'valid' | 'expiring' | 'expired' = 'valid';
    if (expiryDate < now) status = 'expired';
    else if (expiryDate < thirtyDaysFromNow) status = 'expiring';

    const certificate = {
      id: Math.random().toString(36).substr(2, 9),
      type: newCert.type,
      number: newCert.number,
      expiryDate: Timestamp.fromDate(expiryDate),
      status
    };

    const currentCerts = selectedOrder.certificates || [];
    try {
      await orderService.updateOrder(selectedOrder.id, selectedOrder, {
        certificates: [...currentCerts, certificate]
      });
      setIsCertModalOpen(false);
      setNewCert({ type: '', number: '', expiryDate: '' });
    } catch (error) {
      console.error('Error adding certificate:', error);
    }
  };

  const deleteCertificate = async (certId: string) => {
    if (!selectedOrder) return;
    const currentCerts = selectedOrder.certificates || [];
    try {
      await orderService.updateOrder(selectedOrder.id, selectedOrder, {
        certificates: currentCerts.filter(c => c.id !== certId)
      });
    } catch (error) {
      console.error('Error deleting certificate:', error);
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedOrder) return;
    setIsGeneratingAI(true);
    setIsAIModalOpen(true);
    try {
      const insights = await generateComplianceInsights(selectedOrder);
      setAiInsights(insights || 'No insights available.');
    } catch (error) {
      setAiInsights('Failed to generate insights.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: orders.length,
    completed: orders.filter(o => o.docsCompleted === DOCUMENT_TYPES.length).length,
    pending: orders.filter(o => o.docsCompleted < DOCUMENT_TYPES.length).length,
    expiringSoon: orders.reduce((acc, o) => acc + (o.certificates?.filter(c => c.status === 'expiring').length || 0), 0),
    complianceRate: orders.length > 0 
      ? Math.round((orders.reduce((acc, o) => acc + (o.docsCompleted || 0), 0) / (orders.length * DOCUMENT_TYPES.length)) * 100)
      : 0
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-serif font-bold text-zinc-900 tracking-tight">Export Documents</h1>
          <p className="text-zinc-500 mt-2 text-lg font-serif italic">Manage compliance and documentation lifecycle for all shipments.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Compliance Readiness</span>
            <span className="text-3xl font-serif font-bold text-zinc-900">{stats.complianceRate}%</span>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-600 flex items-center justify-center">
            <ShieldCheck className="text-emerald-600" size={24} />
          </div>
        </div>
      </header>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Shipments', value: stats.total, icon: Ship, color: 'blue' },
          { label: 'Fully Compliant', value: stats.completed, icon: CheckCircle2, color: 'emerald' },
          { label: 'Docs Pending', value: stats.pending, icon: Clock, color: 'amber' },
          { label: 'Expiring Soon', value: stats.expiringSoon, icon: AlertCircle, color: 'rose' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
                stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                stat.color === 'amber' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
              )}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live Status</span>
            </div>
            <p className="text-3xl font-serif font-bold text-zinc-900">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Orders List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Search orders..."
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
                  "w-full p-4 rounded-2xl border transition-all text-left group",
                  selectedOrder?.id === order.id 
                    ? "bg-[#064e3b] border-[#064e3b] text-white shadow-lg shadow-emerald-900/20" 
                    : "bg-white border-zinc-200 hover:border-emerald-500 text-zinc-900"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    selectedOrder?.id === order.id ? "text-emerald-300" : "text-emerald-600"
                  )}>
                    {order.orderNumber}
                  </span>
                  <span className="text-[10px] font-bold opacity-60">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <h4 className="font-bold truncate">{order.customerName}</h4>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden mr-4">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        selectedOrder?.id === order.id ? "bg-emerald-400" : "bg-emerald-600"
                      )}
                      style={{ width: `${(order.docsCompleted / DOCUMENT_TYPES.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black">
                    {order.docsCompleted}/{DOCUMENT_TYPES.length}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Document Checklist */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden"
              >
                <div className="p-8 border-b border-zinc-100 bg-zinc-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-serif font-bold text-zinc-900">{selectedOrder.orderNumber}</h2>
                      <p className="text-sm text-zinc-500 font-medium">{selectedOrder.customerName} • {selectedOrder.destinationCountry}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleGenerateAI}
                        disabled={isGeneratingAI}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all disabled:opacity-50"
                      >
                        <ShieldCheck size={14} />
                        {isGeneratingAI ? 'Analyzing...' : 'AI Compliance Report'}
                      </button>
                      <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-all">
                        <Download size={20} />
                      </button>
                      <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-all">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-white rounded-xl border border-zinc-100">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Commodity</p>
                      <p className="text-sm font-bold text-zinc-900">{selectedOrder.commodity}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-zinc-100">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Quantity</p>
                      <p className="text-sm font-bold text-zinc-900">{selectedOrder.quantity} {selectedOrder.unit}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-zinc-100">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Incoterms</p>
                      <p className="text-sm font-bold text-zinc-900">{selectedOrder.incoterms}</p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
                      <FileText className="text-emerald-600" size={20} />
                      Document Checklist
                    </h3>
                    <span className="text-xs text-zinc-400 italic">Click upload to link files</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DOCUMENT_TYPES.map(doc => {
                      const isReady = selectedOrder.documentChecklist?.[doc.id];
                      return (
                        <div 
                          key={doc.id}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all",
                            isReady ? "bg-emerald-50 border-emerald-100" : "bg-white border-zinc-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              isReady ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"
                            )}>
                              {isReady ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                            </div>
                            <span className={cn(
                              "text-sm font-bold",
                              isReady ? "text-emerald-900" : "text-zinc-600"
                            )}>
                              {doc.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setUploadingDoc(doc.id);
                                setIsUploadModalOpen(true);
                              }}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                isReady ? "text-emerald-600 hover:bg-emerald-100" : "text-zinc-400 hover:bg-zinc-100"
                              )}
                            >
                              <Upload size={16} />
                            </button>
                            <button className="p-2 text-zinc-300 hover:text-zinc-900 transition-all">
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Certificates Section */}
                <div className="p-8 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
                      <ShieldCheck className="text-amber-600" size={20} />
                      Compliance Certificates
                    </h3>
                    <button 
                      onClick={() => setIsCertModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all"
                    >
                      <Plus size={14} />
                      Add Certificate
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedOrder.certificates?.map(cert => (
                      <div key={cert.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            cert.status === 'valid' ? "bg-emerald-100 text-emerald-600" :
                            cert.status === 'expiring' ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
                          )}>
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{cert.type}</p>
                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">#{cert.number} • Expires {formatDate(cert.expiryDate)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            cert.status === 'valid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            cert.status === 'expiring' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-rose-50 text-rose-700 border-rose-100"
                          )}>
                            {cert.status}
                          </span>
                          <button 
                            onClick={() => deleteCertificate(cert.id)}
                            className="p-2 text-zinc-300 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!selectedOrder.certificates || selectedOrder.certificates.length === 0) && (
                      <div className="text-center py-8 bg-white border border-dashed border-zinc-200 rounded-2xl">
                        <p className="text-sm text-zinc-400 font-serif italic">No certificates linked to this order.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                          {String.fromCharCode(64 + i)}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 font-medium italic">Assigned to Documentation Team</p>
                  </div>
                  <button className="flex items-center gap-2 px-6 py-2 bg-[#064e3b] text-white rounded-xl text-sm font-bold hover:bg-[#065f46] transition-all shadow-lg shadow-emerald-900/10">
                    Finalize Documents
                    <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-zinc-200 border-dashed">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-6">
                  <FileText size={40} />
                </div>
                <h3 className="text-xl font-serif font-bold text-zinc-900">Select an Order</h3>
                <p className="text-zinc-500 max-w-xs mt-2 italic font-serif">Choose an export order from the list to manage its documentation and compliance checklist.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Document"
      >
        <div className="space-y-6">
          <div className="p-12 border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center text-center hover:border-emerald-500 transition-all cursor-pointer group">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
              <Upload size={32} />
            </div>
            <p className="text-lg font-serif font-bold text-zinc-900">Click to select file</p>
            <p className="text-sm text-zinc-500 mt-1 italic">PDF, JPG, PNG (Max 10MB)</p>
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                if (selectedOrder && uploadingDoc) {
                  toggleDocument(selectedOrder, uploadingDoc);
                  setIsUploadModalOpen(false);
                }
              }}
              className="px-8 py-2 bg-[#064e3b] text-white rounded-xl text-sm font-bold hover:bg-[#065f46] transition-all"
            >
              Confirm Upload
            </button>
          </div>
        </div>
      </Modal>

      {/* Certificate Modal */}
      <Modal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        title="Add Compliance Certificate"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Certificate Type</label>
              <select 
                value={newCert.type}
                onChange={(e) => setNewCert({ ...newCert, type: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Select Type</option>
                <option value="FSSAI Certificate">FSSAI Certificate</option>
                <option value="Organic Certificate">Organic Certificate</option>
                <option value="Phytosanitary Certificate">Phytosanitary Certificate</option>
                <option value="Health Certificate">Health Certificate</option>
                <option value="Halal Certificate">Halal Certificate</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Certificate Number</label>
              <input 
                type="text"
                value={newCert.number}
                onChange={(e) => setNewCert({ ...newCert, number: e.target.value })}
                placeholder="e.g. FSSAI-123456789"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Expiry Date</label>
              <input 
                type="date"
                value={newCert.expiryDate}
                onChange={(e) => setNewCert({ ...newCert, expiryDate: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsCertModalOpen(false)}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={addCertificate}
              className="px-8 py-2 bg-[#064e3b] text-white rounded-xl text-sm font-bold hover:bg-[#065f46] transition-all"
            >
              Add Certificate
            </button>
          </div>
        </div>
      </Modal>

      {/* AI Insights Modal */}
      <Modal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        title="AI Compliance Report"
      >
        <div className="space-y-6">
          {isGeneratingAI ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm text-zinc-500 font-serif italic">Analyzing shipment data for compliance risks...</p>
            </div>
          ) : (
            <div className="prose prose-emerald max-w-none">
              <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 text-sm text-zinc-700 whitespace-pre-wrap font-serif leading-relaxed">
                {aiInsights}
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button 
              onClick={() => setIsAIModalOpen(false)}
              className="px-8 py-2 bg-[#064e3b] text-white rounded-xl text-sm font-bold hover:bg-[#065f46] transition-all"
            >
              Close Report
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
