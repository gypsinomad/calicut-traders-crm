import React, { useState, useEffect } from 'react';
import { Quote, ExportOrder, Lead, QuoteItem } from '../lib/types';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  FileText, 
  CheckCircle2, 
  Clock, 
  X, 
  Download, 
  Trash2, 
  Edit2, 
  ArrowRight, 
  RefreshCw,
  Copy,
  Mail,
  Printer,
  Sparkles,
  CheckSquare,
  Square,
  ChevronDown,
  Zap,
  Save,
  User,
  Send,
  Eye
} from 'lucide-react';
import { TranslatedText } from './TranslatedText';
import { useAuth } from './Auth';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/db';
import { Timestamp } from 'firebase/firestore';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';
import { generateDocument } from '../lib/documentGenerator';
import QuoteBuilder from './QuoteBuilder';
import SendToBuyerDialog from './SendToBuyerDialog';

export default function QuoteList() {
  const { profile } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiDraft, setAiDraft] = useState<Partial<Quote> | null>(null);
  const [sendingQuote, setSendingQuote] = useState<Quote | null>(null);
  const [previewingQuote, setPreviewingQuote] = useState<Quote | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (!profile?.organization) return;
    
    const filter = [{ field: 'organization', operator: '==', value: profile.organization }];
    
    const unsubQuotes = subscribeToCollection<Quote>('quotes', (data) => {
      setQuotes(data);
      setLoading(false);
    }, filter, 'createdAt', 'desc');

    const unsubLeads = subscribeToCollection<Lead>('leads', (data) => {
      setLeads(data);
    }, filter);

    return () => {
      unsubQuotes();
      unsubLeads();
    };
  }, [profile]);

  const handleBulkStatusUpdate = async (status: Quote['status']) => {
    if (selectedQuotes.length === 0) return;
    try {
      await Promise.all(selectedQuotes.map(id => updateDocument('quotes', id, { status })));
      setSelectedQuotes([]);
    } catch (error) {
      console.error("Error updating bulk status:", error);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;
    try {
      await deleteDocument('quotes', id);
    } catch (error) {
      console.error("Error deleting quote:", error);
    }
  };

  const convertToOrder = async (quote: Quote) => {
    if (!profile?.organization) return;
    try {
      const orderData: Partial<ExportOrder> = {
        orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: quote.companyName || 'Customer Name',
        title: `Order from Quote ${quote.quoteNumber}`,
        commodity: quote.items[0]?.productName || 'Various',
        quantity: quote.items.reduce((acc, item) => acc + item.quantity, 0),
        unit: quote.items[0]?.unit || 'kg',
        stage: 'orderConfirmed',
        status: 'Confirmed',
        totalAmount: quote.totalAmount,
        totalValue: quote.totalAmount,
        destination: quote.destinationCountry || 'Destination',
        destinationCountry: quote.destinationCountry || 'Country',
        assignedUserId: profile.uid,
        companyId: quote.companyId,
        currency: quote.currency,
        items: quote.items,
        documents: [],
        docsCompleted: 0,
        docsTotal: 5,
        organization: profile.organization,
      };

      await createDocument('orders', orderData);
      await updateDocument('quotes', quote.id, { status: 'converted' });
      alert('Quote converted to order successfully!');
    } catch (error) {
      console.error("Error converting quote to order:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'converted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'sent': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'rejected':
      case 'expired': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-100';
    }
  };

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (q.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedQuotes.length === filteredQuotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(filteredQuotes.map(q => q.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedQuotes(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedQuotes.length} quotations?`)) return;
    try {
      await Promise.all(selectedQuotes.map(id => deleteDocument('quotes', id)));
      setSelectedQuotes([]);
    } catch (error) {
      console.error("Error in bulk delete:", error);
    }
  };

  const handleAIDraft = async (lead: Lead) => {
    setIsGeneratingAI(true);
    setSelectedLead(lead);

    try {
      if (!isAIAvailable()) {
        // Smart Mode Fallback (Rule-based)
        const draft = {
          items: [
            { 
              productName: lead.productInterest || 'Premium Commodities', 
              quantity: 1, 
              unit: 'MT', 
              unitPrice: 4500, 
              totalPrice: 4500 
            }
          ],
          totalAmount: 4500,
          currency: 'USD',
          validUntilDays: 30
        };

        setAiDraft({
          quoteNumber: `QT-SMART-${Math.floor(100000 + Math.random() * 900000)}`,
          leadId: lead.id,
          companyName: lead.companyName,
          contactName: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          whatsappNumber: lead.whatsappNumber || lead.phone,
          destinationCountry: lead.destinationCountry,
          items: draft.items.map((item: any) => ({
            ...item,
            productId: Math.random().toString(36).substr(2, 9)
          })),
          totalAmount: draft.totalAmount,
          currency: draft.currency || 'USD',
          status: 'draft',
          validUntil: Timestamp.fromDate(new Date(Date.now() + (draft.validUntilDays || 30) * 24 * 60 * 60 * 1000)) as any
        });
        return;
      }

      const prompt = `Generate a draft Proforma Invoice for the following lead:
      Company: ${lead.companyName}
      Contact: ${lead.fullName}
      Email: ${lead.email}
      Phone: ${lead.phone}
      Country: ${lead.destinationCountry}
      Interest: ${lead.productInterest}
      
      Current market context: High quality products from India.
      Return a JSON object with:
      items: array of { productName: string, quantity: number, unit: string, unitPrice: number, totalPrice: number }
      totalAmount: number
      currency: 'USD'
      validUntilDays: number (e.g. 30)
      `;

      const response = await generateAIContent('AI Draft Generation', {
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const draft = JSON.parse(response.text || '{}');
        setAiDraft({
          quoteNumber: `QT-AI-${Math.floor(100000 + Math.random() * 900000)}`,
          leadId: lead.id,
          companyName: lead.companyName,
          contactName: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          whatsappNumber: lead.whatsappNumber || lead.phone,
          destinationCountry: lead.destinationCountry,
          items: (draft.items && draft.items.length > 0 ? draft.items : [
            { 
              productName: lead.productInterest || 'Premium Commodities', 
              quantity: 1, 
              unit: 'MT', 
              unitPrice: 4500, 
              totalPrice: 4500 
            }
          ]).map((item: any) => ({
            ...item,
            productId: Math.random().toString(36).substr(2, 9)
          })),
          totalAmount: draft.totalAmount || 4500,
          currency: draft.currency || 'USD',
          status: 'draft',
          validUntil: Timestamp.fromDate(new Date(Date.now() + (draft.validUntilDays || 30) * 24 * 60 * 60 * 1000)) as any
        });
    } catch (error: any) {
      handleAIError(error);
      // Smart Mode Fallback (Rule-based)
      setAiDraft({
        quoteNumber: `QT-SMART-${Math.floor(100000 + Math.random() * 900000)}`,
        leadId: lead.id,
        companyName: lead.companyName,
        contactName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        whatsappNumber: lead.whatsappNumber || lead.phone,
        destinationCountry: lead.destinationCountry,
        items: [
          { 
            productId: Math.random().toString(36).substr(2, 9),
            productName: lead.productInterest || 'Premium Commodities', 
            quantity: 1, 
            unit: 'MT', 
            unitPrice: 4500, 
            totalPrice: 4500 
          }
        ],
        totalAmount: 4500,
        currency: 'USD',
        status: 'draft',
        validUntil: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) as any
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const saveAIDraft = async () => {
    if (!aiDraft || !profile?.organization) return;
    try {
      await createDocument('quotes', {
        ...aiDraft,
        organization: profile.organization,
        createdBy: profile.uid,
        createdAt: Timestamp.now()
      });
      setAiDraft(null);
      alert('AI Quote saved as draft!');
    } catch (error) {
      console.error('Error saving AI draft:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Quote Number', 'Company', 'Amount', 'Currency', 'Status', 'Valid Until', 'Created At'];
    const rows = filteredQuotes.map(q => [
      q.quoteNumber,
      q.companyName || 'N/A',
      q.totalAmount,
      q.currency,
      q.status,
      q.validUntil?.toDate ? format(q.validUntil.toDate(), 'yyyy-MM-dd') : 'N/A',
      q.createdAt?.toDate ? format(q.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `quotations_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">
            <TranslatedText>Quotations</TranslatedText>
          </h2>
          <p className="text-zinc-500 mt-1">
            <TranslatedText>Manage and track export price quotes</TranslatedText>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm"
          >
            <Download size={18} />
            <TranslatedText>Export</TranslatedText>
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <TranslatedText>Create Quote</TranslatedText>
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by quote # or company..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={18} className="text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </div>

      {selectedQuotes.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl"
        >
          <span className="text-sm font-bold text-emerald-700">
            {selectedQuotes.length} quotations selected
          </span>
          <div className="flex items-center gap-3">
            <select 
              onChange={(e) => handleBulkStatusUpdate(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 outline-none"
              defaultValue=""
            >
              <option value="" disabled>Update Status</option>
              <option value="sent">Mark as Sent</option>
              <option value="accepted">Mark as Accepted</option>
              <option value="rejected">Mark as Rejected</option>
            </select>
            <button 
              onClick={handleBulkDelete}
              className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
              title="Delete Selected"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Zap size={16} className="text-emerald-600" />
            Leads Awaiting Quotes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-zinc-100">
              {leads.filter(l => l.status === 'new' || l.status === 'contacted').slice(0, 3).map(lead => (
                <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <p className="text-xs font-bold text-zinc-900">{lead.fullName}</p>
                    <p className="text-[10px] text-zinc-500">{lead.companyName}</p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-[10px] text-zinc-600 line-clamp-1">{lead.productInterest}</p>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button 
                      onClick={() => handleAIDraft(lead)}
                      disabled={isGeneratingAI}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors border border-emerald-100"
                    >
                      {isGeneratingAI ? <RefreshCw size={12} className="animate-spin" /> : (isAIAvailable() ? <Sparkles size={12} /> : <Zap size={12} />)}
                      {isAIAvailable() ? 'AI Generate Quote' : 'Smart Generate Quote'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="w-12 px-6 py-4">
                  <input 
                    type="checkbox" 
                    checked={selectedQuotes.length === filteredQuotes.length && filteredQuotes.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <TranslatedText>Quote # & Company</TranslatedText>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <TranslatedText>Amount</TranslatedText>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">
                  <TranslatedText>Valid Until</TranslatedText>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <TranslatedText>Status</TranslatedText>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">
                  <TranslatedText>Actions</TranslatedText>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Loading quotes...</p>
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-zinc-400 text-sm">No quotations found</p>
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedQuotes.includes(quote.id)}
                        onChange={() => toggleSelect(quote.id)}
                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 text-zinc-600 rounded-lg hidden xs:block">
                          <FileText size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{quote.quoteNumber}</p>
                          <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                            <User size={10} />
                            {quote.companyName || 'Unknown Company'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-zinc-900">
                        {quote.currency} {quote.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">{quote.items.length} items</p>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Clock size={14} />
                        <span className="text-xs">
                          {quote.validUntil?.toDate ? format(quote.validUntil.toDate(), 'MMM dd, yyyy') : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setPreviewingQuote(quote)}
                          className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Preview PI"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => setSendingQuote(quote)}
                          className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Send to Buyer"
                        >
                          <Send size={18} />
                        </button>
                        {quote.status === 'accepted' && (
                          <button 
                            onClick={() => convertToOrder(quote)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Convert to Order"
                          >
                            <ArrowRight size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => setEditingQuote(quote)}
                          className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 size={18} />
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

      <QuoteBuilder
        isOpen={showCreateModal || !!editingQuote || !!aiDraft}
        onClose={() => {
          setShowCreateModal(false);
          setEditingQuote(null);
          setAiDraft(null);
          setSelectedLead(null);
        }}
        quote={editingQuote || (aiDraft as Quote)}
        lead={selectedLead || undefined}
        onSaved={() => {
          setShowCreateModal(false);
          setEditingQuote(null);
          setAiDraft(null);
          setSelectedLead(null);
        }}
      />

      {sendingQuote && (
        <SendToBuyerDialog
          isOpen={!!sendingQuote}
          onClose={() => setSendingQuote(null)}
          quote={sendingQuote}
          onSent={() => {
            setSendingQuote(null);
          }}
        />
      )}

      {previewingQuote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-zinc-900">Proforma Invoice Preview</h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.print()}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all"
                >
                  <Printer size={20} />
                </button>
                <button 
                  onClick={() => setPreviewingQuote(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-zinc-50">
              <div 
                className="bg-white shadow-lg mx-auto p-12 min-h-[800px] w-full max-w-[800px]"
                dangerouslySetInnerHTML={{ 
                  __html: generateDocument('proformaInvoice', {
                    orderNumber: previewingQuote.quoteNumber,
                    customerName: previewingQuote.companyName || previewingQuote.contactName || 'Valued Customer',
                    commodity: previewingQuote.items[0]?.productName || 'Premium Commodities',
                    quantity: previewingQuote.items[0]?.quantity || 1,
                    unit: previewingQuote.items[0]?.unit || 'MT',
                    totalAmount: previewingQuote.totalAmount,
                    currency: previewingQuote.currency,
                    destination: previewingQuote.destinationCountry || 'International',
                    destinationCountry: previewingQuote.destinationCountry || '',
                    incoterms: previewingQuote.incoterms,
                    paymentTerms: previewingQuote.paymentTerms,
                    items: previewingQuote.items.map(i => ({
                      productName: i.productName,
                      quantity: i.quantity,
                      unit: i.unit,
                      unitPrice: i.unitPrice,
                      totalPrice: i.totalPrice
                    }))
                  } as any)
                }}
              />
            </div>
            <div className="p-6 border-t border-zinc-100 bg-white flex justify-end gap-4">
              <button 
                onClick={() => setPreviewingQuote(null)}
                className="px-6 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setSendingQuote(previewingQuote);
                  setPreviewingQuote(null);
                }}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <Send size={18} />
                Send to Buyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
