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
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { subscribeToCollection } from '../services/db';
import { AuditLog } from '../lib/types';
import { useAuth } from './Auth';
import { formatDate } from '../lib/utils';

export default function AuditTrail() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEntity, setFilterEntity] = useState('all');

  useEffect(() => {
    if (!profile?.organization) return;

    const unsub = subscribeToCollection<AuditLog>(
      'audit_logs',
      (data) => {
        setLogs(data.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()));
        setLoading(false);
      },
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    return () => unsub();
  }, [profile]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.entityId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = filterEntity === 'all' || log.entityType === filterEntity;
    return matchesSearch && matchesEntity;
  });

  const getActionColor = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('create')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (a.includes('update')) return 'text-blue-600 bg-blue-50 border-blue-100';
    if (a.includes('delete')) return 'text-rose-600 bg-rose-50 border-rose-100';
    return 'text-zinc-600 bg-zinc-50 border-zinc-100';
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">System Audit Trail</h2>
          <p className="text-zinc-500 mt-1">Comprehensive log of all user activities and system changes</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-2">
            <Download size={16} />
            Export Audit Log
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search by User, Action, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {(['all', 'order', 'lead', 'payment', 'document', 'supplier'] as const).map((entity) => (
              <button
                key={entity}
                onClick={() => setFilterEntity(entity)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${
                  filterEntity === entity
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-900/10'
                    : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                }`}
              >
                {entity}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Entity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">IP Address</th>
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
                        {log.userEmail[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-zinc-900">{log.userEmail}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Database size={14} className="text-zinc-400" />
                      <span className="text-xs text-zinc-600 capitalize">{log.entityType}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">#{log.entityId.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-600 max-w-xs truncate">
                      {log.oldValue && log.newValue ? (
                        <>
                          <span className="text-rose-500 line-through truncate max-w-[80px]">{JSON.stringify(log.oldValue)}</span>
                          <ArrowRight size={12} className="text-zinc-300 flex-shrink-0" />
                          <span className="text-emerald-600 truncate max-w-[80px]">{JSON.stringify(log.newValue)}</span>
                        </>
                      ) : (
                        <span className="italic text-zinc-400">No value changes recorded</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[10px] font-mono text-zinc-400">{log.ipAddress || '0.0.0.0'}</span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-zinc-50 rounded-full text-zinc-300">
                        <Shield size={32} />
                      </div>
                      <p className="text-zinc-500 font-medium">No audit logs found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal size={16} className="text-emerald-400" />
              Live Security Stream
            </h3>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="space-y-3 font-mono text-[10px]">
            {logs.slice(0, 5).map((log, i) => (
              <div key={i} className="flex gap-3 text-zinc-400 border-l border-zinc-800 pl-3 py-1">
                <span className="text-zinc-600">[{new Date(log.timestamp.toMillis()).toLocaleTimeString()}]</span>
                <span className="text-emerald-400">{log.action.toUpperCase()}</span>
                <span className="text-zinc-300">{log.entityType}</span>
                <span className="text-zinc-500 truncate">{log.userEmail}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            Audit Insights
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-blue-600">
                  <RefreshCw size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-900">Update Frequency</p>
                  <p className="text-[10px] text-blue-700">System activity is up 12% this week</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-900">+12%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-amber-600">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">Sensitive Actions</p>
                  <p className="text-[10px] text-amber-700">3 deletions recorded in last 24h</p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-900">3</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
