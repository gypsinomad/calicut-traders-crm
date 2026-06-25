import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Info, AlertTriangle, Trash2, CheckCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseReadOnly, auth } from '../firebase';
import { useAuth } from './Auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'user_approval_request';
  timestamp: any;
  read: boolean;
  userId: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  organization: string;
}

const getTimestamp = (timestamp: any) => {
  if (!timestamp) return new Date();
  if (timestamp.toDate) {
    try {
      return timestamp.toDate();
    } catch (e) {
      return new Date();
    }
  }
  return new Date(timestamp);
};

export default function NotificationCenter() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!profile) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (isFirebaseReadOnly || !auth?.currentUser) {
      setNotifications([
        {
          id: 'notif-1',
          title: 'New Lead Assigned',
          message: 'Ahmed Hassan from Gulf Oasis Trading LLC has been registered and assigned to your portfolio.',
          type: 'info',
          timestamp: new Date(Date.now() - 3600000),
          read: false,
          userId: profile.uid,
          organization: 'Calicut Traders'
        },
        {
          id: 'notif-2',
          title: 'Urgent: Low Stock Warning',
          message: 'Green Cardamom (8mm Bold) is below reorder level (1,200 kg remaining). Restocking advised.',
          type: 'warning',
          timestamp: new Date(Date.now() - 7200000),
          read: false,
          userId: profile.uid,
          organization: 'Calicut Traders'
        }
      ]);
      setLoading(false);
      return;
    }

    // Simplify query to avoid index issues
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Notification snapshot size:", snapshot.size);
      let newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      console.log("Total notifications for user:", newNotifications.length);

      // Sort in memory
      newNotifications.sort((a, b) => {
        const dateA = getTimestamp(a.timestamp).getTime();
        const dateB = getTimestamp(b.timestamp).getTime();
        return dateB - dateA;
      });

      setNotifications(newNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      if (error.message.includes('permission') && retry < 3) {
        setTimeout(() => setRetry(prev => prev + 1), 2000);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, retry]);

  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Grouping logic
  const groupNotifications = (notifs: Notification[]) => {
    const groups: Record<string, Notification & { count: number; ids: string[] }> = {};
    
    notifs.forEach(n => {
      // Create a unique key for grouping: title + message + relatedEntityId
      const key = `${n.title}_${n.message}_${n.relatedEntityId || ''}`;
      
      if (!groups[key]) {
        groups[key] = { ...n, count: 1, ids: [n.id] };
      } else {
        groups[key].count += 1;
        groups[key].ids.push(n.id);
        // Keep the most recent timestamp
        const currentTs = getTimestamp(n.timestamp);
        const existingTs = getTimestamp(groups[key].timestamp);
        if (currentTs > existingTs) {
          groups[key].timestamp = n.timestamp;
        }
        // If any in group is unread, mark group as unread
        if (!n.read) {
          groups[key].read = false;
        }
      }
    });

    return Object.values(groups).sort((a, b) => {
      return getTimestamp(b.timestamp).getTime() - getTimestamp(a.timestamp).getTime();
    });
  };

  const filteredNotifications = activeTab === 'unread' 
    ? groupNotifications(notifications.filter(n => !n.read))
    : groupNotifications(notifications);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      try {
        // Mark all notifications in the group as read
        const batch = writeBatch(db);
        notification.ids.forEach((id: string) => {
          batch.update(doc(db, 'notifications', id), { read: true });
        });
        await batch.commit();
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }

    if (notification.relatedEntityType === 'user') {
      navigate('/users');
      setIsOpen(false);
    } else if (notification.relatedEntityType === 'order') {
      navigate('/orders');
      setIsOpen(false);
    } else if (notification.relatedEntityType === 'lead') {
      navigate('/leads');
      setIsOpen(false);
    }
  };

  const markAsRead = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.update(doc(db, 'notifications', id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    setMarkingAll(true);
    try {
      // Handle batch limit of 500
      const chunks = [];
      for (let i = 0; i < unread.length; i += 500) {
        chunks.push(unread.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(n => {
          batch.update(doc(db, 'notifications', n.id), { read: true });
        });
        await batch.commit();
      }
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;
    
    setClearingAll(true);
    try {
      // Handle batch limit of 500
      const chunks = [];
      for (let i = 0; i < notifications.length; i += 500) {
        chunks.push(notifications.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(n => {
          batch.delete(doc(db, 'notifications', n.id));
        });
        await batch.commit();
      }

      toast.success('All notifications cleared');
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error('Failed to clear notifications');
    } finally {
      setClearingAll(false);
    }
  };

  const removeNotification = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'notifications', id));
      });
      await batch.commit();
    } catch (error) {
      console.error("Error removing notification:", error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed md:absolute top-20 md:top-auto right-4 md:right-0 w-[calc(100vw-32px)] md:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 overflow-hidden flex flex-col max-h-[80vh] md:max-h-none"
            >
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button 
                        onClick={clearAll}
                        disabled={clearingAll}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Clear all"
                      >
                        {clearingAll ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 rounded-lg transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        activeTab === 'all' 
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' 
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setActiveTab('unread')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        activeTab === 'unread' 
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' 
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                    >
                      Unread
                    </button>
                  </div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      disabled={markingAll}
                      className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-bold transition-colors disabled:opacity-50"
                    >
                      {markingAll ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCheck size={14} />
                      )}
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                {loading ? (
                  <div className="p-12 text-center">
                    <Loader2 size={24} className="text-emerald-600 animate-spin mx-auto mb-2" />
                    <p className="text-zinc-400 text-xs font-medium">Fetching updates...</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Bell size={24} className="text-zinc-300" />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900">All caught up!</h4>
                    <p className="text-zinc-400 text-xs mt-1">
                      {activeTab === 'unread' ? "No unread notifications" : "No notifications yet"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <AnimatePresence initial={false}>
                      {filteredNotifications.slice(0, 50).map(notification => (
                        <motion.div 
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all relative group cursor-pointer ${!notification.read ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}
                        >
                          {!notification.read && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                          )}
                          <div className="flex gap-3">
                            <div className={`mt-1 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors border ${
                              notification.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' :
                              notification.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800' :
                              notification.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800' :
                              'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800'
                            }`}>
                              {notification.type === 'success' ? <Check size={16} /> :
                               notification.type === 'warning' ? <AlertTriangle size={16} /> :
                               notification.type === 'error' ? <X size={16} /> :
                               <Info size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-bold truncate ${notification.read ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                    {notification.title}
                                    {notification.count > 1 && (
                                      <span className="ml-2 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] rounded-md">
                                        x{notification.count}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(notification.ids);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                                  {formatDistanceToNow(getTimestamp(notification.timestamp), { addSuffix: true })}
                                </p>
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.ids);
                                    }}
                                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 text-center bg-zinc-50/50 dark:bg-zinc-900/50">
                <button 
                  onClick={() => {
                    navigate('/communications');
                    setIsOpen(false);
                  }}
                  className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  View all activity
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
