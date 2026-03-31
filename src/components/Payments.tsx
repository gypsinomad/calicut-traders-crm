import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Calendar,
  CreditCard,
  Building2,
  Sparkles,
  Zap,
  AlertTriangle,
  RefreshCw,
  CheckSquare,
  Square,
  ChevronDown,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/db';
import { Payment, ExportOrder } from '../lib/types';
import { useAuth } from './Auth';
import { formatCurrency, formatDate } from '../lib/utils';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';
import { Skeleton } from './ui/Skeleton';

export default function Payments() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({
    amount: 0,
    currency: 'USD',
    status: 'pending',
    method: 'bankTransfer',
    dueDate: Timestamp.now(),
  });
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [assessingRisk, setAssessingRisk] = useState<string | null>(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);

  const handleExportReport = () => {
    const headers = ['Order ID', 'Amount', 'Currency', 'Status', 'Method', 'Due Date', 'Paid Date'];
    const csvContent = [
      headers.join(','),
      ...payments.map(p => [
        p.orderId,
        p.amount,
        p.currency,
        p.status,
        p.method,
        p.dueDate?.toDate?.() ? formatDate(p.dueDate) : 'N/A',
        p.paidAt?.toDate?.() ? formatDate(p.paidAt) : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization) return;

    try {
      await createDocument('payments', {
        ...newPayment,
        organization: profile.organization,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      setShowAddModal(false);
      setNewPayment({
        amount: 0,
        currency: 'USD',
        status: 'pending',
        method: 'bankTransfer',
        dueDate: Timestamp.now(),
      });
      alert('Payment recorded successfully!');
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  };

  const assessPaymentRisk = async (payment: Payment) => {
    setAssessingRisk(payment.id);

    if (!isAIAvailable()) {
      // Rule-based fallback for payment risk assessment
      const riskLevel = (payment.method === 'letterOfCredit' ? 'low' : payment.amount > 50000 ? 'medium' : 'low') as "high" | "medium" | "low";
      const score = riskLevel === 'medium' ? 45 : 15;
      const keyRisks = [
        "Standard verification for export payment",
        "Bank transfer processing time",
        "Documentation compliance check"
      ];
      const recommendation = `Standard payment risk assessment for ${payment.method}. Transaction appears within normal parameters.`;

      const risk = { riskLevel, score, keyRisks, recommendation, lastAnalyzed: serverTimestamp() as any };
      await updateDocument('payments', payment.id, { riskAI: risk });
      if (selectedPayment?.id === payment.id) {
        setSelectedPayment({ ...selectedPayment, riskAI: risk });
      }
      setAssessingRisk(null);
      return;
    }

    try {
      const model = 'gemini-3-flash-preview';
      const prompt = `Assess payment risk for this transaction:
      Order ID: ${payment.orderId}
      Amount: ${payment.amount} ${payment.currency}
      Method: ${payment.method}
      Due Date: ${payment.dueDate?.toDate?.() ? formatDate(payment.dueDate) : 'N/A'}
      
      Consider typical export payment risks (e.g., Letter of Credit discrepancies, bank transfer delays from specific regions).
      Return a JSON object with: riskLevel ('low', 'medium', 'high'), score (0-100), and keyRisks (array of strings), and recommendation (max 50 words).`;

      const response = await generateAIContent('Payment Risk Analysis', {
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const risk = JSON.parse(response.text || '{}');
      await updateDocument('payments', payment.id, { riskAI: risk });
      if (selectedPayment?.id === payment.id) {
        setSelectedPayment({ ...selectedPayment, riskAI: risk });
      }
    } catch (error: any) {
      alert(handleAIError(error));
    } finally {
      setAssessingRisk(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedPaymentIds.length} payments?`)) return;
    try {
      await Promise.all(selectedPaymentIds.map(id => deleteDocument('payments', id)));
      setSelectedPaymentIds([]);
    } catch (error) {
      console.error("Error in bulk delete:", error);
    }
  };

  useEffect(() => {
    if (!profile?.organization) return;

    const filter = [{ field: 'organization', operator: '==', value: profile.organization }];

    const unsubPayments = subscribeToCollection<Payment>(
      'payments',
      (data) => {
        setPayments(data.sort((a, b) => (b.dueDate?.toMillis?.() || 0) - (a.dueDate?.toMillis?.() || 0)));
        setLoading(false);
      },
      filter
    );

    const unsubOrders = subscribeToCollection<ExportOrder>(
      'orders',
      (data) => setOrders(data),
      filter
    );

    return () => {
      unsubPayments();
      unsubOrders();
    };
  }, [profile]);

  const stats = {
    totalOutstanding: payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0),
    receivedThisMonth: payments
      .filter(p => p.status === 'completed' && p.paidAt?.toDate?.() && p.paidAt.toMillis() > Date.now() - 30 * 24 * 60 * 60 * 1000)
      .reduce((sum, p) => sum + p.amount, 0),
    overdueCount: payments
      .filter(p => p.status === 'pending' && p.dueDate?.toDate?.() && p.dueDate.toMillis() < Date.now())
      .length
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.transactionId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'failed': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Collections & Payments</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage invoices, track receivables, and monitor cash flow</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportReport}
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export Report
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Record Payment
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-500">
              <Clock size={20} />
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(stats.totalOutstanding)}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Total receivables pending</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-500">
              <ArrowDownLeft size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">Received</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(stats.receivedThisMonth)}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Collected in last 30 days</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-500">
              <AlertCircle size={20} />
            </div>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-500 uppercase tracking-wider">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.overdueCount}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Invoices past due date</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search by Order ID or Transaction..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {selectedPaymentIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all flex items-center gap-2"
              >
                <Plus size={14} className="rotate-45" />
                Delete ({selectedPaymentIds.length})
              </button>
            )}
            {(['all', 'pending', 'completed', 'failed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/10'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
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
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/50">
                <th className="w-12 px-6 py-4">
                  <input 
                    type="checkbox" 
                    checked={selectedPaymentIds.length === filteredPayments.length && filteredPayments.length > 0}
                    onChange={() => {
                      if (selectedPaymentIds.length === filteredPayments.length) setSelectedPaymentIds([]);
                      else setSelectedPaymentIds(filteredPayments.map(p => p.id));
                    }}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Order / Invoice</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Method</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider hidden md:table-cell">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-4 rounded" /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-md" /></td>
                    <td className="px-6 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-full text-zinc-300 dark:text-zinc-600">
                        <Inbox size={48} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-zinc-900 dark:text-white font-serif italic text-xl">No payments found</p>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Start by recording your first collection.</p>
                      </div>
                      <button 
                        onClick={() => setShowAddModal(true)}
                        className="mt-2 px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
                      >
                        Record Payment
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr 
                    key={payment.id} 
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedPayment(payment)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedPaymentIds.includes(payment.id)}
                        onChange={() => {
                          setSelectedPaymentIds(prev => 
                            prev.includes(payment.id) ? prev.filter(i => i !== payment.id) : [...prev, payment.id]
                          );
                        }}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 group-hover:bg-white dark:group-hover:bg-zinc-700 transition-colors hidden xs:block">
                          <DollarSign size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900 dark:text-white">{payment.orderId}</p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-tight">
                            TXN: {payment.transactionId || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium uppercase">{payment.currency}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <CreditCard size={14} className="text-zinc-400 dark:text-zinc-500" />
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 capitalize">{payment.method.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-zinc-400 dark:text-zinc-500" />
                        <span className={`text-xs ${
                          payment.status === 'pending' && payment.dueDate?.toDate?.() && payment.dueDate.toMillis() < Date.now()
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}>
                          {payment.dueDate?.toDate?.() ? formatDate(payment.dueDate) : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            assessPaymentRisk(payment);
                          }}
                          disabled={assessingRisk === payment.id}
                          className="p-2 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50"
                          title={isAIAvailable() ? "Assess Risk with AI" : "Assess Risk with Smart Rules"}
                        >
                          {assessingRisk === payment.id ? <RefreshCw size={16} className="animate-spin" /> : (isAIAvailable() ? <Sparkles size={16} /> : <Zap size={16} />)}
                        </button>
                        <button className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleRecordPayment} className="p-8">
                <h3 className="text-xl font-bold text-zinc-900 mb-6">Record New Payment</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Order ID</label>
                    <select
                      value={newPayment.orderId}
                      onChange={(e) => setNewPayment({ ...newPayment, orderId: e.target.value })}
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
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Amount</label>
                      <input
                        type="number"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Currency</label>
                      <select
                        value={newPayment.currency}
                        onChange={(e) => setNewPayment({ ...newPayment, currency: e.target.value })}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="AED">AED</option>
                        <option value="INR">INR</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Payment Method</label>
                    <select
                      value={newPayment.method}
                      onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value as any })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                    >
                      <option value="bankTransfer">Bank Transfer</option>
                      <option value="creditCard">Credit Card</option>
                      <option value="letterOfCredit">Letter of Credit</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Due Date</label>
                    <input
                      type="date"
                      onChange={(e) => setNewPayment({ ...newPayment, dueDate: Timestamp.fromDate(new Date(e.target.value)) })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Received Date (Optional)</label>
                    <input
                      type="date"
                      onChange={(e) => setNewPayment({ ...newPayment, paidAt: Timestamp.fromDate(new Date(e.target.value)), status: 'completed' })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900/5 outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Detail Modal */}
      <AnimatePresence>
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPayment(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${getStatusColor(selectedPayment.status)}`}>
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">Payment Details</h3>
                      <p className="text-sm text-zinc-500">{selectedPayment.orderId}</p>
                      <p className="text-xs text-zinc-500 mt-1">Due: {selectedPayment.dueDate?.toDate?.() ? formatDate(selectedPayment.dueDate) : 'N/A'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPayment(null)}
                    className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 transition-colors"
                  >
                    <Plus size={20} className="rotate-45" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Amount</p>
                      <p className="text-lg font-bold text-zinc-900">{formatCurrency(selectedPayment.amount)}</p>
                      <p className="text-xs text-zinc-500">{selectedPayment.currency}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Status</p>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(selectedPayment.status)}`}>
                        {selectedPayment.status}
                      </span>
                      <p className="text-xs text-zinc-500 mt-1">Due: {selectedPayment.dueDate?.toDate?.() ? formatDate(selectedPayment.dueDate) : 'N/A'}</p>
                    </div>
                  </div>

                  {selectedPayment.riskAI && (
                    <div className={`p-4 rounded-2xl border ${
                      selectedPayment.riskAI.riskLevel === 'high' ? 'bg-rose-50 border-rose-100' :
                      selectedPayment.riskAI.riskLevel === 'medium' ? 'bg-amber-50 border-amber-100' :
                      'bg-emerald-50 border-emerald-100'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isAIAvailable() ? <Sparkles size={16} className={
                            selectedPayment.riskAI.riskLevel === 'high' ? 'text-rose-600' :
                            selectedPayment.riskAI.riskLevel === 'medium' ? 'text-amber-600' :
                            'text-emerald-600'
                          } /> : <Zap size={16} className={
                            selectedPayment.riskAI.riskLevel === 'high' ? 'text-rose-600' :
                            selectedPayment.riskAI.riskLevel === 'medium' ? 'text-amber-600' :
                            'text-emerald-600'
                          } />}
                          <span className="text-xs font-bold uppercase tracking-wider">{isAIAvailable() ? 'AI Risk Assessment' : 'Smart Risk Assessment'}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          selectedPayment.riskAI.riskLevel === 'high' ? 'bg-rose-100 text-rose-700' :
                          selectedPayment.riskAI.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {selectedPayment.riskAI.riskLevel} Risk ({selectedPayment.riskAI.score}/100)
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 mb-3 leading-relaxed">{selectedPayment.riskAI.recommendation}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPayment.riskAI.keyRisks.map((risk, idx) => (
                          <span key={idx} className="px-2 py-1 bg-white/50 rounded-md text-[10px] font-medium text-zinc-500 border border-zinc-200/50">
                            • {risk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-zinc-100">
                      <span className="text-sm text-zinc-500">Payment Method</span>
                      <span className="text-sm font-bold text-zinc-900 capitalize">{selectedPayment.method}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-zinc-100">
                      <span className="text-sm text-zinc-500">Transaction ID</span>
                      <span className="text-sm font-mono font-medium text-zinc-900">{selectedPayment.transactionId || 'Pending'}</span>
                    </div>
                    {selectedPayment.paidAt?.toDate?.() && (
                      <div className="flex items-center justify-between py-3 border-b border-zinc-100">
                        <span className="text-sm text-zinc-500">Paid Date</span>
                        <span className="text-sm font-bold text-zinc-900">{formatDate(selectedPayment.paidAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button className="flex-1 px-4 py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20">
                      Download Receipt
                    </button>
                    {selectedPayment.status === 'pending' && (
                      <button 
                        onClick={() => updateDocument('payments', selectedPayment.id, { status: 'completed', paidAt: Timestamp.now() })}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                      >
                        Mark as Paid
                      </button>
                    )}
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
