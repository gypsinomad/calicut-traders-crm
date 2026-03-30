import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Search, 
  Filter, 
  Plus, 
  Send, 
  Inbox, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  User,
  Paperclip,
  Trash2,
  Archive,
  Star,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  FileText,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmailMessage } from '../../lib/types';
import { zohoMailService } from '../../services/zohoMailService';
import { TranslatedText } from '../TranslatedText';
import { Timestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';

export function EmailManager() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });

  const handleSend = async () => {
    if (!composeData.to || !composeData.subject || !composeData.body) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // Simulate sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add to sent folder (mock)
      const sentEmail: EmailMessage = {
        id: Math.random().toString(36).substr(2, 9),
        threadId: Math.random().toString(36).substr(2, 9),
        subject: composeData.subject,
        body: composeData.body,
        to: [composeData.to],
        from: auth.currentUser?.email || 'me@example.com',
        timestamp: Timestamp.now(),
        status: 'sent',
        organization: 'Global Trade Connect LLP'
      };
      
      // Update local state to show it in the list if we were in "Sent" folder
      // For now, we just show a success message and close
      
      alert('Email sent successfully!');
      setIsComposeOpen(false);
      setComposeData({ to: '', subject: '', body: '' });
      loadEmails(); // Reload to show new email if applicable
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const data = await zohoMailService.getEmails();
      setEmails(data);
      if (data.length > 0) setSelectedEmail(data[0]);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[700px]">
      {/* Sidebar - Email Folders & List */}
      <div className="col-span-4 flex flex-col bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 space-y-4 bg-black/20">
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-bold text-sm uppercase tracking-wider"
          >
            <Plus size={18} />
            <TranslatedText>Compose Email</TranslatedText>
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/40" size={18} />
            <input
              type="text"
              placeholder="Search emails..."
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw size={24} className="text-emerald-500 animate-spin" />
            </div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`w-full p-4 flex items-start gap-3 transition-all border-b border-white/5 text-left ${
                  selectedEmail?.id === email.id 
                    ? "bg-emerald-600/10 border-l-4 border-l-emerald-500" 
                    : "hover:bg-white/5 border-l-4 border-l-transparent"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                  <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{email.to[0]}</h4>
                    <span className="text-[10px] text-emerald-400/40 font-medium whitespace-nowrap">
                      {email.timestamp.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-emerald-400 truncate mt-0.5">{email.subject}</p>
                  <p className="text-xs text-emerald-300/60 line-clamp-1 mt-1">{email.body}</p>
                  {email.relatedOrderId && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                        {email.relatedOrderId}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Email View Area */}
      <div className="col-span-8 flex flex-col bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        {selectedEmail ? (
          <>
            {/* Email Header Actions */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all">
                  <Archive size={18} />
                </button>
                <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all">
                  <AlertCircle size={18} />
                </button>
                <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all text-red-400/60 hover:text-red-400">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs font-bold text-emerald-400/40">1 of {emails.length}</span>
                  <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all">
                    <ChevronRight size={18} />
                  </button>
                </div>
                <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Email Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-black/10">
              <div className="space-y-4">
                <h2 className="text-2xl font-serif font-bold text-white leading-tight">{selectedEmail.subject}</h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                      <User size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{selectedEmail.from}</h3>
                        <span className="text-[10px] text-emerald-400/40 font-medium">
                          {selectedEmail.timestamp.toDate().toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-300/40 font-medium">to {selectedEmail.to.join(', ')}</p>
                    </div>
                  </div>
                  <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all">
                    <Star size={18} />
                  </button>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <div className="p-6 bg-zinc-800/40 border border-white/5 rounded-2xl text-emerald-50 leading-relaxed whitespace-pre-wrap text-sm">
                  {selectedEmail.body}
                </div>
              </div>

              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400/40 uppercase tracking-widest flex items-center gap-2">
                    <Paperclip size={14} />
                    Attachments ({selectedEmail.attachments.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedEmail.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all cursor-pointer group">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{file.name}</p>
                          <p className="text-[10px] text-emerald-400/40 font-medium">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex items-center gap-4 pt-8 border-t border-white/5">
                <button className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-bold text-sm uppercase tracking-wider">
                  <Send size={18} />
                  Reply
                </button>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 rounded-xl transition-all font-bold text-sm uppercase tracking-wider">
                  Forward
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-900/20 flex items-center justify-center text-emerald-400/40 border border-emerald-500/10">
              <Mail size={40} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Email Selected</h3>
              <p className="text-emerald-400/40 text-sm max-w-xs mx-auto mt-1">Select an email from your Zoho Mail inbox to view its content and reply.</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">New Message</h3>
                <button 
                  onClick={() => setIsComposeOpen(false)}
                  className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 border-b border-white/5 py-2">
                    <span className="text-xs font-bold text-emerald-400/40 uppercase tracking-widest w-12">To</span>
                    <input 
                      type="text" 
                      className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none" 
                      placeholder="recipient@example.com" 
                      value={composeData.to}
                      onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3 border-b border-white/5 py-2">
                    <span className="text-xs font-bold text-emerald-400/40 uppercase tracking-widest w-12">Subject</span>
                    <input 
                      type="text" 
                      className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none" 
                      placeholder="Enter subject" 
                      value={composeData.subject}
                      onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    />
                  </div>
                </div>
                <textarea 
                  className="w-full h-64 bg-black/20 border border-white/5 rounded-2xl p-4 text-sm text-white placeholder-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none"
                  placeholder="Write your message here..."
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                />
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2.5 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-xl transition-all">
                      <Paperclip size={20} />
                    </button>
                    <button className="p-2.5 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-xl transition-all">
                      <Zap size={20} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsComposeOpen(false)}
                      className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 rounded-xl transition-all font-bold text-sm uppercase tracking-wider"
                    >
                      Save Draft
                    </button>
                    <button 
                      onClick={handleSend}
                      className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-bold text-sm uppercase tracking-wider"
                    >
                      <Send size={18} />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
