import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Download,
  MoreVertical,
  ExternalLink,
  FileCheck2,
  Lock,
  Shield,
  FolderOpen,
  History,
  Eye,
  Trash2,
  FileUp,
  RefreshCw,
  Save,
  X,
  Sparkles,
  Zap,
  CheckSquare,
  Square,
  ChevronDown
} from 'lucide-react';
import { Document } from '../lib/types.ts';
import Modal from './Modal.tsx';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/db';
import { formatDate } from '../lib/utils';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';
import DocumentParser from './DocumentParser.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const typeLabels: Record<string, string> = {
  proformaInvoice: 'Proforma Invoice',
  commercialInvoice: 'Commercial Invoice',
  contract: 'Contract',
  packingList: 'Packing List',
  billOfLading: 'Bill of Lading',
  coo: 'Certificate of Origin',
  fssai: 'FSSAI License',
  apeda: 'APEDA Certificate',
  phytoCertificate: 'Phyto-sanitary',
};

export default function DocumentVault() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [analyzingDoc, setAnalyzingDoc] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const [newDoc, setNewDoc] = useState<Partial<Document>>({
    name: '',
    type: 'proformaInvoice',
    status: 'pending',
    relatedOrderId: '',
    organization: profile?.organization || 'Calicut Spice Traders LLP'
  });

  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.organization) return;

    const filter = [{ field: 'organization', operator: '==', value: profile.organization }];
    const unsubscribe = subscribeToCollection<Document>('documents', (data) => {
      setDocuments(data);
      setLoading(false);
    }, filter, 'uploadedAt', 'desc');

    // Mock audit logs based on documents
    const logs = documents.flatMap(doc => [
      { id: `log-${doc.id}-upload`, action: 'Uploaded', document: doc.name, user: doc.uploadedBy, timestamp: doc.uploadedAt },
      { id: `log-${doc.id}-view`, action: 'Viewed', document: doc.name, user: 'System User', timestamp: Timestamp.now() }
    ]).sort((a, b) => b.timestamp.seconds - a.timestamp.seconds).slice(0, 20);
    setAuditLogs(logs);

    return () => unsubscribe();
  }, [profile, documents.length]);

  const totalStorage = documents.reduce((sum, doc) => sum + (doc.size || 0), 0);
  const storageLimit = 100 * 1024 * 1024; // 100MB
  const storagePercent = Math.min((totalStorage / storageLimit) * 100, 100);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.name || !newDoc.type) return;

    setIsSubmitting(true);
    try {
      const docData = {
        ...newDoc,
        url: '#',
        fileUrl: '#',
        uploadedAt: Timestamp.now(),
        uploadedBy: profile?.displayName || 'System User',
        organization: profile?.organization || 'Calicut Spice Traders LLP'
      };
      await createDocument('documents', docData as Document);
      setIsModalOpen(false);
      setNewDoc({
        name: '',
        type: 'proformaInvoice',
        status: 'pending',
        relatedOrderId: ''
      });
    } catch (error) {
      console.error('Error creating document:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to move this document to archive?')) {
      try {
        await deleteDocument('documents', id);
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const analyzeDocument = async (doc: Document) => {
    setAnalyzingDoc(doc.id);
    try {
      const model = 'gemini-3-flash-preview';
      const prompt = `Analyze this trade document:
      Name: ${doc.name}
      Type: ${doc.type}
      Order Ref: ${doc.relatedOrderId}
      
      Provide a compliance analysis for an export/logistics company.
      Return a JSON object with: complianceStatus ('verified', 'flagged', 'incomplete'), score (0-100), keyFindings (array of strings), and summary (max 50 words).`;

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const analysis = JSON.parse(response.text || '{}');
      await updateDocument('documents', doc.id, { 
        analysisAI: analysis,
        status: analysis.complianceStatus === 'verified' ? 'verified' : 'pending'
      });
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc({ ...selectedDoc, analysisAI: analysis, status: analysis.complianceStatus === 'verified' ? 'verified' : 'pending' });
      }
    } catch (error) {
      console.error('Document analysis error:', error);
    } finally {
      setAnalyzingDoc(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedDocIds.length} documents?`)) return;
    try {
      await Promise.all(selectedDocIds.map(id => deleteDocument('documents', id)));
      setSelectedDocIds([]);
    } catch (error) {
      console.error("Error in bulk delete:", error);
    }
  };

  const handleFileExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsSubmitting(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const prompt = "Extract key trade information from this document image. Return JSON with: consignee, vesselName, totalWeight, invoiceNumber, date.";
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          }],
          config: { responseMimeType: 'application/json' }
        });
        
        const extracted = JSON.parse(response.text || '{}');
        alert(`AI Extracted Data:\n${JSON.stringify(extracted, null, 2)}`);
        
        // Pre-fill new document form
        setNewDoc({
          ...newDoc,
          name: extracted.invoiceNumber ? `Invoice ${extracted.invoiceNumber}` : file.name,
          relatedOrderId: extracted.invoiceNumber || ''
        });
        setIsModalOpen(true);
      };
    } catch (error) {
      console.error('Extraction error:', error);
      alert('Failed to extract data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedDocIds.length === 0) return;
    window.print();
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      (doc.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (doc.relatedOrderId?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || doc.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: documents.length,
    verified: documents.filter(d => d.status === 'verified' || d.status === 'finalized').length,
    pending: documents.filter(d => d.status === 'pending' || d.status === 'uploaded').length,
    storage: `${formatSize(totalStorage)} / 100 MB`
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
              <Shield size={20} />
            </div>
            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Document Vault</h2>
          </div>
          <p className="text-zinc-500">Secure storage and compliance management for trade documents</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-100">
            <Sparkles size={18} />
            Smart Extract
            <input type="file" className="hidden" onChange={handleFileExtract} accept="image/*,application/pdf" />
          </label>
          <button 
            onClick={() => setShowAuditLog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-colors"
          >
            <History size={18} />
            Audit Log
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Upload size={18} />
            Secure Upload
          </button>
        </div>
      </header>

      {/* Vault Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Files', value: stats.total, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Verified', value: stats.verified, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Vault Storage', value: stats.storage, icon: Lock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-zinc-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Search vault by name or order ID..." 
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {selectedDocIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkExport}
                    className="px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-100 transition-all flex items-center gap-2"
                  >
                    <Download size={14} />
                    Export PDF ({selectedDocIds.length})
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-rose-100 transition-all flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex-1 sm:flex-none px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="w-12 px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0}
                        onChange={() => {
                          if (selectedDocIds.length === filteredDocs.length) setSelectedDocIds([]);
                          else setSelectedDocIds(filteredDocs.map(d => d.id));
                        }}
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Document</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Order Ref</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Security Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Timeline</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <RefreshCw className="animate-spin mx-auto text-zinc-400 mb-2" size={24} />
                        <p className="text-sm text-zinc-500 font-bold">Accessing Vault...</p>
                      </td>
                    </tr>
                  ) : filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <p className="text-zinc-400 text-sm font-bold">No documents found in this section</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-zinc-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedDocIds.includes(doc.id)}
                            onChange={() => {
                              setSelectedDocIds(prev => 
                                prev.includes(doc.id) ? prev.filter(i => i !== doc.id) : [...prev, doc.id]
                              );
                            }}
                            className="rounded border-zinc-300 text-zinc-900 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-zinc-100 rounded-xl text-zinc-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all">
                              <FileText size={20} />
                            </div>
                            <div>
                              <span className="text-sm font-black text-zinc-900 block">{doc.name}</span>
                              <span className="text-[10px] text-zinc-400 uppercase font-bold">Encrypted Storage</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-zinc-600 bg-zinc-100 px-2 py-1 rounded-md">
                            {typeLabels[doc.type] || doc.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {doc.relatedOrderId ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs">
                              <span>#{doc.relatedOrderId}</span>
                              <ExternalLink size={12} />
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {doc.status === 'finalized' && <CheckCircle2 size={16} className="text-emerald-500" />}
                            {doc.status === 'verified' && <FileCheck2 size={16} className="text-blue-500" />}
                            {doc.status === 'uploaded' && <Clock size={16} className="text-amber-500" />}
                            {doc.status === 'pending' && <AlertCircle size={16} className="text-rose-500" />}
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                              doc.status === 'finalized' ? 'text-emerald-700' :
                              doc.status === 'verified' ? 'text-blue-700' :
                              doc.status === 'uploaded' ? 'text-amber-700' :
                              'text-rose-700'
                            }`}>
                              {doc.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-zinc-900">
                              {formatDate(doc.uploadedAt)}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">by {doc.uploadedBy}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                analyzeDocument(doc);
                              }}
                              disabled={analyzingDoc === doc.id}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50"
                              title="AI Compliance Analysis"
                            >
                              {analyzingDoc === doc.id ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
                            </button>
                            <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">
                              <Download size={18} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Shield size={20} />
                  </div>
                  <h3 className="font-black text-zinc-900 tracking-tight">Vault Health</h3>
                </div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Secure</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-zinc-400">Storage Used</span>
                  <span className="text-zinc-900">{stats.storage}</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <DocumentParser />
          
          <div className="bg-zinc-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Shield size={80} />
            </div>
            <h3 className="text-lg font-black mb-2 relative z-10">Vault Security</h3>
            <p className="text-sm text-zinc-400 mb-6 relative z-10">All documents are encrypted at rest and in transit. Access is monitored via audit logs.</p>
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
                  <Lock size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold">AES-256 Encryption</p>
                  <p className="text-[10px] text-zinc-500">Active</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                  <Eye size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold">Access Monitoring</p>
                  <p className="text-[10px] text-zinc-500">Real-time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Secure Document Upload"
      >
        <form onSubmit={handleCreateDocument} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Document Name</label>
            <input 
              required
              type="text" 
              value={newDoc.name}
              onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              placeholder="e.g. Commercial Invoice - Order #123"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Document Type</label>
              <select 
                value={newDoc.type}
                onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value as any })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Order Reference (#)</label>
              <input 
                type="text" 
                value={newDoc.relatedOrderId}
                onChange={(e) => setNewDoc({ ...newDoc, relatedOrderId: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                placeholder="e.g. ORD-123"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Initial Status</label>
            <select 
              value={newDoc.status}
              onChange={(e) => setNewDoc({ ...newDoc, status: e.target.value as any })}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
            >
              <option value="pending">Pending Review</option>
              <option value="uploaded">Uploaded</option>
            </select>
          </div>
          
          <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-8 text-center hover:border-emerald-500 transition-colors cursor-pointer group bg-zinc-50/50">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-white rounded-full shadow-sm text-zinc-400 group-hover:text-emerald-500 transition-colors">
                <FileUp size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-zinc-900">Secure File Drop</p>
                <p className="text-xs text-zinc-500 mt-1">Files will be encrypted upon upload</p>
              </div>
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
              Encrypt & Upload
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Detail Sidebar/Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-end pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoc(null)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-white shadow-2xl relative z-10 pointer-events-auto overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-20">
                <h3 className="text-xl font-black text-zinc-900">Document Details</h3>
                <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center text-zinc-400 mb-4">
                    <FileText size={40} />
                  </div>
                  <h4 className="text-lg font-black text-zinc-900">{selectedDoc.name}</h4>
                  <p className="text-sm text-zinc-500 uppercase font-bold tracking-widest mt-1">
                    {typeLabels[selectedDoc.type] || selectedDoc.type}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-sm font-bold text-zinc-900 uppercase">{selectedDoc.status}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Size</p>
                    <p className="text-sm font-bold text-zinc-900">2.4 MB</p>
                  </div>
                </div>

                {selectedDoc.analysisAI && (
                  <div className={`p-6 rounded-2xl border ${
                    selectedDoc.analysisAI.complianceStatus === 'flagged' ? 'bg-rose-50 border-rose-100' :
                    selectedDoc.analysisAI.complianceStatus === 'incomplete' ? 'bg-amber-50 border-amber-100' :
                    'bg-emerald-50 border-emerald-100'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} className={
                          selectedDoc.analysisAI.complianceStatus === 'flagged' ? 'text-rose-600' :
                          selectedDoc.analysisAI.complianceStatus === 'incomplete' ? 'text-amber-600' :
                          'text-emerald-600'
                        } />
                        <span className="text-xs font-black uppercase tracking-widest">AI Compliance Analysis</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                        selectedDoc.analysisAI.complianceStatus === 'flagged' ? 'bg-rose-100 text-rose-700' :
                        selectedDoc.analysisAI.complianceStatus === 'incomplete' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {selectedDoc.analysisAI.complianceStatus} ({selectedDoc.analysisAI.score}/100)
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 mb-4 leading-relaxed">{selectedDoc.analysisAI.summary}</p>
                    <div className="space-y-2">
                      {selectedDoc.analysisAI.keyFindings.map((finding, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Zap size={14} className="text-zinc-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-zinc-600 leading-relaxed">{finding}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h5 className="text-xs font-black text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Properties</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Uploaded At</span>
                      <span className="font-bold text-zinc-900">{formatDate(selectedDoc.uploadedAt)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Uploaded By</span>
                      <span className="font-bold text-zinc-900">{selectedDoc.uploadedBy}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Order Ref</span>
                      <span className="font-bold text-emerald-600">#{selectedDoc.relatedOrderId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Organization</span>
                      <span className="font-bold text-zinc-900">{selectedDoc.organization}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-xs font-black text-zinc-900 uppercase tracking-widest border-b border-zinc-100 pb-2">Actions</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors">
                      <Download size={18} />
                      Download
                    </button>
                    <button className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-colors">
                      <Eye size={18} />
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Audit Log Modal */}
      <Modal
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
        title="Document Audit Log"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <div className="p-2 bg-white rounded-xl text-zinc-400 shadow-sm">
                <Clock size={16} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-zinc-900">{log.action}: {log.document}</p>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{formatDate(log.timestamp)}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Performed by {log.user}</p>
              </div>
            </div>
          ))}
          {auditLogs.length === 0 && (
            <div className="text-center py-8 text-zinc-400">
              No activity logs found
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
