import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Mail, 
  Phone, 
  Globe,
  MessageSquare,
  Clock,
  ChevronRight,
  RefreshCw,
  Save,
  Zap,
  X,
  Trash2,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Target,
  Inbox
} from 'lucide-react';
import { Lead, LeadStatus } from '../lib/types.ts';
import LeadDetails from './LeadDetails.tsx';
import Modal from './Modal.tsx';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/db';
import { getStatusColor, formatDate, cn } from '../lib/utils';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';
import { TranslatedText } from './TranslatedText.tsx';
import { Skeleton } from './ui/Skeleton';

export default function LeadList() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isScoring, setIsScoring] = useState(false);
  const [isSmartScoring, setIsSmartScoring] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const [newLead, setNewLead] = useState<Partial<Lead>>({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    destinationCountry: '',
    productInterest: '',
    productCategories: '',
    incotermsPreference: 'FOB',
    source: 'website',
    status: 'new',
    priority: 'warm',
    organization: profile?.organization || 'Global Trade Connect LLP'
  });

  useEffect(() => {
    if (!profile?.organization) return;

    const unsubscribe = subscribeToCollection<Lead>(
      'leads', 
      (data) => {
        setLeads(data);
        setLoading(false);
      }, 
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    return () => unsubscribe();
  }, [profile]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.fullName || !newLead.email) return;

    setIsSubmitting(true);
    try {
      const leadData: any = {
        ...newLead,
        assignedUserId: profile?.uid || '',
        organization: profile?.organization || 'Global Trade Connect LLP',
        nextFollowUpAt: nextFollowUpDate ? Timestamp.fromDate(new Date(nextFollowUpDate)) : null,
      };

      if (editingLead) {
        await updateDocument('leads', editingLead.id, leadData);
      } else {
        await createDocument('leads', leadData);
      }
      
      setIsModalOpen(false);
      setEditingLead(null);
      setNextFollowUpDate('');
      setNewLead({
        fullName: '',
        companyName: '',
        email: '',
        phone: '',
        destinationCountry: '',
        productInterest: '',
        incotermsPreference: 'FOB',
        source: 'website',
        status: 'new',
        priority: 'warm'
      });
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteDocument('leads', id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setNewLead({
      fullName: lead.fullName,
      companyName: lead.companyName,
      email: lead.email,
      phone: lead.phone,
      destinationCountry: lead.destinationCountry,
      productInterest: lead.productInterest,
      productCategories: (lead as any).productCategories || '',
      incotermsPreference: lead.incotermsPreference,
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
    });
    if (lead.nextFollowUpAt) {
      const date = lead.nextFollowUpAt instanceof Timestamp ? lead.nextFollowUpAt.toDate() : new Date(lead.nextFollowUpAt);
      setNextFollowUpDate(date.toISOString().split('T')[0]);
    }
    setIsModalOpen(true);
  };

  const calculateRiskScore = async (lead: Lead) => {
    if (isScoring) return;
    setIsScoring(true);

    if (!isAIAvailable()) {
      // Rule-based fallback
      let score: 'low' | 'medium' | 'high' = 'low';
      let explanation = '';

      const highRiskCountries = ['Russia', 'Iran', 'North Korea', 'Syria', 'Venezuela'];
      const mediumRiskCountries = ['Nigeria', 'Pakistan', 'Iraq', 'Libya', 'Ukraine'];

      if (highRiskCountries.some(c => lead.destinationCountry?.includes(c))) {
        score = 'high';
        explanation = `High risk due to current trade sanctions or severe economic instability in ${lead.destinationCountry}.`;
      } else if (mediumRiskCountries.some(c => lead.destinationCountry?.includes(c))) {
        score = 'medium';
        explanation = `Moderate risk due to regional logistics challenges or emerging economic factors in ${lead.destinationCountry}.`;
      } else {
        score = 'low';
        explanation = `Low risk based on stable trade relations and established logistics routes to ${lead.destinationCountry}.`;
      }

      await updateDocument('leads', lead.id, {
        riskScore: score,
        riskExplanation: explanation
      });
      setIsScoring(false);
      return;
    }

    try {
      const prompt = `Assess the international trade risk for an export lead to ${lead.destinationCountry}.
      Consider:
      1. Current sanctions or trade barriers.
      2. Port congestion or logistics issues in that region.
      3. General payment risk and economic stability.
      
      Return a JSON object with: 
      riskScore: 'low' | 'medium' | 'high'
      explanation: string (max 40 words)
      `;

      const response = await generateAIContent('Risk Score Calculation', {
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const result = JSON.parse(response.text || '{}');
      await updateDocument('leads', lead.id, {
        riskScore: result.riskScore,
        riskExplanation: result.explanation
      });
    } catch (error: any) {
      alert(handleAIError(error));
    } finally {
      setIsScoring(false);
    }
  };

  const calculateSmartScore = async (lead: Lead) => {
    if (isSmartScoring) return;
    setIsSmartScoring(true);

    try {
      const prompt = `Evaluate this lead for an export business and provide a score from 0 to 100.
      Lead Details:
      - Company: ${lead.companyName}
      - Product Interest: ${lead.productInterest}
      - Destination: ${lead.destinationCountry}
      - Priority: ${lead.priority}
      - Source: ${lead.source}
      
      Return a JSON object with:
      score: number (0-100)
      explanation: string (max 30 words)
      `;

      const response = await generateAIContent('Lead Smart Scoring', {
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const result = JSON.parse(response.text || '{}');
      await updateDocument('leads', lead.id, {
        smartScore: result.score,
        smartScoreExplanation: result.explanation
      });
    } catch (error: any) {
      console.error('Smart scoring error:', error);
    } finally {
      setIsSmartScoring(false);
    }
  };

  const getSourceStats = () => {
    const stats: Record<string, number> = {};
    leads.forEach(l => {
      stats[l.source] = (stats[l.source] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      (lead.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (lead.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (lead.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || lead.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const handleDownloadCSV = () => {
    const headers = ['Full Name', 'Company', 'Email', 'Phone', 'Status', 'Priority', 'Destination', 'Product Interest', 'Created At'];
    const rows = filteredLeads.map(lead => [
      lead.fullName,
      lead.companyName,
      lead.email,
      lead.phone,
      lead.status,
      lead.priority,
      lead.destinationCountry,
      lead.productInterest,
      formatDate(lead.createdAt)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkStatusUpdate = async (status: LeadStatus) => {
    if (selectedLeadIds.length === 0) return;
    try {
      const promises = selectedLeadIds.map(id => updateDocument('leads', id, { status }));
      await Promise.all(promises);
      setSelectedLeadIds([]);
      alert(`Successfully updated ${selectedLeadIds.length} leads to ${status}`);
    } catch (error) {
      console.error('Error in bulk update:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    try {
      const promises = selectedLeadIds.map(id => deleteDocument('leads', id));
      await Promise.all(promises);
      setSelectedLeadIds([]);
      setBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Error in bulk delete:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (selectedLead) {
    return <LeadDetails lead={selectedLead} onBack={() => setSelectedLead(null)} />;
  }

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">Lead Generation</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-lg font-serif italic">Identify and qualify high-potential global export buyers.</p>
        </div>
        <div className="flex items-center gap-4">
          {selectedLeadIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
              {bulkDeleteConfirm ? (
                <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 p-1.5 rounded-2xl border border-rose-100 dark:border-rose-800">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest px-2">Delete {selectedLeadIds.length}?</span>
                  <button 
                    onClick={handleBulkDelete}
                    className="px-4 py-1.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all shadow-sm"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => setBulkDeleteConfirm(false)}
                    className="px-4 py-1.5 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setBulkDeleteConfirm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all border border-rose-100 dark:border-rose-800"
                >
                  Delete Selected ({selectedLeadIds.length})
                </button>
              )}
            </div>
          )}
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm"
          >
            <RefreshCw size={18} />
            Export CSV
          </button>
          <button 
            onClick={() => {
              setEditingLead(null);
              setNewLead({
                fullName: '',
                companyName: '',
                email: '',
                phone: '',
                destinationCountry: '',
                productInterest: '',
                incotermsPreference: 'FOB',
                source: 'website',
                status: 'new',
                priority: 'warm'
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-8 py-3 bg-[#064e3b] text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] transition-all shadow-xl shadow-emerald-900/20"
          >
            <Plus size={18} />
            <TranslatedText>New Prospect</TranslatedText>
          </button>
        </div>
      </header>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingLead(null);
        }} 
        title={editingLead ? "Edit Export Lead" : "Create New Export Lead"}
      >
        <form onSubmit={handleCreateLead} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Full Name</label>
              <input 
                required
                type="text" 
                value={newLead.fullName}
                onChange={(e) => setNewLead({ ...newLead, fullName: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Company Name</label>
              <input 
                type="text" 
                value={newLead.companyName}
                onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
                placeholder="e.g. Global Products Ltd"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Email Address</label>
              <input 
                required
                type="email" 
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
                placeholder="e.g. john@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Phone Number</label>
              <input 
                type="tel" 
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
                placeholder="e.g. +44 20 1234 5678"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Destination Country</label>
              <input 
                type="text" 
                value={newLead.destinationCountry}
                onChange={(e) => setNewLead({ ...newLead, destinationCountry: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
                placeholder="e.g. United Kingdom"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Lead Temperature</label>
              <select 
                value={newLead.priority}
                onChange={(e) => setNewLead({ ...newLead, priority: e.target.value as any })}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
              >
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Lead Source</label>
              <select 
                value={newLead.source}
                onChange={(e) => setNewLead({ ...newLead, source: e.target.value as any })}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
              >
                <option value="manual">Manual</option>
                <option value="website">Website</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="tradeShow">Trade Show</option>
                <option value="referral">Referral</option>
                <option value="linkedin">LinkedIn</option>
                <option value="emailCampaign">Email Campaign</option>
                <option value="coldCall">Cold Call</option>
                <option value="importData">Import Data</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Incoterms</label>
              <select 
                value={newLead.incotermsPreference}
                onChange={(e) => setNewLead({ ...newLead, incotermsPreference: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
              >
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="EXW">EXW</option>
                <option value="CFR">CFR</option>
                <option value="DDP">DDP</option>
                <option value="DAP">DAP</option>
                <option value="FCA">FCA</option>
                <option value="CPT">CPT</option>
                <option value="CIP">CIP</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Next Follow-up</label>
              <input 
                type="date" 
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Product Categories</label>
              <textarea 
                rows={2}
                value={(newLead as any).productCategories}
                onChange={(e) => setNewLead({ ...newLead, productCategories: e.target.value } as any)}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none dark:text-white"
                placeholder="e.g. Commodities, Coconut Products, Textiles"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Product Interest</label>
              <textarea 
                rows={2}
                value={newLead.productInterest}
                onChange={(e) => setNewLead({ ...newLead, productInterest: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none dark:text-white"
                placeholder="e.g. Interested in 5MT Black Pepper..."
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingLead(null);
              }}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              {editingLead ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 bg-[#fcfaf7]/50 dark:bg-zinc-800/50">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#064e3b] dark:group-focus-within:text-emerald-400 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search leads, companies, or countries..." 
                className="w-full pl-12 pr-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:border-emerald-200 dark:focus:border-emerald-800 focus:ring-4 focus:ring-emerald-500/5 transition-all dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              {selectedLeadIds.length > 0 && (
                <div className="flex items-center gap-3 mr-4 pr-6 border-r border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{selectedLeadIds.length} Selected</span>
                  <select 
                    onChange={(e) => handleBulkStatusUpdate(e.target.value as LeadStatus)}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>Update Status</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="quoted">Quoted</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                  {bulkDeleteConfirm ? (
                    <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
                      <button 
                        onClick={handleBulkDelete}
                        className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-rose-700"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => setBulkDeleteConfirm(false)}
                        className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setBulkDeleteConfirm(true)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                      title="Delete Selected"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <Filter size={16} className="text-zinc-400" />
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-transparent text-sm font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="quoted">Quoted</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#fcfaf7]/30 dark:bg-zinc-800/30">
                <th className="px-8 py-5 text-left">
                  <input 
                    type="checkbox" 
                    className="rounded-md border-zinc-300 dark:border-zinc-700 text-[#064e3b] dark:text-emerald-500 focus:ring-[#064e3b]"
                    checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Prospect</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hidden sm:table-cell">Company</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hidden md:table-cell">Product Interest</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hidden sm:table-cell">Market</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hidden lg:table-cell">Follow-up</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-5 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hidden lg:table-cell">Created</th>
                <th className="px-6 py-5 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-8 py-6"><Skeleton className="h-4 w-4 rounded" /></td>
                    <td className="px-6 py-6">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </td>
                    <td className="px-6 py-6 hidden sm:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-6 hidden md:table-cell"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-6 py-6 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-6 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-6"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="px-6 py-6 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-6 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-xl" /></td>
                  </tr>
                ))
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-full text-zinc-300 dark:text-zinc-600">
                        <Inbox size={48} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-zinc-900 dark:text-white font-serif italic text-xl">No leads found</p>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Start by adding your first potential customer.</p>
                      </div>
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="mt-2 px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
                      >
                        Add Lead
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className={cn(
                      "hover:bg-[#fcfaf7] dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer",
                      selectedLeadIds.includes(lead.id) && "bg-emerald-50/50 dark:bg-emerald-900/10"
                    )}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded-md border-zinc-300 dark:border-zinc-700 text-[#064e3b] dark:text-emerald-500 focus:ring-[#064e3b]"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                      />
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-zinc-900 dark:text-white">{lead.fullName}</span>
                          {lead.smartScore !== undefined ? (
                            <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800 group/score relative">
                              <Zap size={10} className="text-emerald-600 dark:text-emerald-500 fill-emerald-600 dark:fill-emerald-500" />
                              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">{lead.smartScore}</span>
                              <div className="absolute left-full ml-2 top-0 w-48 p-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/score:opacity-100 transition-opacity z-50 pointer-events-none shadow-xl">
                                <p className="font-bold uppercase mb-1 text-emerald-400">Smart Score: {lead.smartScore}/100</p>
                                {lead.smartScoreExplanation}
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); calculateSmartScore(lead); }}
                              className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-emerald-500 transition-colors"
                              title="Calculate Smart Score"
                            >
                              <Zap size={12} />
                            </button>
                          )}
                          {lead.riskScore ? (
                            <div className="p-1 rounded-full cursor-help group/risk relative">
                              {lead.riskScore === 'low' && <ShieldCheck size={14} className="text-emerald-500" />}
                              {lead.riskScore === 'medium' && <Shield size={14} className="text-amber-500" />}
                              {lead.riskScore === 'high' && <ShieldAlert size={14} className="text-rose-500" />}
                              <div className="absolute left-full ml-2 top-0 w-48 p-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/risk:opacity-100 transition-opacity z-50 pointer-events-none shadow-xl">
                                <p className="font-bold uppercase mb-1">Risk Assessment: {lead.riskScore}</p>
                                {lead.riskExplanation}
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); calculateRiskScore(lead); }}
                              className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-emerald-500 transition-colors"
                            >
                              <Zap size={12} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <a href={`mailto:${lead.email}`} className="text-zinc-400 dark:text-zinc-500 hover:text-emerald-500 transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Mail size={14} />
                          </a>
                          <a href={`tel:${lead.phone}`} className="text-zinc-400 dark:text-zinc-500 hover:text-emerald-500 transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Phone size={14} />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 hidden sm:table-cell">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{lead.companyName}</span>
                    </td>
                    <td className="px-6 py-6 hidden md:table-cell">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-[150px] block">{lead.productInterest}</span>
                    </td>
                    <td className="px-6 py-6 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-zinc-400 dark:text-zinc-500" />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{lead.destinationCountry}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 hidden lg:table-cell">
                      {lead.nextFollowUpAt ? (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                          <Calendar size={14} />
                          <span className="text-xs font-bold">{formatDate(lead.nextFollowUpAt)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        getStatusColor(lead.status)
                      )}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-6 hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                        <Clock size={14} />
                        <span className="text-xs font-medium">{formatDate(lead.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditLead(lead)}
                          className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-[#064e3b] dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                          title="Edit Lead"
                        >
                          <RefreshCw size={16} />
                        </button>
                        {deleteConfirmId === lead.id ? (
                          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
                            <button 
                              onClick={() => handleDeleteLead(lead.id)}
                              className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-rose-700"
                            >
                              Del
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase rounded-lg hover:bg-zinc-200"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeleteConfirmId(lead.id)}
                            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Lead"
                          >
                            <X size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => setSelectedLead(lead)}
                          className="p-2 text-zinc-400 hover:text-[#064e3b] hover:bg-emerald-50 rounded-xl transition-all"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source ROI Sidebar */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
            <Target size={14} />
            Source Performance
          </h3>
          <div className="space-y-4">
            {getSourceStats().map(([source, count]) => (
              <div key={source} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-600 capitalize">{source}</span>
                  <span className="text-zinc-400 font-medium">{count} Leads</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600 rounded-full" 
                    style={{ width: `${(count / leads.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#064e3b] p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-900/20">
          <h3 className="text-xs font-black uppercase tracking-widest text-emerald-200/70 mb-4">AI Insight</h3>
          <p className="text-sm font-serif italic leading-relaxed">
            "Your highest quality leads are coming from <b>Trade Shows</b>. Consider reallocating 15% of your digital ad spend to upcoming trade expos in Dubai and Germany."
          </p>
        </div>
      </div>
    </div>
  </div>
);
}
