import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Eye, 
  Plus,
  Zap,
  ChevronRight,
  X,
  FileCheck,
  Send
} from 'lucide-react';
import { ExportOrder, DocType, GeneratedDocument } from '../lib/types';
import { generateDocument } from '../lib/documentGenerator';
import { createDocument, subscribeToCollection, updateDocument } from '../services/db';
import { useAuth } from './Auth';
import { Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import SendToBuyerDialog from './SendToBuyerDialog';

interface DocumentGeneratorProps {
  order: ExportOrder;
  onClose?: () => void;
}

const DOCUMENT_TYPES: { type: DocType; name: string; description: string }[] = [
  { type: 'proformaInvoice', name: 'Proforma Invoice', description: 'Pre-shipment invoice for buyer approval' },
  { type: 'commercialInvoice', name: 'Commercial Invoice', description: 'Final invoice for customs and payment' },
  { type: 'packingList', name: 'Packing List', description: 'Detailed weight and package breakdown' },
  { type: 'billOfLading', name: 'Bill of Lading (B/L)', description: 'Ocean carrier receipt and title document' },
  { type: 'certificateOfOrigin', name: 'Certificate of Origin', description: 'Official declaration of Indian origin' },
  { type: 'phytosanitaryCertificate', name: 'Phytosanitary Certificate', description: 'Plant health and safety declaration' },
  { type: 'fssaiDeclaration', name: 'FSSAI Declaration', description: 'Food safety compliance for spices' },
  { type: 'shippingBill', name: 'Shipping Bill', description: 'Indian customs export declaration' },
  { type: 'gstInvoice', name: 'GST / Tax Invoice', description: 'GST compliant invoice for Indian tax' },
  { type: 'lcUtilization', name: 'L/C Utilization', description: 'Letter of Credit documents checklist' },
  { type: 'qualityCertificate', name: 'Quality Certificate', description: 'Lab analysis and grade report' },
  { type: 'fumigationCertificate', name: 'Fumigation Certificate', description: 'Pest control treatment certificate' },
];

export default function DocumentGenerator({ order, onClose }: DocumentGeneratorProps) {
  const { profile } = useAuth();
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDocument | null>(null);
  const [generating, setGenerating] = useState<DocType | 'all' | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [sendingDoc, setSendingDoc] = useState<GeneratedDocument | null>(null);

  useEffect(() => {
    if (!order.id) return;
    
    const unsubscribe = subscribeToCollection<GeneratedDocument>(
      'generated_documents',
      setGeneratedDocs,
      [{ field: 'orderId', operator: '==', value: order.id }]
    );
    
    return () => unsubscribe();
  }, [order.id]);

  const handleGenerate = async (type: DocType) => {
    if (!profile) return;
    setGenerating(type);
    
    try {
      const htmlContent = generateDocument(type, order);
      const existingDoc = generatedDocs.find(d => d.documentType === type);
      
      if (existingDoc) {
        await updateDocument('generated_documents', existingDoc.id, {
          htmlContent,
          generatedAt: Timestamp.now(),
          generatedBy: profile.displayName
        });
      } else {
        await createDocument('generated_documents', {
          orderId: order.id,
          documentType: type,
          generatedAt: Timestamp.now(),
          generatedBy: profile.displayName,
          htmlContent,
          status: 'finalized',
          organization: profile.organization
        });
      }
      
      // Update order document checklist if needed
      if (order.id) {
        const newChecklist = { ...(order.documentChecklist || {}), [type]: true };
        await updateDocument('orders', order.id, { 
          documentChecklist: newChecklist,
          docsCompleted: Object.values(newChecklist).filter(Boolean).length
        });
      }
    } catch (error) {
      console.error('Error generating document:', error);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = async () => {
    setGenerating('all');
    for (const docType of DOCUMENT_TYPES) {
      await handleGenerate(docType.type);
    }
    setGenerating(null);
  };

  const handlePrint = (html: string) => {
    const printArea = document.getElementById('print-area');
    if (printArea) {
      printArea.innerHTML = html;
      window.print();
    }
  };

  const handleDownload = (html: string, filename: string) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      <div className="flex items-center justify-between p-6 border-b border-zinc-200 bg-white">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Document Generator</h2>
          <p className="text-sm text-zinc-500 font-medium">Order: <span className="text-emerald-600 font-bold">#{order.orderNumber}</span> | {order.commodity}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAll}
            disabled={generating !== null}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {generating === 'all' ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
            Generate All Documents
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Document List */}
        <div className="w-1/2 overflow-y-auto p-6 space-y-4 border-r border-zinc-200">
          <div className="grid grid-cols-1 gap-4">
            {DOCUMENT_TYPES.map((doc) => {
              const generated = generatedDocs.find(d => d.documentType === doc.type);
              const isGenerating = generating === doc.type;

              return (
                <div 
                  key={doc.type}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                    selectedDoc?.documentType === doc.type 
                      ? 'bg-emerald-50 border-emerald-200 shadow-md' 
                      : 'bg-white border-zinc-200 hover:border-emerald-200 hover:shadow-sm'
                  }`}
                  onClick={() => generated && setSelectedDoc(generated)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${generated ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{doc.name}</h4>
                        <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{doc.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {generated ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                              <CheckCircle size={10} /> Generated
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              <Clock size={10} /> Pending
                            </span>
                          )}
                          {generated && (
                            <span className="text-[10px] text-zinc-400 font-medium">
                              • {generated.generatedAt.toDate().toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {generated && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handlePrint(generated.htmlContent); }}
                            className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Print"
                          >
                            <Printer size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDownload(generated.htmlContent, `${order.orderNumber}_${doc.type}`); }}
                            className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleGenerate(doc.type); }}
                        disabled={isGenerating}
                        className={`p-2 rounded-lg transition-all ${
                          isGenerating ? 'bg-zinc-100 text-zinc-400' : 'text-emerald-600 hover:bg-emerald-100'
                        }`}
                        title="Generate / Re-generate"
                      >
                        {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 bg-zinc-100 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedDoc ? (
              <motion.div
                key={selectedDoc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white shadow-2xl rounded-sm min-h-[800px] w-full mx-auto overflow-hidden relative"
              >
                <div className="absolute top-4 right-4 flex gap-2 no-print">
                  <button 
                    onClick={() => setSendingDoc(selectedDoc)}
                    className="p-2 bg-white/80 backdrop-blur-sm border border-zinc-200 rounded-lg text-zinc-600 hover:text-emerald-600 transition-all shadow-sm"
                    title="Send to Buyer"
                  >
                    <Send size={18} />
                  </button>
                  <button 
                    onClick={() => handlePrint(selectedDoc.htmlContent)}
                    className="p-2 bg-white/80 backdrop-blur-sm border border-zinc-200 rounded-lg text-zinc-600 hover:text-emerald-600 transition-all shadow-sm"
                  >
                    <Printer size={18} />
                  </button>
                  <button 
                    onClick={() => handleDownload(selectedDoc.htmlContent, `${order.orderNumber}_${selectedDoc.documentType}`)}
                    className="p-2 bg-white/80 backdrop-blur-sm border border-zinc-200 rounded-lg text-zinc-600 hover:text-emerald-600 transition-all shadow-sm"
                  >
                    <Download size={18} />
                  </button>
                </div>
                <div 
                  className="document-preview"
                  dangerouslySetInnerHTML={{ __html: selectedDoc.htmlContent }} 
                />
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
                <div className="p-6 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                  <Eye size={48} className="text-zinc-200" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest">Select a generated document to preview</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hidden Print Area */}
      <div id="print-area" className="hidden" />

      {sendingDoc && (
        <SendToBuyerDialog
          isOpen={!!sendingDoc}
          onClose={() => setSendingDoc(null)}
          document={sendingDoc}
          order={order}
          onSent={() => setSendingDoc(null)}
        />
      )}
    </div>
  );
}
