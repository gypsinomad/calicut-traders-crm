import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Star, 
  Phone, 
  Mail, 
  MessageCircle, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  User,
  Activity,
  Award,
  Send,
  Trash2,
  Info
} from 'lucide-react';
import { Lead, LeadStatus } from '../lib/types.ts';
import { subscribeToCollection, updateDocument } from '../services/db';
import { generateBuyerFollowUp } from '../services/aiService';
import { useAuth } from './Auth.tsx';
import { Timestamp, arrayUnion } from 'firebase/firestore';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Modal from './Modal.tsx';

const PIPELINE_STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'lead', label: 'Lead', color: 'bg-zinc-100 text-zinc-600' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-50 text-blue-600' },
  { id: 'sampleSent', label: 'Sample Sent', color: 'bg-amber-50 text-amber-600' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-purple-50 text-purple-600' },
  { id: 'orderConfirmed', label: 'Order Confirmed', color: 'bg-emerald-50 text-emerald-600' },
  { id: 'repeatBuyer', label: 'Repeat Buyer', color: 'bg-[#064e3b] text-white' }
];

export default function BuyerPipeline() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [newActivity, setNewActivity] = useState({ type: 'call' as any, note: '' });
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiFollowUp, setAiFollowUp] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    if (!profile?.organization) return;

    const unsub = subscribeToCollection<Lead>(
      'leads',
      (data) => {
        setLeads(data);
        setLoading(false);
      },
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    return () => unsub();
  }, [profile?.organization]);

  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await updateDocument('leads', leadId, { status: newStatus });
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  const addActivity = async () => {
    if (!selectedLead || !newActivity.note) return;

    const activity = {
      type: newActivity.type,
      note: newActivity.note,
      timestamp: Timestamp.now(),
      performedBy: profile?.displayName || 'Unknown'
    };

    try {
      await updateDocument('leads', selectedLead.id, {
        activityLog: arrayUnion(activity),
        lastContactAt: Timestamp.now(),
        lastContactDate: Timestamp.now()
      });
      setIsActivityModalOpen(false);
      setNewActivity({ type: 'call', note: '' });
      // Update local state for the selected lead to show the new activity immediately
      setSelectedLead({
        ...selectedLead,
        activityLog: [...(selectedLead.activityLog || []), activity as any],
        lastContactAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedLead) return;
    setIsGeneratingAI(true);
    setIsAIModalOpen(true);
    try {
      const draft = await generateBuyerFollowUp(selectedLead);
      setAiFollowUp(draft || 'No draft available.');
    } catch (error) {
      setAiFollowUp('Failed to generate draft.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-emerald-600';
    if (score >= 3) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-serif font-bold text-zinc-900 tracking-tight">Buyer Intelligence</h1>
          <p className="text-zinc-500 mt-2 text-lg font-serif italic">Advanced CRM and sales pipeline for global spice trade.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Search buyers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-[#064e3b] text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] transition-all shadow-lg shadow-emerald-900/10">
            <Plus size={18} />
            New Buyer
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
        {PIPELINE_STAGES.map(stage => {
          const stageLeads = filteredLeads.filter(l => l.status === stage.id);
          return (
            <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", stage.color)}>
                    {stage.label}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">{stageLeads.length}</span>
                </div>
                <button className="p-1 text-zinc-400 hover:text-zinc-900 transition-all">
                  <MoreVertical size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-3 min-h-[500px] bg-zinc-50/50 p-2 rounded-3xl border border-dashed border-zinc-200">
                {stageLeads.map(lead => (
                  <motion.div
                    key={lead.id}
                    layoutId={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={cn(
                      "bg-white p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                      lead.lastContactAt && (new Date().getTime() - new Date(lead.lastContactAt.seconds * 1000).getTime()) > 14 * 24 * 60 * 60 * 1000
                        ? "border-rose-200 shadow-rose-900/5"
                        : "border-zinc-200 shadow-sm hover:border-emerald-500 hover:shadow-md"
                    )}
                  >
                    {lead.lastContactAt && (new Date().getTime() - new Date(lead.lastContactAt.seconds * 1000).getTime()) > 14 * 24 * 60 * 60 * 1000 && (
                      <div className="absolute top-0 right-0 p-1 bg-rose-500 text-white rounded-bl-xl">
                        <AlertCircle size={10} />
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{lead.destinationCountry}</span>
                      </div>
                      <div className="flex -space-x-1">
                        {[1, 2].map(i => (
                          <div key={i} className="w-5 h-5 rounded-full border border-white bg-zinc-100 flex items-center justify-center text-[8px] font-bold text-zinc-500">
                            {lead.fullName[0]}
                          </div>
                        ))}
                      </div>
                    </div>
                    <h4 className="font-bold text-zinc-900 truncate">{lead.fullName}</h4>
                    <p className="text-[10px] text-zinc-500 font-medium truncate mb-3">{lead.companyName}</p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-zinc-400">
                          {lead.lastContactAt ? formatDate(lead.lastContactAt) : 'No contact'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600">
                        <DollarSign size={12} />
                        <span className="text-[10px] font-black">
                          {lead.totalValue ? `$${lead.totalValue.toLocaleString()}` : '$0'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Buyer Detail Modal / Drawer */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto"
            >
              <div className="p-8 border-b border-zinc-100 sticky top-0 bg-white z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedLead(null)}
                    className="p-2 text-zinc-400 hover:text-zinc-900 transition-all"
                  >
                    <ChevronRight size={24} className="rotate-180" />
                  </button>
                  <div>
                    <h2 className="text-3xl font-serif font-bold text-zinc-900">{selectedLead.fullName}</h2>
                    <p className="text-sm text-zinc-500 font-medium">{selectedLead.companyName} • {selectedLead.destinationCountry}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all">
                    <Phone size={20} />
                  </button>
                  <button className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all">
                    <Mail size={20} />
                  </button>
                  <button className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20">
                    <MessageCircle size={20} />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-12">
                {/* Scorecard */}
                <section>
                  <h3 className="text-lg font-serif font-bold text-zinc-900 mb-6 flex items-center gap-2">
                    <Award className="text-emerald-600" size={20} />
                    Buyer Scorecard
                  </h3>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: 'Payment Reliability', score: selectedLead.scorecard?.paymentReliability || 4.5, icon: DollarSign },
                      { label: 'Order Frequency', score: selectedLead.scorecard?.orderFrequency || 3.8, icon: Activity },
                      { label: 'Order Size', score: selectedLead.scorecard?.orderSize || 4.2, icon: TrendingUp }
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <div className="flex items-center gap-2 mb-2">
                          <item.icon size={14} className="text-zinc-400" />
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{item.label}</span>
                        </div>
                        <div className="flex items-end gap-1">
                          <span className={cn("text-2xl font-serif font-bold", getScoreColor(item.score))}>{item.score}</span>
                          <span className="text-xs text-zinc-400 mb-1">/ 5.0</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Stats & History */}
                <section className="grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
                      <TrendingUp className="text-emerald-600" size={20} />
                      Trade History
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-2xl">
                        <span className="text-sm text-zinc-500 font-medium">Total Orders</span>
                        <span className="text-lg font-bold text-zinc-900">{selectedLead.totalOrders || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-2xl">
                        <span className="text-sm text-zinc-500 font-medium">Total Value</span>
                        <span className="text-lg font-bold text-emerald-600">${(selectedLead.totalValue || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-2xl">
                        <span className="text-sm text-zinc-500 font-medium">Last Contact</span>
                        <span className="text-lg font-bold text-zinc-900">
                          {selectedLead.lastContactAt ? formatDate(selectedLead.lastContactAt) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
                      <MapPin className="text-emerald-600" size={20} />
                      Preferences
                    </h3>
                    <div className="p-6 bg-[#064e3b] rounded-3xl text-white">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-4">Preferred Products</p>
                      <div className="flex flex-wrap gap-2">
                        {['Black Pepper', 'Cardamom', 'Turmeric'].map(tag => (
                          <span key={tag} className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold border border-white/10">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-8 pt-6 border-t border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-2">Incoterms</p>
                        <p className="text-lg font-bold">FOB, CIF</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* AI Follow-up Section */}
                <section className="bg-emerald-900 p-8 rounded-3xl text-white shadow-xl shadow-emerald-900/20">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                      <Activity className="text-emerald-400" size={20} />
                      AI Smart Follow-up
                    </h3>
                    <button 
                      onClick={handleGenerateAI}
                      disabled={isGeneratingAI}
                      className="px-4 py-2 bg-white text-emerald-900 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all disabled:opacity-50"
                    >
                      {isGeneratingAI ? 'Drafting...' : 'Draft Follow-up'}
                    </button>
                  </div>
                  <p className="text-sm text-emerald-100 italic font-serif">
                    Generate a personalized follow-up message based on this buyer's order history and preferences.
                  </p>
                </section>

                {/* Activity Log */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
                      <Clock className="text-emerald-600" size={20} />
                      Activity Log
                    </h3>
                    <button 
                      onClick={() => setIsActivityModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all"
                    >
                      <Plus size={14} />
                      Log Activity
                    </button>
                  </div>

                  <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-100">
                    {selectedLead.activityLog?.slice().reverse().map((log, idx) => (
                      <div key={idx} className="relative pl-12">
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 z-10 shadow-sm">
                          {log.type === 'call' ? <Phone size={14} /> : log.type === 'whatsapp' ? <MessageCircle size={14} /> : log.type === 'email' ? <Mail size={14} /> : <Users size={14} />}
                        </div>
                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-zinc-900 uppercase tracking-widest">{log.type}</span>
                            <span className="text-[10px] text-zinc-400 font-bold">{formatDate(log.timestamp)}</span>
                          </div>
                          <p className="text-sm text-zinc-600 mb-2">{log.note}</p>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-zinc-200" />
                            <span className="text-[10px] font-bold text-zinc-400">Logged by {log.performedBy}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!selectedLead.activityLog || selectedLead.activityLog.length === 0) && (
                      <div className="text-center py-12 bg-zinc-50/50 rounded-3xl border border-dashed border-zinc-200 ml-12">
                        <p className="text-sm text-zinc-400 font-serif italic">No activities logged yet.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activity Modal */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="Log Buyer Activity"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Activity Type</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'call', icon: Phone, label: 'Call' },
                  { id: 'email', icon: Mail, label: 'Email' },
                  { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp' },
                  { id: 'meeting', icon: Users, label: 'Meeting' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setNewActivity({ ...newActivity, type: type.id })}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                      newActivity.type === type.id 
                        ? "bg-emerald-50 border-emerald-500 text-emerald-600" 
                        : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                    )}
                  >
                    <type.icon size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Notes</label>
              <textarea 
                value={newActivity.note}
                onChange={(e) => setNewActivity({ ...newActivity, note: e.target.value })}
                placeholder="What was discussed?"
                rows={4}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsActivityModalOpen(false)}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={addActivity}
              className="px-8 py-2 bg-[#064e3b] text-white rounded-xl text-sm font-bold hover:bg-[#065f46] transition-all flex items-center gap-2"
            >
              <Send size={16} />
              Save Activity
            </button>
          </div>
        </div>
      </Modal>

      {/* AI Follow-up Modal */}
      <Modal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        title="AI Follow-up Draft"
      >
        <div className="space-y-6">
          {isGeneratingAI ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm text-zinc-500 font-serif italic">Drafting personalized message...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 text-sm text-zinc-700 whitespace-pre-wrap font-serif leading-relaxed">
                {aiFollowUp}
              </div>
              <div className="flex items-center gap-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <Info size={16} className="text-emerald-600" />
                <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest">Tip: Personalize the message with recent market trends.</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsAIModalOpen(false)}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                // Copy to clipboard or send
                if (aiFollowUp) navigator.clipboard.writeText(aiFollowUp);
                setIsAIModalOpen(false);
              }}
              className="px-8 py-2 bg-[#064e3b] text-white rounded-xl text-sm font-bold hover:bg-[#065f46] transition-all flex items-center gap-2"
            >
              <Send size={16} />
              Copy to Clipboard
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
