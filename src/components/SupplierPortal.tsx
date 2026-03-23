import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  FileText, 
  QrCode, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  Save,
  ChevronRight,
  ClipboardCheck,
  Truck,
  Building2,
  UserCheck,
  FileCheck2,
  MoreVertical,
  X,
  Sparkles,
  Zap,
  Download,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';
import { Supplier } from '../lib/types';
import { subscribeToCollection, createDocument, deleteDocument, updateDocument } from '../services/db';
import { useAuth } from './Auth';
import { getStatusColor, formatDate } from '../lib/utils';
import { Timestamp } from 'firebase/firestore';
import Modal from './Modal';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';

type OnboardingStep = 'basicInfo' | 'compliance' | 'qc' | 'finalized';

const ONBOARDING_STEPS: { id: OnboardingStep; label: string; icon: any }[] = [
  { id: 'basicInfo', label: 'Basic Info', icon: Building2 },
  { id: 'compliance', label: 'Compliance', icon: FileCheck2 },
  { id: 'qc', label: 'Quality Check', icon: ClipboardCheck },
  { id: 'finalized', label: 'Active', icon: UserCheck },
];

export default function SupplierPortal() {
  const { profile } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [analyzingRisk, setAnalyzingRisk] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');

  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '',
    contactPerson: '',
    email: '',
    certificates: [],
    compliance: [],
    status: 'pending',
    onboardingStep: 'basicInfo',
    organization: profile?.organization || '',
    rating: 5,
    riskScore: 0,
    category: 'Spices',
    location: ''
  });

  useEffect(() => {
    if (!profile?.organization) return;

    const unsubscribe = subscribeToCollection<Supplier>(
      'suppliers',
      (data) => {
        setSuppliers(data);
        setLoading(false);
      },
      [{ field: 'organization', operator: '==', value: profile.organization }],
      'name',
      'asc'
    );

    return () => unsubscribe();
  }, [profile?.organization]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name || !profile?.organization) return;

    setIsSubmitting(true);
    try {
      const supplierData = {
        ...newSupplier,
        createdAt: Timestamp.now(),
        organization: profile.organization
      };
      await createDocument('suppliers', supplierData as Supplier);
      setIsModalOpen(false);
      setNewSupplier({
        name: '',
        contactPerson: '',
        email: '',
        certificates: [],
        compliance: [],
        status: 'pending',
        onboardingStep: 'basicInfo',
        rating: 5,
        riskScore: 0,
        category: 'Spices',
        location: ''
      });
    } catch (error) {
      console.error('Error creating supplier:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const analyzeRisk = async (supplier: Supplier) => {
    setAnalyzingRisk(supplier.id);

    if (!isAIAvailable()) {
      // Rule-based fallback for supplier risk analysis
      const riskScore = supplier.status === 'active' ? 15 : 45;
      const riskLevel = riskScore < 30 ? 'Low' : riskScore < 70 ? 'Medium' : 'High';
      const keyRisks = [
        "Geopolitical stability in region",
        "Climate impact on spice yields",
        "Regulatory compliance history"
      ];

      const riskAnalysis = { riskScore, riskLevel, keyRisks };
      await updateDocument('suppliers', supplier.id, { 
        riskScore,
        riskAnalysis 
      });
      setAnalyzingRisk(null);
      return;
    }

    try {
      const model = 'gemini-3-flash-preview';
      const prompt = `Analyze the supply chain risk for this spice supplier:
      Name: ${supplier.name}
      Location: ${supplier.location}
      Certificates: ${supplier.certificates.join(', ')}
      Compliance: ${supplier.compliance.join(', ')}
      Onboarding Step: ${supplier.onboardingStep}
      
      Consider geopolitical stability, climate impact on spice yields in their region, and regulatory compliance history.
      Return a JSON object with: riskScore (0-100), riskLevel ('Low', 'Medium', 'High'), and keyRisks (array of strings, max 3).`;

      const response = await generateAIContent('Supplier Risk Score', {
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const riskAnalysis = JSON.parse(response.text || '{}');
      await updateDocument('suppliers', supplier.id, { 
        riskScore: riskAnalysis.riskScore,
        riskAnalysis 
      });
    } catch (error: any) {
      alert(handleAIError(error));
    } finally {
      setAnalyzingRisk(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} suppliers?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteDocument('suppliers', id)));
      setSelectedIds([]);
    } catch (error) {
      console.error('Bulk delete error:', error);
    }
  };

  const handleExportCSV = () => {
    const dataToExport = selectedIds.length > 0 
      ? suppliers.filter(s => selectedIds.includes(s.id))
      : filteredSuppliers;

    const headers = ['Name', 'Contact', 'Email', 'Status', 'Step', 'Risk Score', 'Category'];
    const rows = dataToExport.map(s => [
      s.name,
      s.contactPerson,
      s.email,
      s.status,
      s.onboardingStep,
      s.riskScore,
      s.category
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `suppliers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const updateSupplierStep = async (id: string, step: OnboardingStep) => {
    try {
      const status = step === 'finalized' ? 'active' : 'pending';
      await updateDocument('suppliers', id, { onboardingStep: step, status });
    } catch (error) {
      console.error('Error updating supplier step:', error);
    }
  };

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Supplier Onboarding & QC</h2>
          <p className="text-zinc-500 mt-1">Manage vendor compliance, quality control, and traceability</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg text-sm font-bold hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Onboard New Supplier
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search suppliers by name or contact..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-zinc-400" />
          <select 
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-zinc-800"
        >
          <span className="text-sm font-bold">{selectedIds.length} suppliers selected</span>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 text-sm font-bold text-rose-400 hover:text-rose-300 transition-colors"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
          <button 
            onClick={() => setSelectedIds([])}
            className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <RefreshCw className="animate-spin mx-auto text-zinc-400" size={32} />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-zinc-200">
            <p className="text-zinc-400 font-bold">No suppliers found</p>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div 
              key={supplier.id} 
              className={clsx(
                "bg-white rounded-3xl border shadow-sm overflow-hidden transition-all group relative",
                selectedIds.includes(supplier.id) ? "border-emerald-500 ring-2 ring-emerald-500/10" : "border-zinc-200 hover:border-emerald-500/50"
              )}
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(supplier.id);
                }}
                className={clsx(
                  "absolute top-4 left-4 z-10 p-1 rounded-lg transition-colors",
                  selectedIds.includes(supplier.id) ? "bg-emerald-500 text-white" : "bg-white/80 backdrop-blur-sm text-zinc-400 border border-zinc-200 opacity-0 group-hover:opacity-100"
                )}
              >
                {selectedIds.includes(supplier.id) ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>

              <div className="p-6 cursor-pointer" onClick={() => setSelectedSupplier(supplier)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">
                    {supplier.name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
                      supplier.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    )}>
                      {supplier.status}
                    </span>
                    <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-black text-zinc-900 tracking-tight mb-1">{supplier.name}</h3>
                <p className="text-sm text-zinc-500 mb-6 font-medium">{supplier.contactPerson} · {supplier.email}</p>

                {/* Onboarding Progress */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <span>Onboarding Progress</span>
                    <span className="text-emerald-600">
                      {Math.round((ONBOARDING_STEPS.findIndex(s => s.id === (supplier.onboardingStep || 'basicInfo')) + 1) / ONBOARDING_STEPS.length * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${(ONBOARDING_STEPS.findIndex(s => s.id === (supplier.onboardingStep || 'basicInfo')) + 1) / ONBOARDING_STEPS.length * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <span>Risk Analysis</span>
                    {supplier.riskScore !== undefined && (
                      <span className={clsx(
                        "font-black",
                        supplier.riskScore < 30 ? "text-emerald-600" : supplier.riskScore < 70 ? "text-amber-600" : "text-rose-600"
                      )}>
                        {supplier.riskScore}% {isAIAvailable() ? 'Risk' : 'Smart Risk'}
                      </span>
                    )}
                  </div>
                  {supplier.riskAnalysis ? (
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="flex items-center gap-2 mb-2">
                        {isAIAvailable() ? <Sparkles size={12} className="text-emerald-600" /> : <Zap size={12} className="text-emerald-600" />}
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{isAIAvailable() ? 'AI Insight' : 'Smart Insight'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {supplier.riskAnalysis.keyRisks?.map((risk: string, i: number) => (
                          <span key={i} className="text-[9px] bg-white border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-600 font-medium">
                            {risk}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        analyzeRisk(supplier);
                      }}
                      disabled={analyzingRisk === supplier.id}
                      className="w-full py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center justify-center gap-2"
                    >
                      {analyzingRisk === supplier.id ? <RefreshCw size={12} className="animate-spin" /> : (isAIAvailable() ? <Sparkles size={12} /> : <Zap size={12} />)}
                      {isAIAvailable() ? 'Run Risk AI' : 'Run Smart Risk'}
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <span>Quality Certificates</span>
                    <span className="text-emerald-600">{supplier.certificates.length} Verified</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {supplier.certificates.length > 0 ? (
                      supplier.certificates.map((cert, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-100">
                          <ShieldCheck size={10} />
                          {cert}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold border border-amber-100">
                        <AlertCircle size={10} />
                        Pending Docs
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-100 flex items-center justify-between">
                  <button className="flex items-center gap-2 text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">
                    <Upload size={14} />
                    Upload Cert
                  </button>
                  <button className="flex items-center gap-2 text-xs font-black text-zinc-400 hover:text-zinc-900 uppercase tracking-widest">
                    <ExternalLink size={14} />
                    Full Profile
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Supplier Onboarding Wizard"
      >
        <form onSubmit={handleCreateSupplier} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Supplier Name</label>
            <input 
              required
              type="text" 
              value={newSupplier.name}
              onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              placeholder="e.g. Kerala Spice Farms Co."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Contact Person</label>
              <input 
                required
                type="text" 
                value={newSupplier.contactPerson}
                onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                placeholder="e.g. Rajesh Kumar"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Email Address</label>
              <input 
                required
                type="email" 
                value={newSupplier.email}
                onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                placeholder="e.g. rajesh@keralaspice.in"
              />
            </div>
          </div>
          
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Initial Compliance Check</p>
            <div className="space-y-2">
              {[
                'FSSAI License Verified',
                'GST/Tax Registration Check',
                'Quality Standards Agreement',
                'Traceability System Verified'
              ].map((check) => (
                <label key={check} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newSupplier.compliance?.includes(check)}
                    onChange={(e) => {
                      const current = newSupplier.compliance || [];
                      const updated = e.target.checked 
                        ? [...current, check]
                        : current.filter(c => c !== check);
                      setNewSupplier({ ...newSupplier, compliance: updated });
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500" 
                  />
                  <span className="text-sm font-medium text-zinc-700">{check}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              Start Onboarding
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier Detail Sidebar */}
      <AnimatePresence>
        {selectedSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-end pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSupplier(null)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-xl h-full bg-white shadow-2xl relative z-10 pointer-events-auto overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-20">
                <h3 className="text-xl font-black text-zinc-900">Supplier Profile</h3>
                <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center font-black text-3xl">
                    {selectedSupplier.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-zinc-900 tracking-tight">{selectedSupplier.name}</h4>
                    <p className="text-zinc-500 font-medium">{selectedSupplier.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-black uppercase tracking-widest">
                        {selectedSupplier.status}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                        Member since {formatDate(selectedSupplier.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Onboarding Timeline */}
                <div className="space-y-6">
                  <h5 className="text-xs font-black text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Onboarding Roadmap</h5>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-100" />
                    <div className="space-y-8 relative">
                      {ONBOARDING_STEPS.map((step, idx) => {
                        const isCompleted = ONBOARDING_STEPS.findIndex(s => s.id === (selectedSupplier.onboardingStep || 'basicInfo')) >= idx;
                        const isCurrent = (selectedSupplier.onboardingStep || 'basicInfo') === step.id;
                        
                        return (
                          <div key={step.id} className="flex items-start gap-4">
                            <div className={clsx(
                              "w-8 h-8 rounded-xl flex items-center justify-center relative z-10 transition-all",
                              isCompleted ? "bg-emerald-500 text-white" : "bg-white border-2 border-zinc-100 text-zinc-300"
                            )}>
                              <step.icon size={16} />
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between">
                                <p className={clsx(
                                  "text-sm font-black uppercase tracking-widest",
                                  isCompleted ? "text-zinc-900" : "text-zinc-400"
                                )}>
                                  {step.label}
                                </p>
                                {isCurrent && step.id !== 'finalized' && (
                                  <button 
                                    onClick={() => updateSupplierStep(selectedSupplier.id, ONBOARDING_STEPS[idx + 1].id)}
                                    className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest"
                                  >
                                    Mark Complete
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500 mt-1">
                                {step.id === 'basicInfo' && 'Company registration and contact details.'}
                                {step.id === 'compliance' && 'FSSAI, APEDA, and other trade licenses.'}
                                {step.id === 'qc' && 'Site inspection and quality control audit.'}
                                {step.id === 'finalized' && 'Supplier is fully active and ready for orders.'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-xs font-black text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Quality Control (QC)</h5>
                  <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm">
                          <ClipboardCheck size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-zinc-900">Last QC Audit</p>
                          <p className="text-xs text-zinc-500">March 15, 2026</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Passed
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Supplier has passed the annual quality control audit with a score of 94/100. All processing facilities meet the required hygiene standards.
                    </p>
                    <button className="w-full py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-colors">
                      View Full Audit Report
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100">
                  <button 
                    onClick={() => setSelectedSupplier(null)}
                    className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors"
                  >
                    Close Profile
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

