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
  Calendar,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Shield
} from 'lucide-react';
import { Lead, LeadStatus } from '../lib/types.ts';
import LeadDetails from './LeadDetails.tsx';
import Modal from './Modal.tsx';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/db';
import { getStatusColor, formatDate } from '../lib/utils';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';
import { TranslatedText } from './TranslatedText.tsx';

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

  const [newLead, setNewLead] = useState<Partial<Lead>>({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    destinationCountry: '',
    productInterest: '',
    incotermsPreference: 'FOB',
    source: 'website',
    status: 'new',
    priority: 'warm',
    organization: profile?.organization || 'Calicut Spice Traders LLP'
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
        organization: profile?.organization || 'Calicut Spice Traders LLP',
        nextFollowUpAt: nextFollowUpDate ? Timestamp.fromDate(new Date(nextFollowUpDate)) : null,
      };

      await createDocument('leads', leadData);
      setIsModalOpen(false);
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
      console.error('Error creating lead:', error);
    } finally {
      setIsSubmitting(false);
    }
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
    if (selectedLeadIds.length === 0 || !window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} leads?`)) return;
    try {
      const promises = selectedLeadIds.map(id => deleteDocument('leads', id));
      await Promise.all(promises);
      setSelectedLeadIds([]);
      alert(`Successfully deleted ${selectedLeadIds.length} leads`);
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
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900"><TranslatedText>Leads</TranslatedText></h2>
          <p className="text-zinc-500 mt-1"><TranslatedText>Manage international trade inquiries</TranslatedText></p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <RefreshCw size={18} />
            Export CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <TranslatedText>New Lead</TranslatedText>
          </button>
        </div>
      </header>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Create New Export Lead"
      >
        <form onSubmit={handleCreateLead} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
              <input 
                required
                type="text" 
                value={newLead.fullName}
                onChange={(e) => setNewLead({ ...newLead, fullName: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Company Name</label>
              <input 
                type="text" 
                value={newLead.companyName}
                onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g. Global Spices Ltd"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
              <input 
                required
                type="email" 
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g. john@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone Number</label>
              <input 
                type="tel" 
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g. +44 20 1234 5678"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Destination Country</label>
              <input 
                type="text" 
                value={newLead.destinationCountry}
                onChange={(e) => setNewLead({ ...newLead, destinationCountry: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g. United Kingdom"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Priority Level</label>
              <select 
                value={newLead.priority}
                onChange={(e) => setNewLead({ ...newLead, priority: e.target.value as any })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Incoterms</label>
              <select 
                value={newLead.incotermsPreference}
                onChange={(e) => setNewLead({ ...newLead, incotermsPreference: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="EXW">EXW</option>
                <option value="CNF">CNF</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Next Follow-up</label>
              <input 
                type="date" 
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Product Interest</label>
            <textarea 
              rows={3}
              value={newLead.productInterest}
              onChange={(e) => setNewLead({ ...newLead, productInterest: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              placeholder="e.g. Interested in 5MT Black Pepper and 2MT Cardamom..."
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
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
              Create Lead
            </button>
          </div>
        </form>
      </Modal>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search leads..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedLeadIds.length > 0 && (
            <div className="flex items-center gap-2 mr-2 pr-4 border-r border-zinc-200">
              <span className="text-xs font-bold text-zinc-500 uppercase">{selectedLeadIds.length} Selected</span>
              <select 
                onChange={(e) => handleBulkStatusUpdate(e.target.value as LeadStatus)}
                className="px-3 py-1.5 bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-600 outline-none"
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
              <button 
                onClick={handleBulkDelete}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete Selected"
              >
                <X size={18} />
              </button>
            </div>
          )}
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="quoted">Quoted</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
          <button className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Company</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Product Interest</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Market</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Follow-up</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Created</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-zinc-500 font-medium">Loading leads...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-zinc-400 text-sm">No leads found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className={`hover:bg-zinc-50/50 transition-colors group cursor-pointer ${selectedLeadIds.includes(lead.id) ? 'bg-emerald-50/30' : ''}`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-900">{lead.fullName}</span>
                          {lead.riskScore ? (
                            <div 
                              className={`p-1 rounded-full cursor-help group/risk relative`}
                              title={lead.riskExplanation}
                            >
                              {lead.riskScore === 'low' && <ShieldCheck size={14} className="text-emerald-500" />}
                              {lead.riskScore === 'medium' && <Shield size={14} className="text-amber-500" />}
                              {lead.riskScore === 'high' && <ShieldAlert size={14} className="text-rose-500" />}
                              
                              <div className="absolute left-full ml-2 top-0 w-48 p-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/risk:opacity-100 transition-opacity z-50 pointer-events-none shadow-xl">
                                <p className="font-bold uppercase mb-1">{isAIAvailable() ? 'AI Risk Assessment' : 'Smart Risk Assessment'}: {lead.riskScore}</p>
                                {lead.riskExplanation}
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); calculateRiskScore(lead); }}
                              className="p-1 text-zinc-300 hover:text-emerald-500 transition-colors"
                              title={isAIAvailable() ? "Calculate AI Risk Score" : "Calculate Smart Risk Score"}
                            >
                              <Zap size={12} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <a href={`mailto:${lead.email}`} className="text-zinc-400 hover:text-emerald-500 transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Mail size={14} />
                          </a>
                          <a href={`tel:${lead.phone}`} className="text-zinc-400 hover:text-emerald-500 transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Phone size={14} />
                          </a>
                          {lead.source === 'whatsapp' && (
                            <MessageSquare size={14} className="text-emerald-500" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="text-sm text-zinc-600"><TranslatedText>{lead.companyName}</TranslatedText></span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm text-zinc-600"><TranslatedText>{lead.productInterest}</TranslatedText></span>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-zinc-400" />
                        <span className="text-sm text-zinc-600"><TranslatedText>{lead.destinationCountry}</TranslatedText></span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {lead.nextFollowUpAt ? (
                        <div className="flex items-center gap-2 text-amber-600">
                          <Calendar size={14} />
                          <span className="text-xs font-medium">{formatDate(lead.nextFollowUpAt)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Clock size={14} />
                        <span className="text-xs">{formatDate(lead.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors">
                        <ChevronRight size={18} />
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
