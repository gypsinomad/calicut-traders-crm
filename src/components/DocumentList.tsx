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
  ChevronRight,
  RefreshCw,
  Save,
  X,
  FileUp
} from 'lucide-react';
import { Document } from '../lib/types.ts';
import Modal from './Modal.tsx';
import { subscribeToCollection, createDocument } from '../services/db';
import { formatDate } from '../lib/utils';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';
import DocumentParser from './DocumentParser.tsx';

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

export default function DocumentList() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newDoc, setNewDoc] = useState<Partial<Document>>({
    name: '',
    type: 'proformaInvoice',
    status: 'pending',
    organization: profile?.organization || 'Calicut Spice Traders LLP'
  });

  useEffect(() => {
    const unsubscribe = subscribeToCollection<Document>('documents', (data) => {
      setDocuments(data);
      setLoading(false);
    }, undefined, 'uploadedAt', 'desc');

    return () => unsubscribe();
  }, []);

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
        status: 'pending'
      });
    } catch (error) {
      console.error('Error creating document:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      (doc.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (doc.relatedOrderId?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || doc.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">Documents</h2>
          <p className="text-zinc-500 mt-1">Manage export compliance and trade documents</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Upload size={18} />
          Upload Document
        </button>
      </header>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Upload New Document"
      >
        <form onSubmit={handleCreateDocument} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Document Name</label>
            <input 
              required
              type="text" 
              value={newDoc.name}
              onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="e.g. Commercial Invoice - Order #123"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Document Type</label>
              <select 
                value={newDoc.type}
                onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value as any })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</label>
              <select 
                value={newDoc.status}
                onChange={(e) => setNewDoc({ ...newDoc, status: e.target.value as any })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="pending">Pending</option>
                <option value="uploaded">Uploaded</option>
                <option value="verified">Verified</option>
                <option value="finalized">Finalized</option>
              </select>
            </div>
          </div>
          
          <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors cursor-pointer group bg-zinc-50/50">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-white rounded-full shadow-sm text-zinc-400 group-hover:text-emerald-500 transition-colors">
                <FileUp size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">Click to upload or drag and drop</p>
                <p className="text-xs text-zinc-500 mt-1">PDF, JPG, PNG up to 10MB</p>
              </div>
            </div>
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
              Upload Document
            </button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Search documents..." 
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex-1 sm:flex-none px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors appearance-none cursor-pointer"
              >
                <option value="all">All Types</option>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
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
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Document Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Order Ref</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Uploaded</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-zinc-500 font-medium">Loading documents...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <p className="text-zinc-400 text-sm font-medium">No documents found matching your criteria</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-zinc-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                              <FileText size={20} />
                            </div>
                            <span className="text-sm font-bold text-zinc-900 line-clamp-1">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-600">{typeLabels[doc.type] || doc.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          {doc.relatedOrderId ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 hover:underline cursor-pointer">
                              <span className="text-sm font-medium">#{doc.relatedOrderId}</span>
                              <ExternalLink size={12} />
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {doc.status === 'finalized' && <CheckCircle2 size={16} className="text-emerald-500" />}
                            {doc.status === 'verified' && <FileCheck2 size={16} className="text-blue-500" />}
                            {doc.status === 'uploaded' && <Clock size={16} className="text-amber-500" />}
                            {doc.status === 'pending' && <AlertCircle size={16} className="text-rose-500" />}
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
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
                            <span className="text-xs text-zinc-600">
                              {formatDate(doc.uploadedAt)}
                            </span>
                            <span className="text-[10px] text-zinc-400 mt-0.5">by {doc.uploadedBy}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">
                              <Download size={18} />
                            </button>
                            <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">
                              <MoreVertical size={18} />
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
        <div className="lg:col-span-1">
          <DocumentParser />
        </div>
      </div>
    </div>
  );
}
