import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Search, 
  Filter, 
  Mail, 
  MessageSquare, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Twitter,
  MoreVertical,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Send,
  Paperclip,
  Smile,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UnifiedMessage } from '../../lib/types';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../Auth';
import { TranslatedText } from '../TranslatedText';
import { agentService } from '../../services/agentService';

export function UnifiedInbox() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<UnifiedMessage | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'pending' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization) return;

    const q = query(
      collection(db, 'messages'),
      where('organization', '==', profile.organization),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as UnifiedMessage[];
      
      setMessages(msgs);
      setLoading(false);

      // Trigger AI Agent for unanalyzed messages
      msgs.forEach(msg => {
        if (!msg.aiInsights && msg.status === 'unread') {
          agentService.runCommunicationAgent(msg);
        }
      });
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.organization]);

  const handleSelectMessage = async (message: UnifiedMessage) => {
    setSelectedMessage(message);
    if (message.status === 'unread') {
      try {
        await updateDoc(doc(db, 'messages', message.id), {
          status: 'read'
        });
        setSelectedMessage({ ...message, status: 'read' });
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    }
  };

  const filteredMessages = messages.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (searchQuery && !m.sender.name.toLowerCase().includes(searchQuery.toLowerCase()) && !m.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail size={14} className="text-blue-400" />;
      case 'whatsapp': return <MessageSquare size={14} className="text-emerald-400" />;
      case 'facebook': return <Facebook size={14} className="text-blue-600" />;
      case 'instagram': return <Instagram size={14} className="text-pink-500" />;
      case 'linkedin': return <Linkedin size={14} className="text-blue-700" />;
      case 'twitter': return <Twitter size={14} className="text-sky-400" />;
      default: return <Inbox size={14} />;
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[700px]">
      {/* Sidebar - Message List */}
      <div className="col-span-4 flex flex-col bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/40" size={18} />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {['all', 'unread', 'pending', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  filter === f 
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" 
                    : "text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 border border-transparent"
                }`}
              >
                <TranslatedText>{f}</TranslatedText>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredMessages.map((message) => (
            <button
              key={message.id}
              onClick={() => handleSelectMessage(message)}
              className={`w-full p-4 flex items-start gap-3 transition-all border-b border-white/5 text-left ${
                selectedMessage?.id === message.id 
                  ? "bg-emerald-600/10 border-l-4 border-l-emerald-500" 
                  : "hover:bg-white/5 border-l-4 border-l-transparent"
              }`}
            >
              <div className="relative">
                {message.sender.avatar ? (
                  <img src={message.sender.avatar} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                    <User size={20} />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 p-1 bg-zinc-900 rounded-full border border-white/10">
                  {getChannelIcon(message.channel)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white truncate">{message.sender.name}</h4>
                  <span className="text-[10px] text-emerald-400/40 font-medium whitespace-nowrap">
                    {message.timestamp instanceof Timestamp ? message.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
                <p className="text-xs text-emerald-300/60 line-clamp-2 mt-1">{message.content}</p>
                {message.status === 'unread' && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">New</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="col-span-8 flex flex-col bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        {selectedMessage ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {selectedMessage.sender.avatar ? (
                    <img src={selectedMessage.sender.avatar} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                      <User size={20} />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 p-1 bg-zinc-900 rounded-full border border-white/10">
                    {getChannelIcon(selectedMessage.channel)}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedMessage.sender.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-emerald-400/40 font-medium uppercase tracking-wider">
                      {selectedMessage.channel}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-emerald-400/20" />
                    <span className="text-[10px] text-emerald-400/40 font-medium uppercase tracking-wider">
                      {selectedMessage.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all">
                  <Clock size={18} />
                </button>
                <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all">
                  <CheckCircle2 size={18} />
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

              {/* Received Message */}
              <div className="flex items-start gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                  <User size={16} />
                </div>
                <div className="space-y-1">
                  <div className="p-4 bg-zinc-800/80 rounded-2xl rounded-tl-none border border-white/5 shadow-lg">
                    <p className="text-sm text-emerald-50">{selectedMessage.content}</p>
                  </div>
                  <span className="text-[10px] text-emerald-400/40 font-medium">
                    {selectedMessage.timestamp instanceof Timestamp ? selectedMessage.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              </div>

              {/* Related Entity Card */}
              {selectedMessage.relatedEntityId && (
                <div className="flex justify-center">
                  <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-2xl p-4 max-w-sm flex items-center gap-4 shadow-xl">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Zap size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Linked {selectedMessage.relatedEntityType}</h4>
                      <p className="text-sm text-emerald-400 font-medium">{selectedMessage.relatedEntityId}</p>
                    </div>
                    <button className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-black/20 border-t border-white/5">
              <div className="flex items-center gap-3 bg-zinc-800/50 border border-white/10 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all shadow-inner">
                <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-xl transition-all">
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  placeholder="Type your reply..."
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
                <span className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest">Quick Replies:</span>
                <div className="flex items-center gap-2">
                  {['Expected next week', 'Processing now', 'Payment received'].map((reply) => (
                    <button key={reply} className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] font-medium text-emerald-300/60 transition-all">
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-900/20 flex items-center justify-center text-emerald-400/40 border border-emerald-500/10">
              <Inbox size={40} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Message Selected</h3>
              <p className="text-emerald-400/40 text-sm max-w-xs mx-auto mt-1">Select a conversation from the list to start communicating with your buyers and suppliers.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
