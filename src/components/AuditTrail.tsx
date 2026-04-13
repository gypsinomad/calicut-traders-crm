import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  Download, 
  User, 
  Clock, 
  Database, 
  Shield, 
  ArrowRight,
  RefreshCw,
  Calendar,
  Terminal,
  Info,
  AlertCircle,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToCollection, restoreDocument } from '../services/db';
import { useAuth } from './Auth';
import { formatDate } from '../lib/utils';
import { toast } from 'sonner';

interface SystemLog {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  collection: string;
  documentId: string;
  userId: string;
  userEmail: string;
  timestamp: any;
  data?: any;
  changes?: any;
}

interface TrashItem {
  id: string;
  originalId: string;
  originalCollection: string;
  data: any;
  deletedAt: any;
  deletedBy: string;
  deletedByUserEmail: string;
}

export default function AuditTrail() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOp, setFilterOp] = useState('all');
  const [activeTab, setActiveTab] = useState<'logs' | 'trash'>('logs');
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    const unsubLogs = subscribeToCollection<SystemLog>(
      'systemLogs',
      (data) => {
        setLogs(data.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis()));
        setLoading(false);
      }
    );

    const unsubTrash = subscribeToCollection<TrashItem>(
      'trash',
      (data) => {
        setTrash(data.sort((a, b) => b.deletedAt?.toMillis() - a.deletedAt?.toMillis()));
      }
    );

    return () => {
      unsubLogs();
      unsubTrash();
    };
  }, []);

  const handleRestore = async (trashId: string) => {
    setRestoring(trashId);
    try {
      await restoreDocument(trashId);
      toast.success('Document restored successfully');
    } catch (error) {
      toast.error('Failed to restore document');
    } finally {
      setRestoring(null);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.operation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.documentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOp = filterOp === 'all' || log.operation === filterOp;
    return matchesSearch && matchesOp;
  });

  const getOpColor = (op: string) => {
    switch (op) {
      case 'CREATE': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'UPDATE': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'DELETE': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'RESTORE': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-zinc-600 bg-zinc-50 border-zinc-100';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">System Audit & Recovery</h2>
          <p className="text-zinc-500 mt-1">Monitor activities and restore deleted data</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'logs' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'trash' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Trash2 size={16} />
            Trash Bin
            {trash.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {trash.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder={activeTab === 'logs' ? "Search logs..." : "Search trash..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
            />
          </div>
          {activeTab === 'logs' && (
            <div className="flex items-center gap-2">
              {(['all', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE'] as const).map((op) => (
                <button
                  key={op}
                  onClick={() => setFilterOp(op)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    filterOp === op
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-900/10'
                      : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'logs' ? (
              <motion.table 
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full text-left border-collapse"
              >
                <thead>
                  <tr className="bg-zinc-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Operation</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Collection</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Document ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-600">
                          <Clock size={14} className="text-zinc-400" />
                          {formatDate(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                            {log.userEmail[0]?.toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-zinc-900">{log.userEmail}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getOpColor(log.operation)}`}>
                          {log.operation}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Database size={14} className="text-zinc-400" />
                          <span className="text-xs text-zinc-600 capitalize">{log.collection}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-zinc-400 font-mono">#{log.documentId}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </motion.table>
            ) : (
              <motion.table 
                key="trash"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full text-left border-collapse"
              >
                <thead>
                  <tr className="bg-zinc-50/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Deleted At</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Deleted By</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Collection</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Original ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {trash.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-600">
                          <Clock size={14} className="text-zinc-400" />
                          {formatDate(item.deletedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-zinc-900">{item.deletedByUserEmail}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-zinc-600 capitalize">{item.originalCollection}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-zinc-400 font-mono">#{item.originalId}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRestore(item.id)}
                          disabled={restoring === item.id}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center gap-2 ml-auto disabled:opacity-50"
                        >
                          {restoring === item.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <RotateCcw size={12} />
                          )}
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                  {trash.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-zinc-50 rounded-full text-zinc-300">
                            <Trash2 size={32} />
                          </div>
                          <p className="text-zinc-500 font-medium">Trash bin is empty</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </motion.table>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal size={16} className="text-emerald-400" />
              Live System Stream
            </h3>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="space-y-3 font-mono text-[10px]">
            {logs.slice(0, 5).map((log, i) => (
              <div key={i} className="flex gap-3 text-zinc-400 border-l border-zinc-800 pl-3 py-1">
                <span className="text-zinc-600">[{new Date(log.timestamp?.toMillis()).toLocaleTimeString()}]</span>
                <span className={log.operation === 'DELETE' ? 'text-rose-400' : 'text-emerald-400'}>
                  {log.operation}
                </span>
                <span className="text-zinc-300">{log.collection}</span>
                <span className="text-zinc-500 truncate">{log.userEmail}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            Security Insights
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-blue-600">
                  <Activity size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-900">Total Operations</p>
                  <p className="text-[10px] text-blue-700">{logs.length} events recorded</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-rose-50 rounded-xl border border-rose-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-rose-600">
                  <Trash2 size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-900">Trash Bin</p>
                  <p className="text-[10px] text-rose-700">{trash.length} items awaiting restoration</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
