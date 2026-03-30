import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  MessageSquare, 
  Target, 
  CheckCircle2, 
  Plus, 
  Users, 
  Clock, 
  Search, 
  MoreVertical,
  Paperclip,
  Smile,
  Hash,
  Star,
  Trash2,
  Edit2,
  RefreshCw,
  User,
  Calendar as CalendarIcon
} from 'lucide-react';
import { ChatMessage, DailyObjective, UserProfile, AuditTrail } from '../lib/types.ts';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/db';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay } from 'date-fns';

export default function CollaborationSpace() {
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [objectives, setObjectives] = useState<DailyObjective[]>([]);
  const [presence, setPresence] = useState<UserProfile[]>([]);
  const [activities, setActivities] = useState<AuditTrail[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'objectives'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.organization) return;

    const unsubMessages = subscribeToCollection<ChatMessage>(
      'chat_messages',
      (data) => {
        setMessages(data.sort((a, b) => {
          const t1 = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
          const t2 = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
          return t1 - t2;
        }));
      },
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    const unsubObjectives = subscribeToCollection<DailyObjective>(
      'daily_objectives',
      (data) => setObjectives(data),
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    const unsubPresence = subscribeToCollection<UserProfile>(
      'users',
      (data) => {
        setPresence(data.filter(u => u.organization === profile.organization));
      },
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    const unsubActivities = subscribeToCollection<AuditTrail>(
      'audit_trail',
      (data) => {
        setActivities(data.sort((a, b) => {
          const t1 = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
          const t2 = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
          return t2 - t1;
        }).slice(0, 10));
      },
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    // Update own presence
    if (user) {
      updateDocument('users', user.uid, { lastActive: Timestamp.now() });
    }

    setLoading(false);
    return () => {
      unsubMessages();
      unsubObjectives();
      unsubPresence();
      unsubActivities();
    };
  }, [profile?.organization, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !profile?.organization) return;

    try {
      const messageData: Partial<ChatMessage> = {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: profile.displayName || 'Anonymous',
        timestamp: Timestamp.now(),
        organization: profile.organization
      };

      await createDocument('chat_messages', messageData as ChatMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjective.trim() || !user || !profile?.organization) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const existingObjective = objectives.find(o => o.userId === user.uid && o.date === today);

      if (existingObjective) {
        const updatedObjectives = [...existingObjective.objectives, { text: newObjective.trim(), completed: false }];
        await updateDocument('daily_objectives', existingObjective.id, { objectives: updatedObjectives });
      } else {
        const objectiveData: Partial<DailyObjective> = {
          userId: user.uid,
          userName: profile.displayName || 'Anonymous',
          date: today,
          objectives: [{ text: newObjective.trim(), completed: false }],
          organization: profile.organization
        };
        await createDocument('daily_objectives', objectiveData as DailyObjective);
      }
      setNewObjective('');
    } catch (error) {
      console.error('Error adding objective:', error);
    }
  };

  const toggleObjective = async (objectiveDoc: DailyObjective, index: number) => {
    const updatedObjectives = [...objectiveDoc.objectives];
    updatedObjectives[index].completed = !updatedObjectives[index].completed;
    await updateDocument('daily_objectives', objectiveDoc.id, { objectives: updatedObjectives });
  };

  const deleteObjective = async (objectiveDoc: DailyObjective, index: number) => {
    const updatedObjectives = objectiveDoc.objectives.filter((_, i) => i !== index);
    if (updatedObjectives.length === 0) {
      await deleteDocument('daily_objectives', objectiveDoc.id);
    } else {
      await updateDocument('daily_objectives', objectiveDoc.id, { objectives: updatedObjectives });
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-serif font-bold text-zinc-900 tracking-tight">Collaboration Hub</h1>
          <p className="text-zinc-500 mt-2 text-lg font-serif italic">Real-time coordination for global trade.</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'chat' ? "bg-white text-[#064e3b] shadow-sm" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            <MessageSquare size={18} />
            Team Chat
          </button>
          <button 
            onClick={() => setActiveTab('objectives')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'objectives' ? "bg-white text-[#064e3b] shadow-sm" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            <Target size={18} />
            Daily Objectives
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 overflow-hidden">
        {/* Sidebar / Channels */}
        <div className="hidden lg:flex flex-col gap-6 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm overflow-y-auto">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 px-2">Channels</h3>
            <div className="space-y-1">
              {['general', 'logistics', 'quality-control', 'sales-team'].map(channel => (
                <button 
                  key={channel}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all",
                    channel === 'general' ? "bg-emerald-50 text-[#064e3b]" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                  )}
                >
                  <Hash size={16} className={channel === 'general' ? "text-emerald-500" : "text-zinc-400"} />
                  {channel}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 px-2">Team Presence</h3>
            <div className="space-y-1">
              {presence.map(person => {
                const isOnline = person.lastActive && (Date.now() - (person.lastActive instanceof Timestamp ? person.lastActive.toMillis() : new Date(person.lastActive).getTime()) < 300000);
                return (
                  <div 
                    key={person.uid}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-zinc-500"
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-300"
                    )} />
                    <span className={isOnline ? "text-zinc-900 font-bold" : ""}>{person.displayName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-auto">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 px-2">Recent Activity</h3>
            <div className="space-y-3">
              {activities.map(activity => (
                <div key={activity.id} className="text-[10px] leading-tight text-zinc-500 border-l-2 border-emerald-100 pl-3 py-1">
                  <span className="font-bold text-zinc-900">{activity.userName}</span> {activity.action} {activity.entityType}
                  <p className="text-zinc-400 mt-0.5">{formatDate(activity.timestamp)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 flex flex-col bg-white rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/50 overflow-hidden relative">
          {activeTab === 'chat' ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <Hash size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">#general</h3>
                    <p className="text-xs text-zinc-500">Main coordination channel for the entire team.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-all">
                    <Star size={18} />
                  </button>
                  <button className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-all">
                    <Users size={18} />
                  </button>
                  <button className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-all">
                    <Search size={18} />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12">
                    <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-4">
                      <MessageSquare size={40} />
                    </div>
                    <h4 className="text-lg font-serif font-bold text-zinc-900">No messages yet</h4>
                    <p className="text-sm text-zinc-500 max-w-xs mt-2 italic font-serif">Start the conversation by sending a message to your team.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.uid;
                    const showHeader = idx === 0 || messages[idx-1].senderId !== msg.senderId;
                    
                    return (
                      <div key={msg.id} className={cn(
                        "flex flex-col",
                        isMe ? "items-end" : "items-start",
                        !showHeader && "-mt-4"
                      )}>
                        {showHeader && (
                          <div className={cn(
                            "flex items-center gap-2 mb-1 px-1",
                            isMe ? "flex-row-reverse" : "flex-row"
                          )}>
                            <span className="text-xs font-black text-zinc-900">{msg.senderName}</span>
                            <span className="text-[10px] text-zinc-400">
                              {format(msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date(msg.timestamp), 'HH:mm')}
                            </span>
                          </div>
                        )}
                        <div className={cn(
                          "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                          isMe 
                            ? "bg-[#064e3b] text-white rounded-tr-none" 
                            : "bg-zinc-100 text-zinc-800 rounded-tl-none border border-zinc-200"
                        )}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input */}
              <div className="p-6 bg-zinc-50/50 border-t border-zinc-100">
                <form onSubmit={handleSendMessage} className="relative">
                  <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full pl-6 pr-24 py-4 bg-white border border-zinc-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" className="p-2 text-zinc-400 hover:text-zinc-900 transition-all">
                      <Paperclip size={18} />
                    </button>
                    <button type="button" className="p-2 text-zinc-400 hover:text-zinc-900 transition-all">
                      <Smile size={18} />
                    </button>
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="p-2.5 bg-[#064e3b] text-white rounded-xl hover:bg-[#065f46] transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:shadow-none"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <>
              {/* Objectives Header */}
              <div className="px-6 py-6 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <Target size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-bold text-zinc-900">Team Objectives</h3>
                      <p className="text-sm text-zinc-500 italic font-serif">Track daily goals and progress across the organization.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600">
                    <CalendarIcon size={16} className="text-emerald-600" />
                    {format(new Date(), 'MMMM do, yyyy')}
                  </div>
                </div>

                <form onSubmit={handleAddObjective} className="relative">
                  <input 
                    type="text"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    placeholder="What's your main objective for today?"
                    className="w-full pl-12 pr-6 py-4 bg-white border border-zinc-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-lg font-serif italic"
                  />
                  <Target size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <button 
                    type="submit"
                    disabled={!newObjective.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-[#064e3b] text-white rounded-xl text-xs font-bold hover:bg-[#065f46] transition-all disabled:opacity-50"
                  >
                    Add Goal
                  </button>
                </form>
              </div>

              {/* Objectives List */}
              <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
                {objectives.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-6">
                      <Target size={48} />
                    </div>
                    <h4 className="text-xl font-serif font-bold text-zinc-900">No objectives set for today</h4>
                    <p className="text-zinc-500 max-w-sm mt-2 italic font-serif">Setting daily goals helps the team stay focused and aligned on the trade mission.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {objectives.map((userObj) => (
                      <div key={userObj.id} className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 hover:shadow-lg hover:shadow-zinc-200/50 transition-all group">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 font-bold shadow-sm">
                              {userObj.userName[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-zinc-900">{userObj.userName}</h4>
                              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Daily Progress</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-serif font-bold text-[#064e3b]">
                              {Math.round((userObj.objectives.filter(o => o.completed).length / userObj.objectives.length) * 100)}%
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {userObj.objectives.map((obj, idx) => (
                            <div 
                              key={idx} 
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl transition-all group/item",
                                obj.completed ? "bg-emerald-50/50" : "bg-white border border-zinc-100"
                              )}
                            >
                              <button 
                                onClick={() => user?.uid === userObj.userId && toggleObjective(userObj, idx)}
                                disabled={user?.uid !== userObj.userId}
                                className={cn(
                                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                  obj.completed 
                                    ? "bg-emerald-500 border-emerald-500 text-white" 
                                    : "border-zinc-200 hover:border-emerald-500 text-transparent"
                                )}
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <span className={cn(
                                "flex-1 text-sm font-medium transition-all",
                                obj.completed ? "text-zinc-400 line-through" : "text-zinc-700"
                              )}>
                                {obj.text}
                              </span>
                              {user?.uid === userObj.userId && (
                                <button 
                                  onClick={() => deleteObjective(userObj, idx)}
                                  className="p-1.5 text-zinc-300 hover:text-rose-500 opacity-0 group-item-hover:opacity-100 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
