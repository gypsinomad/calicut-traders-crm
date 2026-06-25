import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
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
  Smile,
  Zap,
  Layout,
  Users,
  ChevronRight,
  RefreshCw,
  Check,
  CheckCheck,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WhatsAppMessage, WhatsAppTemplate } from '../../lib/types';
import { whatsappService } from '../../services/whatsappService';
import { TranslatedText } from '../TranslatedText';

export function WhatsAppManager() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppMessage | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [msgData, templateData] = await Promise.all([
        whatsappService.getMessages(),
        whatsappService.getTemplates()
      ]);
      setMessages(msgData);
      setTemplates(templateData);
      if (msgData.length > 0) setSelectedChat(msgData[0]);
    } catch (error) {
      console.error('Error loading WhatsApp data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Check size={14} className="text-emerald-400/40" />;
      case 'delivered': return <CheckCheck size={14} className="text-emerald-400/40" />;
      case 'read': return <CheckCheck size={14} className="text-emerald-400" />;
      case 'failed': return <AlertCircle size={14} className="text-red-400" />;
      default: return null;
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[700px]">
      {/* Sidebar - Chat List */}
      <div className="col-span-4 flex flex-col bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 space-y-4 bg-black/20">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsBroadcastOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-bold text-xs uppercase tracking-wider"
            >
              <Users size={16} />
              Broadcast
            </button>
            <button 
              onClick={() => setIsTemplateManagerOpen(true)}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 rounded-xl transition-all"
              title="Template Manager"
            >
              <Layout size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/40" size={18} />
            <input
              type="text"
              placeholder="Search chats..."
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
            messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelectedChat(msg)}
                className={`w-full p-4 flex items-start gap-3 transition-all border-b border-white/5 text-left ${
                  selectedChat?.id === msg.id 
                    ? "bg-emerald-600/10 border-l-4 border-l-emerald-500" 
                    : "hover:bg-white/5 border-l-4 border-l-transparent"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                  <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{msg.to}</h4>
                    <span className="text-[10px] text-emerald-400/40 font-medium whitespace-nowrap">
                      {msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {getStatusIcon(msg.status)}
                    <p className="text-xs text-emerald-300/60 line-clamp-1 flex-1">{msg.text}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="col-span-8 flex flex-col bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedChat.to}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-emerald-400/40 font-medium uppercase tracking-wider">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all">
                  <Clock size={18} />
                </button>
                <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-black/10">
              <div className="flex justify-center">
                <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-emerald-300/40 uppercase tracking-widest border border-white/5">
                  Today
                </span>
              </div>

              {/* Received Message (Simulated) */}
              <div className="flex items-start gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                  <User size={16} />
                </div>
                <div className="space-y-1">
                  <div className="p-4 bg-zinc-800/80 rounded-2xl rounded-tl-none border border-white/5 shadow-lg">
                    <p className="text-sm text-emerald-50">Hello, I received the price list for cardamom. Can you provide a quote for 5 tons to Dubai?</p>
                  </div>
                  <span className="text-[10px] text-emerald-400/40 font-medium">10:30 AM</span>
                </div>
              </div>

              {/* Sent Message */}
              <div className="flex flex-col items-end gap-1.5 ml-auto max-w-[80%]">
                <div className="p-4 bg-emerald-600/20 rounded-2xl rounded-tr-none border border-emerald-500/20 shadow-lg">
                  <p className="text-sm text-emerald-50">{selectedChat.text}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-emerald-400/40 font-medium">10:35 AM</span>
                  {getStatusIcon(selectedChat.status)}
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-black/20 border-t border-white/5">
              <div className="flex items-center gap-3 bg-zinc-800/50 border border-white/10 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all shadow-inner">
                <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-xl transition-all">
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none text-sm text-white placeholder-emerald-400/20 focus:outline-none"
                />
                <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-xl transition-all">
                  <Smile size={20} />
                </button>
                <button className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20">
                  <Send size={18} />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3 px-2">
                <span className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest">Templates:</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {templates.slice(0, 3).map((template) => (
                    <button key={template.id} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] font-medium text-emerald-300/60 transition-all whitespace-nowrap">
                      {template.name.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-900/20 flex items-center justify-center text-emerald-400/40 border border-emerald-500/10">
              <MessageSquare size={40} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Chat Selected</h3>
              <p className="text-emerald-400/40 text-sm max-w-xs mx-auto mt-1">Select a WhatsApp conversation to start messaging your buyers and suppliers directly.</p>
            </div>
          </div>
        )}
      </div>

      {/* Template Manager Modal */}
      <AnimatePresence>
        {isTemplateManagerOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">WhatsApp Template Manager</h3>
                <button 
                  onClick={() => setIsTemplateManagerOpen(false)}
                  className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all"
                >
                  <AlertCircle size={18} />
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-emerald-400/40 uppercase tracking-widest">Approved Templates</h4>
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div key={template.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                            {template.category}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                            {template.status}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-white mb-1">{template.name.replace(/_/g, ' ')}</h5>
                        <p className="text-xs text-emerald-300/40 line-clamp-2">
                          {template.components.find(c => c.type === 'BODY')?.text}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/5 transition-all font-bold text-xs uppercase tracking-wider">
                    <Plus size={16} />
                    Create New Template
                  </button>
                </div>
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-900/20 flex items-center justify-center text-emerald-400/40">
                    <Layout size={32} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Template Preview</h4>
                    <p className="text-xs text-emerald-400/40 mt-1">Select a template from the left to see how it will appear to your customers.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Broadcast Modal */}
      <AnimatePresence>
        {isBroadcastOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Bulk WhatsApp Broadcast</h3>
                <button 
                  onClick={() => setIsBroadcastOpen(false)}
                  className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all"
                >
                  <AlertCircle size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest ml-1">Select Segment</label>
                  <select className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all">
                    <option value="all">All UK Buyers</option>
                    <option value="middle_east">All Middle East Contacts</option>
                    <option value="nigeria">Nigeria Importers</option>
                    <option value="leads">New Leads (Last 30 Days)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest ml-1">Select Template</label>
                  <select className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all">
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Broadcast Summary</h4>
                    <p className="text-xs text-emerald-400/60 mt-1">This broadcast will be sent to 45 contacts. Estimated cost: $0.45</p>
                  </div>
                </div>
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-bold text-sm uppercase tracking-wider">
                  <Send size={18} />
                  Launch Broadcast
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
