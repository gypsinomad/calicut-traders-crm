import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  MoreVertical, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  ArrowRight,
  Ship,
  Truck,
  FileWarning,
  Plus,
  Calendar,
  User,
  Sparkles,
  Zap,
  RefreshCw,
  CheckSquare,
  Square,
  ChevronDown,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument, auth } from '../services/db';
import { ShipmentException, ExportOrder } from '../lib/types';
import { useAuth } from './Auth';
import { formatDate } from '../lib/utils';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';

export default function Exceptions() {
  const { profile } = useAuth();
  const [exceptions, setExceptions] = useState<ShipmentException[]>([]);
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'investigating' | 'resolved'>('all');
  const [selectedException, setSelectedException] = useState<ShipmentException | null>(null);
  const [suggestingResolution, setSuggestingResolution] = useState<string | null>(null);
  const [selectedExceptionIds, setSelectedExceptionIds] = useState<string[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [newException, setNewException] = useState<Partial<ShipmentException>>({
    type: 'delay',
    severity: 'medium',
    status: 'open',
  });

  useEffect(() => {
    if (!profile?.organization) return;

    const unsubExceptions = subscribeToCollection<ShipmentException>(
      'shipment_exceptions',
      (data) => {
        setExceptions(data.sort((a, b) => (b.reportedAt?.toMillis?.() || 0) - (a.reportedAt?.toMillis?.() || 0)));
        setLoading(false);
      },
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    const unsubOrders = subscribeToCollection<ExportOrder>(
      'orders',
      (data) => setOrders(data),
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    return () => {
      unsubExceptions();
      unsubOrders();
    };
  }, [profile]);

  const stats = {
    openCount: exceptions.filter(e => e.status === 'open').length,
    criticalCount: exceptions.filter(e => e.severity === 'critical' && e.status !== 'resolved').length,
    resolvedToday: exceptions.filter(e => e.status === 'resolved' && e.resolvedAt?.toDate?.() && e.resolvedAt.toMillis() > Date.now() - 24 * 60 * 60 * 1000).length
  };

  const filteredExceptions = exceptions.filter(e => {
    const matchesSearch = e.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization) return;

    try {
      await createDocument('shipment_exceptions', {
        ...newException,
        organization: profile.organization,
        reportedAt: Timestamp.now(),
        reportedBy: auth.currentUser?.uid || 'unknown',
        status: 'open',
      });
      setShowReportModal(false);
      setNewException({
        type: 'delay',
        severity: 'medium',
        status: 'open',
      });
      alert('Issue reported successfully!');
    } catch (error) {
      console.error("Error reporting issue:", error);
    }
  };

  const suggestResolution = async (exception: ShipmentException) => {
    setSuggestingResolution(exception.id);

    if (!isAIAvailable()) {
      // Rule-based fallback for resolution suggestion
      const suggestion = {
        steps: [
          "Contact the local shipping agent for an immediate status update.",
          "Notify the customer about the potential delay and provide a revised ETA.",
          "Prepare alternative documentation if customs clearance is the bottleneck.",
          "Check for insurance coverage if damage is reported."
        ],
        estimatedTime: "24-48 hours",
        priority: (exception.severity === 'critical' ? 'high' : 'medium') as "high" | "medium" | "low",
        summary: `Standard resolution protocol for ${exception.type} exception. Focus on communication and documentation verification.`,
        lastGenerated: serverTimestamp() as any
      };

      await updateDocument('shipment_exceptions', exception.id, { resolutionAI: suggestion });
      if (selectedException?.id === exception.id) {
        setSelectedException({ ...selectedException, resolutionAI: suggestion });
      }
      setSuggestingResolution(null);
      return;
    }

    try {
      const model = 'gemini-3-flash-preview';
      const prompt = `Suggest a resolution for this shipment exception:
      Type: ${exception.type}
      Severity: ${exception.severity}
      Description: ${exception.description}
      Order ID: ${exception.orderId}
      
      Provide a professional resolution plan for an export/logistics company.
      Return a JSON object with: steps (array of strings), estimatedTime (string), and priority ('low', 'medium', 'high'), and summary (max 50 words).`;

      const response = await generateAIContent('Resolution Suggestion', {
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const suggestion = JSON.parse(response.text || '{}');
      await updateDocument('shipment_exceptions', exception.id, { resolutionAI: suggestion });
      if (selectedException?.id === exception.id) {
        setSelectedException({ ...selectedException, resolutionAI: suggestion });
      }
    } catch (error: any) {
      alert(handleAIError(error));
    } finally {
      setSuggestingResolution(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedExceptionIds.length} exceptions?`)) return;
    try {
      await Promise.all(selectedExceptionIds.map(id => deleteDocument('shipment_exceptions', id)));
      setSelectedExceptionIds([]);
    } catch (error) {
      console.error("Error in bulk delete:", error);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Type', 'Severity', 'Status', 'Description', 'Reported By', 'Date'];
    const csvContent = [
      headers.join(','),
      ...exceptions.map(e => [
        e.orderId,
        e.type,
        e.severity,
        e.status,
        `"${e.description.replace(/"/g, '""')}"`,
        e.reportedBy,
        e.reportedAt?.toDate?.() ? formatDate(e.reportedAt) : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `exceptions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityColor = (severity: ShipmentException['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  const getStatusColor = (status: ShipmentException['status']) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'investigating': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'open': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">Exception Management</h2>
          <p className="text-zinc-500 mt-1">Track and resolve shipment delays, damages, and compliance issues</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button 
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-lg shadow-zinc-900/20"
          >
            <AlertTriangle size={16} />
            Report Issue
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertCircle size={20} />
            </div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Open Issues</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{stats.openCount}</p>
          <p className="text-sm text-zinc-500 mt-1">Awaiting initial investigation</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <AlertTriangle size={20} />
            </div>
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Critical</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{stats.criticalCount}</p>
          <p className="text-sm text-zinc-500 mt-1">High-impact active exceptions</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{stats.resolvedToday}</p>
          <p className="text-sm text-zinc-500 mt-1">Issues closed in last 24h</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search by Order ID or Description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {selectedExceptionIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-rose-100 transition-all flex items-center gap-2"
              >
                <Plus size={14} className="rotate-45" />
                Delete ({selectedExceptionIds.length})
              </button>
            )}
            {(['all', 'open', 'investigating', 'resolved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-900/10'
                    : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50">
                <th className="w-12 px-6 py-4">
                  <input 
                    type="checkbox" 
                    checked={selectedExceptionIds.length === filteredExceptions.length && filteredExceptions.length > 0}
                    onChange={() => {
                      if (selectedExceptionIds.length === filteredExceptions.length) setSelectedExceptionIds([]);
                      else setSelectedExceptionIds(filteredExceptions.map(e => e.id));
                    }}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Issue / Order</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Reported By</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredExceptions.map((exception) => (
                <tr 
                  key={exception.id} 
                  className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedException(exception)}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedExceptionIds.includes(exception.id)}
                      onChange={() => {
                        setSelectedExceptionIds(prev => 
                          prev.includes(exception.id) ? prev.filter(i => i !== exception.id) : [...prev, exception.id]
                        );
                      }}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getSeverityColor(exception.severity)} group-hover:bg-white transition-colors`}>
                        <FileWarning size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 line-clamp-1">{exception.description}</p>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tight">
                          Order: {exception.orderId} · {exception.type.replace(/([A-Z])/g, ' $1')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getSeverityColor(exception.severity)}`}>
                      {exception.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(exception.status)}`}>
                      {exception.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-zinc-400" />
                      <span className="text-xs text-zinc-600">{exception.reportedBy}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-zinc-400" />
                      <span className="text-xs text-zinc-600">{exception.reportedAt?.toDate?.() ? formatDate(exception.reportedAt) : 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          suggestResolution(exception);
                        }}
                        disabled={suggestingResolution === exception.id}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                        title={isAIAvailable() ? "AI Resolution Suggestion" : "Smart Resolution Suggestion"}
                      >
                        {suggestingResolution === exception.id ? <RefreshCw size={16} className="animate-spin" /> : (isAIAvailable() ? <Sparkles size={16} /> : <Zap size={16} />)}
                      </button>
                      <button className="p-2 hover:bg-white rounded-lg text-zinc-400 hover:text-zinc-900 transition-all">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExceptions.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-zinc-50 rounded-full text-zinc-300">
                        <AlertTriangle size={32} />
                      </div>
                      <p className="text-zinc-500 font-medium">No exceptions found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exception Detail Modal */}
      <AnimatePresence>
        {selectedException && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedException(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${getSeverityColor(selectedException.severity)}`}>
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">Exception Details</h3>
                      <p className="text-sm text-zinc-500">Case #{selectedException.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedException(null)}
                    className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 transition-colors"
                  >
                    <Plus size={20} className="rotate-45" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Description</p>
                        <p className="text-sm text-zinc-900 leading-relaxed">{selectedException.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Type</p>
                          <span className="text-xs font-bold text-zinc-900 capitalize">{selectedException.type}</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Severity</p>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getSeverityColor(selectedException.severity)}`}>
                            {selectedException.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Order ID</span>
                        <span className="text-xs font-bold text-zinc-900">{selectedException.orderId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Reported By</span>
                        <span className="text-xs font-bold text-zinc-900">{selectedException.reportedBy}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Reported At</span>
                        <span className="text-xs font-bold text-zinc-900">{selectedException.reportedAt?.toDate?.() ? formatDate(selectedException.reportedAt) : 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Status</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(selectedException.status)}`}>
                          {selectedException.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedException.resolutionAI && (
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {isAIAvailable() ? <Sparkles size={18} className="text-emerald-600" /> : <Zap size={18} className="text-emerald-600" />}
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">{isAIAvailable() ? 'AI Resolution Plan' : 'Smart Resolution Plan'}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full uppercase">
                          {selectedException.resolutionAI.priority} Priority
                        </span>
                      </div>
                      <p className="text-sm text-emerald-800 mb-4 font-medium leading-relaxed">{selectedException.resolutionAI.summary}</p>
                      <div className="space-y-3">
                        {selectedException.resolutionAI.steps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-emerald-600 border border-emerald-200 shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <p className="text-xs text-emerald-700 leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-emerald-200/50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Estimated Time</span>
                        <span className="text-xs font-bold text-emerald-900">{selectedException.resolutionAI.estimatedTime}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <MessageSquare size={16} />
                      Resolution Log
                    </h4>
                    <div className="space-y-3">
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-zinc-900">System Note</span>
                          <span className="text-[10px] text-zinc-400">{selectedException.reportedAt?.toDate?.() ? formatDate(selectedException.reportedAt) : 'N/A'}</span>
                        </div>
                        <p className="text-xs text-zinc-600">Exception reported and flagged for investigation.</p>
                      </div>
                      {selectedException.status === 'resolved' && (
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-emerald-900">Resolution Confirmed</span>
                            <span className="text-[10px] text-emerald-400">{selectedException.resolvedAt?.toDate?.() ? formatDate(selectedException.resolvedAt) : 'N/A'}</span>
                          </div>
                          <p className="text-xs text-emerald-700">Issue has been resolved and shipment is back on track.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-all">
                      Add Comment
                    </button>
                    {selectedException.status !== 'resolved' && (
                      <button 
                        onClick={() => updateDocument('shipment_exceptions', selectedException.id, { status: 'resolved', resolvedAt: Timestamp.now() })}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                      >
                        Mark as Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleReportIssue} className="p-8">
                <h3 className="text-xl font-bold text-zinc-900 mb-6">Report Shipment Issue</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Order ID</label>
                    <select
                      value={newException.orderId}
                      onChange={(e) => setNewException({ ...newException, orderId: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                      required
                    >
                      <option value="">Select Order</option>
                      {orders.map(order => (
                        <option key={order.id} value={order.orderNumber}>{order.orderNumber} - {order.customerName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Type</label>
                      <select
                        value={newException.type}
                        onChange={(e) => setNewException({ ...newException, type: e.target.value as any })}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                      >
                        <option value="delay">Delay</option>
                        <option value="damage">Damage</option>
                        <option value="documentation">Documentation</option>
                        <option value="customs">Customs</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Severity</label>
                      <select
                        value={newException.severity}
                        onChange={(e) => setNewException({ ...newException, severity: e.target.value as any })}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Description</label>
                    <textarea
                      value={newException.description}
                      onChange={(e) => setNewException({ ...newException, description: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none min-h-[100px]"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
                  >
                    Report Issue
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
