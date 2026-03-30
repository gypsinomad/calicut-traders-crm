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
  Square,
  Users,
  Clock
} from 'lucide-react';
import { Supplier } from '../lib/types';
import { subscribeToCollection, createDocument, deleteDocument, updateDocument } from '../services/db';
import { useAuth } from './Auth';
import { cn, getStatusColor, formatDate } from '../lib/utils';
import { Timestamp } from 'firebase/firestore';
import Modal from './Modal';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';

type OnboardingStep = 'basicInfo' | 'compliance' | 'qc' | 'active';

const ONBOARDING_STEPS: { id: OnboardingStep; label: string; icon: any; description: string }[] = [
  { id: 'basicInfo', label: 'Basic Info', icon: Building2, description: 'Company registration and contact details.' },
  { id: 'compliance', label: 'Compliance', icon: FileCheck2, description: 'FSSAI, APEDA, and other trade licenses.' },
  { id: 'qc', label: 'QC', icon: ClipboardCheck, description: 'Site inspection and quality control audit.' },
  { id: 'active', label: 'Active', icon: UserCheck, description: 'Supplier is fully active and ready for orders.' },
];

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200/50 shadow-sm hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-500 group relative overflow-hidden">
    <div className="relative z-10 flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">{title}</p>
        <h3 className="text-4xl font-serif font-bold text-zinc-900 group-hover:text-[#064e3b] transition-colors tracking-tight">{value}</h3>
      </div>
      <div className={cn("p-4 rounded-2xl group-hover:bg-[#064e3b] group-hover:text-white transition-all duration-700 shadow-inner group-hover:shadow-emerald-900/20 group-hover:-translate-y-1", color)}>
        <Icon size={28} className="transition-colors" />
      </div>
    </div>
    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-700" />
  </div>
);

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
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '',
    contactPerson: '',
    email: '',
    certificates: [],
    compliance: [],
    status: 'pending',
    onboardingStep: 'basicInfo',
    completedSteps: [],
    organization: profile?.organization || '',
    rating: 5,
    riskScore: 0,
    category: 'Commodities',
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
        organization: profile.organization
      };

      if (editingSupplier) {
        await updateDocument('suppliers', editingSupplier.id, supplierData);
      } else {
        await createDocument('suppliers', {
          ...supplierData,
          completedSteps: [],
          createdAt: Timestamp.now(),
        } as Supplier);
      }

      setIsModalOpen(false);
      setEditingSupplier(null);
      setNewSupplier({
        name: '',
        contactPerson: '',
        email: '',
        certificates: [],
        compliance: [],
        status: 'pending',
        onboardingStep: 'basicInfo',
        completedSteps: [],
        rating: 5,
        riskScore: 0,
        category: 'Commodities',
        location: ''
      });
    } catch (error) {
      console.error('Error saving supplier:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await deleteDocument('suppliers', id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setNewSupplier({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      certificates: supplier.certificates,
      compliance: supplier.compliance,
      status: supplier.status,
      onboardingStep: supplier.onboardingStep,
      completedSteps: supplier.completedSteps,
      rating: supplier.rating,
      riskScore: supplier.riskScore,
      category: supplier.category,
      location: supplier.location,
    });
    setIsModalOpen(true);
  };

  const analyzeRisk = async (supplier: Supplier) => {
    setAnalyzingRisk(supplier.id);

    if (!isAIAvailable()) {
      // Rule-based fallback for supplier risk analysis
      const riskScore = supplier.status === 'active' ? 15 : 45;
      const riskLevel = riskScore < 30 ? 'Low' : riskScore < 70 ? 'Medium' : 'High';
      const keyRisks = [
        "Geopolitical stability in region",
        "Climate impact on product yields",
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
      const prompt = `Analyze the supply chain risk for this product supplier:
      Name: ${supplier.name}
      Location: ${supplier.location}
      Certificates: ${supplier.certificates.join(', ')}
      Compliance: ${supplier.compliance.join(', ')}
      Onboarding Step: ${supplier.onboardingStep}
      
      Consider geopolitical stability, climate impact on product yields in their region, and regulatory compliance history.
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
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map(id => deleteDocument('suppliers', id)));
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
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

  const toggleSupplierStep = async (supplier: Supplier, stepId: string) => {
    try {
      const currentSteps = supplier.completedSteps || [];
      let newSteps: string[];
      
      if (currentSteps.includes(stepId)) {
        newSteps = currentSteps.filter(id => id !== stepId);
      } else {
        newSteps = [...currentSteps, stepId];
      }

      const allCompleted = ONBOARDING_STEPS.every(s => newSteps.includes(s.id));
      const status = allCompleted ? 'active' : 'pending';
      
      // Update local state if needed for immediate feedback, but subscribeToCollection handles it
      await updateDocument('suppliers', supplier.id, { 
        completedSteps: newSteps,
        status 
      });
      
      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier({ ...selectedSupplier, completedSteps: newSteps, status });
      }
    } catch (error) {
      console.error('Error toggling supplier step:', error);
    }
  };

  const getProgress = (supplier: Supplier) => {
    const completed = supplier.completedSteps?.length || 0;
    return Math.round((completed / ONBOARDING_STEPS.length) * 100);
  };

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-serif font-bold text-zinc-900 tracking-tight">Supplier Network</h2>
          <p className="text-zinc-500 mt-2 text-lg font-serif italic">Manage your global supply chain and vendor onboarding.</p>
        </div>
        <div className="flex items-center gap-4">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
              {bulkDeleteConfirm ? (
                <div className="flex items-center gap-2 bg-rose-50 p-1.5 rounded-2xl border border-rose-100">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest px-2">Delete {selectedIds.length}?</span>
                  <button 
                    onClick={handleBulkDelete}
                    className="px-4 py-1.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all shadow-sm"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => setBulkDeleteConfirm(false)}
                    className="px-4 py-1.5 bg-white text-zinc-500 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setBulkDeleteConfirm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold hover:bg-rose-100 transition-all border border-rose-100"
                >
                  Delete Selected ({selectedIds.length})
                </button>
              )}
            </div>
          )}
          <button 
            onClick={handleExportCSV}
            className="px-6 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-2xl text-sm font-bold hover:bg-zinc-50 transition-all shadow-sm flex items-center gap-2"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button 
            onClick={() => {
              setEditingSupplier(null);
              setNewSupplier({
                name: '',
                contactPerson: '',
                email: '',
                certificates: [],
                compliance: [],
                status: 'pending',
                onboardingStep: 'basicInfo',
                completedSteps: [],
                rating: 5,
                riskScore: 0,
                category: 'Commodities',
                location: ''
              });
              setIsModalOpen(true);
            }}
            className="px-8 py-3 bg-[#064e3b] text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Add Supplier
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          title="Total Suppliers" 
          value={suppliers.length.toString()} 
          icon={Users} 
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          title="Active Partners" 
          value={suppliers.filter(s => s.status === 'active').length.toString()} 
          icon={CheckCircle2} 
          color="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="In Onboarding" 
          value={suppliers.filter(s => s.status === 'pending').length.toString()} 
          icon={Clock} 
          color="bg-amber-50 text-amber-600"
        />
        <StatCard 
          title="Compliance Rate" 
          value="98%" 
          icon={ShieldCheck} 
          color="bg-indigo-50 text-indigo-600"
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-zinc-200/50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-zinc-100 bg-[#fcfaf7]/50">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#064e3b] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search suppliers by name or contact..." 
                className="w-full pl-12 pr-6 py-3 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Filter size={18} className="text-zinc-400" />
              <select 
                className="bg-white border border-zinc-200 rounded-2xl px-6 py-3 text-sm font-bold focus:outline-none focus:border-emerald-200 transition-all"
                value={filterStatus}
                onChange={(e: any) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <RefreshCw className="animate-spin mx-auto text-zinc-400" size={32} />
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-zinc-50/50 rounded-[2rem] border border-dashed border-zinc-200">
              <p className="text-zinc-400 font-serif italic text-lg">No suppliers found matching your criteria.</p>
            </div>
          ) : (
            filteredSuppliers.map((supplier) => (
              <div 
                key={supplier.id} 
                className={cn(
                  "bg-white rounded-[2rem] border shadow-sm overflow-hidden transition-all group relative",
                  selectedIds.includes(supplier.id) ? "border-[#064e3b] ring-4 ring-emerald-500/5" : "border-zinc-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5"
                )}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(supplier.id);
                  }}
                  className={cn(
                    "absolute top-6 left-6 z-10 p-1.5 rounded-xl transition-all",
                    selectedIds.includes(supplier.id) ? "bg-[#064e3b] text-white" : "bg-white/80 backdrop-blur-sm text-zinc-300 border border-zinc-100 opacity-0 group-hover:opacity-100"
                  )}
                >
                  {selectedIds.includes(supplier.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>

                <div className="p-8 cursor-pointer" onClick={() => setSelectedSupplier(supplier)}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 bg-[#fcfaf7] text-[#064e3b] rounded-2xl flex items-center justify-center font-serif font-bold text-2xl shadow-inner group-hover:bg-[#064e3b] group-hover:text-white transition-all duration-500">
                      {supplier.name.charAt(0)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        supplier.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      )}>
                        {supplier.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-serif font-bold text-zinc-900 tracking-tight mb-1 group-hover:text-[#064e3b] transition-colors">{supplier.name}</h3>
                  <p className="text-sm text-zinc-500 mb-8 font-medium">{supplier.contactPerson} · {supplier.email}</p>

                  {/* Onboarding Progress */}
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <span>Onboarding Progress</span>
                      <span className="text-[#064e3b] font-black">
                        {getProgress(supplier)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-[#064e3b] transition-all duration-1000 shadow-sm"
                        style={{ width: `${getProgress(supplier)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      <span>Risk Analysis</span>
                      {supplier.riskScore !== undefined && (
                        <span className={cn(
                          "font-black",
                          supplier.riskScore < 30 ? "text-emerald-600" : supplier.riskScore < 70 ? "text-amber-600" : "text-rose-600"
                        )}>
                          {supplier.riskScore}% {isAIAvailable() ? 'Risk' : 'Smart Risk'}
                        </span>
                      )}
                    </div>
                    {supplier.riskAnalysis ? (
                      <div className="p-4 bg-[#fcfaf7] rounded-2xl border border-emerald-100/50">
                        <div className="flex items-center gap-2 mb-3">
                          {isAIAvailable() ? <Sparkles size={14} className="text-[#d97706]" /> : <Zap size={14} className="text-[#d97706]" />}
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#d97706]">{isAIAvailable() ? 'AI Insight' : 'Smart Insight'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {supplier.riskAnalysis.keyRisks?.map((risk: string, i: number) => (
                            <span key={i} className="text-[10px] bg-white border border-emerald-100 px-2 py-1 rounded-lg text-zinc-600 font-medium">
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
                        className="w-full py-3 bg-white border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-[#064e3b] hover:text-white hover:border-[#064e3b] transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        {analyzingRisk === supplier.id ? <RefreshCw size={14} className="animate-spin" /> : (isAIAvailable() ? <Sparkles size={14} /> : <Zap size={14} />)}
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
                          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-100">
                            <ShieldCheck size={12} />
                            {cert}
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-100">
                          <AlertCircle size={12} />
                          Pending Docs
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSupplier(supplier);
                        }}
                        className="p-2 text-zinc-400 hover:text-[#064e3b] hover:bg-emerald-50 rounded-xl transition-all"
                        title="Edit Supplier"
                      >
                        <RefreshCw size={16} />
                      </button>
                      {deleteConfirmId === supplier.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSupplier(supplier.id);
                            }}
                            className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-rose-700"
                          >
                            Del
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase rounded-lg hover:bg-zinc-200"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(supplier.id);
                          }}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Supplier"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => setSelectedSupplier(supplier)}
                      className="flex items-center gap-2 text-xs font-black text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors"
                    >
                      <ExternalLink size={16} />
                      Full Profile
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingSupplier(null);
        }} 
        title={editingSupplier ? "Edit Supplier" : "Supplier Onboarding Wizard"}
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
              placeholder="e.g. Kerala Trading Farms Co."
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
                placeholder="e.g. rajesh@keralaproducts.in"
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
              onClick={() => {
                setIsModalOpen(false);
                setEditingSupplier(null);
              }}
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
              {editingSupplier ? 'Save Changes' : 'Start Onboarding'}
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
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-20">
                <h3 className="text-2xl font-serif font-bold text-zinc-900">Supplier Profile</h3>
                <button onClick={() => setSelectedSupplier(null)} className="p-3 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-10 space-y-10">
                <div className="flex items-center gap-8">
                  <div className="w-24 h-24 bg-[#fcfaf7] text-[#064e3b] rounded-[2rem] flex items-center justify-center font-serif font-bold text-4xl shadow-inner border border-emerald-100">
                    {selectedSupplier.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-3xl font-serif font-bold text-zinc-900 tracking-tight">{selectedSupplier.name}</h4>
                    <p className="text-zinc-500 text-lg font-serif italic">{selectedSupplier.email}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {selectedSupplier.status}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                        Partner since {formatDate(selectedSupplier.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Onboarding Checklist */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                    <h5 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Onboarding Journey</h5>
                    <span className="text-xs font-black text-[#064e3b] uppercase tracking-widest">
                      {getProgress(selectedSupplier)}% Complete
                    </span>
                  </div>
                  <div className="space-y-4">
                    {ONBOARDING_STEPS.map((step) => {
                      const isCompleted = selectedSupplier.completedSteps?.includes(step.id);
                      
                      return (
                        <div 
                          key={step.id} 
                          onClick={() => toggleSupplierStep(selectedSupplier, step.id)}
                          className={cn(
                            "flex items-center gap-6 p-6 rounded-[2rem] border transition-all cursor-pointer group",
                            isCompleted 
                              ? "bg-emerald-50/50 border-emerald-100" 
                              : "bg-white border-zinc-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/5"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                            isCompleted ? "bg-[#064e3b] text-white shadow-lg shadow-emerald-900/20" : "bg-zinc-100 text-zinc-400 group-hover:bg-emerald-100 group-hover:text-emerald-600"
                          )}>
                            {isCompleted ? <CheckCircle2 size={18} /> : <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 group-hover:bg-emerald-400" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <step.icon size={18} className={isCompleted ? "text-[#064e3b]" : "text-zinc-400"} />
                              <p className={cn(
                                "text-lg font-serif font-bold",
                                isCompleted ? "text-zinc-900" : "text-zinc-500"
                              )}>
                                {step.label}
                              </p>
                            </div>
                            <p className="text-sm text-zinc-400 mt-1 font-serif italic">{step.description}</p>
                          </div>
                          <div className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            isCompleted ? "text-emerald-600" : "text-zinc-300"
                          )}>
                            {isCompleted ? 'Verified' : 'Pending'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6">
                  <h5 className="text-xs font-black text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-4">Quality Control (QC) Insights</h5>
                  <div className="p-8 bg-[#fcfaf7] rounded-[2.5rem] border border-emerald-100/50 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl text-[#064e3b] shadow-sm border border-emerald-50">
                          <ClipboardCheck size={24} />
                        </div>
                        <div>
                          <p className="text-lg font-serif font-bold text-zinc-900">Latest Audit Report</p>
                          <p className="text-sm text-zinc-500 font-serif italic">March 15, 2026</p>
                        </div>
                      </div>
                      <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Exemplary
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 leading-relaxed font-serif italic">
                      "The supplier has demonstrated exceptional adherence to global product safety standards. Processing facilities in Idukki show 100% compliance with traceability protocols. Recommended for high-volume export contracts."
                    </p>
                    <button className="w-full py-4 bg-white border border-emerald-100 rounded-2xl text-xs font-black text-[#064e3b] hover:bg-[#064e3b] hover:text-white transition-all shadow-sm uppercase tracking-widest">
                      Download Full Audit PDF
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-8 border-t border-zinc-100">
                  <button 
                    onClick={() => setSelectedSupplier(null)}
                    className="px-8 py-3 bg-[#064e3b] text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] transition-all shadow-xl shadow-emerald-900/20"
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

