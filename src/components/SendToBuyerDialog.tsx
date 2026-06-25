import React, { useState } from 'react';
import { Mail, MessageCircle, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { useAuth } from './Auth';
import { createDocument, OperationType, handleFirestoreError } from '../services/db';
import { sendWhatsAppMessage } from '../services/whatsapp';
import { Timestamp } from 'firebase/firestore';

import { Quote, GeneratedDocument, ExportOrder } from '../lib/types';

interface SendToBuyerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quote?: Quote;
  document?: GeneratedDocument;
  order?: ExportOrder;
  onSent?: (via: 'email' | 'whatsapp') => void;
}

export default function SendToBuyerDialog({
  isOpen,
  onClose,
  quote,
  document,
  order,
  onSent
}: SendToBuyerDialogProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp' | 'copy'>('email');
  const [copied, setCopied] = useState(false);

  // Derive data based on what's provided
  const buyerName = quote?.companyName || order?.customerName || '';
  const buyerEmail = quote?.email || ''; // Order doesn't have email, we might need to fetch it or pass it
  const buyerPhone = quote?.whatsappNumber || quote?.phone || order?.customerPhone || '';
  const documentName = quote ? 'Proforma Invoice' : (document?.documentType || 'Document');
  const documentRef = quote?.quoteNumber || (document as any)?.refNo || order?.orderNumber || '';
  const documentId = document?.id || order?.id || '';
  const quoteId = quote?.id || '';
  
  // For now, we'll use a placeholder for HTML content if not directly available
  // In a real app, we'd generate this or fetch it
  const htmlContent = quote ? `<h1>Quote ${quote.quoteNumber}</h1>` : (document?.htmlContent || '');
  const plainTextSummary = quote 
    ? `Quote for ${quote.items[0]?.productName || 'Commodities'}: ${quote.totalAmount} ${quote.currency}`
    : `Document ${documentRef} for ${buyerName}`;

  const [emailSubject, setEmailSubject] = useState(`${documentName} ${documentRef} - Global Trade Connect`);
  const [emailBody, setEmailBody] = useState(`
Hello ${buyerName},

Please find attached our ${documentName} ${documentRef} from Global Trade Connect.

Details:
${plainTextSummary}

Kindly confirm your acceptance at the earliest.

Best regards,
${profile?.displayName || 'Global Trade Connect LLP'}
Global Trade Connect LLP
Kozhikode, Kerala
  `.trim());

  const [whatsappMessage, setWhatsappMessage] = useState(`
Hello ${buyerName},

Please find attached our ${documentName} ${documentRef} from Global Trade Connect.

Details:
${plainTextSummary}

Kindly confirm your acceptance at the earliest.

Best regards,
Global Trade Connect LLP
Kozhikode, Kerala
  `.trim());

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const recordSendHistory = async (via: 'email' | 'whatsapp', to: string, body: string) => {
    if (!profile) return;
    
    try {
      await createDocument('send_history', {
        quoteId: quoteId || null,
        documentId: documentId || null,
        sentTo: to,
        sentVia: via,
        sentAt: Timestamp.now(),
        sentBy: profile.uid,
        messageBody: body,
        organization: profile.organization
      });
      onSent?.(via);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'send_history');
    }
  };

  const openGmail = () => {
    const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(buyerEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(url, '_blank');
    recordSendHistory('email', buyerEmail, emailBody);
  };

  const openMailClient = () => {
    const url = `mailto:${buyerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(url, '_blank');
    recordSendHistory('email', buyerEmail, emailBody);
  };

  const handleWhatsAppSend = () => {
    sendWhatsAppMessage(buyerPhone, whatsappMessage);
    recordSendHistory('whatsapp', buyerPhone, whatsappMessage);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Send to Buyer</h2>
            <p className="text-sm text-zinc-500">{documentName} • {documentRef}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600">
            <Check size={24} />
          </button>
        </div>

        <div className="flex border-b border-zinc-100">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'email' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            <Mail size={18} />
            Email
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'whatsapp' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            <MessageCircle size={18} />
            WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('copy')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'copy' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/30' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            <Copy size={18} />
            Copy Link
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">To</label>
                <input
                  type="email"
                  value={buyerEmail}
                  readOnly
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-zinc-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-zinc-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 flex gap-3">
                <div className="mt-0.5"><Copy size={16} /></div>
                <p>The document HTML will be copied to your clipboard automatically when you click send. You can paste it as an attachment or in the email body.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    handleCopy(htmlContent);
                    openGmail();
                  }}
                  className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <ExternalLink size={20} />
                  Open in Gmail
                </button>
                <button
                  onClick={() => {
                    handleCopy(htmlContent);
                    openMailClient();
                  }}
                  className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Mail size={20} />
                  Open Email Client
                </button>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={buyerPhone}
                  readOnly
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Message Preview</label>
                <textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-zinc-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <QrCode size={20} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">Mobile WhatsApp</p>
                    <p className="text-xs text-zinc-500">Scan to open on your phone</p>
                  </div>
                </div>
                <button className="text-emerald-600 font-bold text-sm hover:underline">Show QR Code</button>
              </div>
              <button
                onClick={handleWhatsAppSend}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <MessageCircle size={20} />
                Send via WhatsApp
              </button>
            </div>
          )}

          {activeTab === 'copy' && (
            <div className="space-y-6">
              <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Copy size={32} className="text-zinc-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">Share via Link</h3>
                <p className="text-sm text-zinc-500 mb-6">Copy the document content to share via any other channel.</p>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleCopy(htmlContent)}
                    className="flex items-center justify-between px-6 py-4 bg-white border border-zinc-200 rounded-2xl hover:border-emerald-500 transition-all group"
                  >
                    <span className="font-bold text-zinc-700">Copy Document HTML</span>
                    {copied ? <Check className="text-emerald-500" size={20} /> : <Copy className="text-zinc-300 group-hover:text-emerald-500" size={20} />}
                  </button>
                  <button
                    onClick={() => handleCopy(plainTextSummary)}
                    className="flex items-center justify-between px-6 py-4 bg-white border border-zinc-200 rounded-2xl hover:border-emerald-500 transition-all group"
                  >
                    <span className="font-bold text-zinc-700">Copy Plain Text Summary</span>
                    {copied ? <Check className="text-emerald-500" size={20} /> : <Copy className="text-zinc-300 group-hover:text-emerald-500" size={20} />}
                  </button>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-zinc-400 font-medium">
                  Paste the HTML content into an email body or save as .html file to share.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
