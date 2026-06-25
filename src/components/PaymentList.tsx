import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Payment } from '../lib/types';
import { format } from 'date-fns';
import { CreditCard, Banknote, Clock, CheckCircle2, XCircle, Search, Filter, Download, MoreVertical, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { TranslatedText } from './TranslatedText';

export default function PaymentList() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'payments'),
      orderBy('dueDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
      setPayments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsPaid = async (id: string) => {
    try {
      await updateDoc(doc(db, 'payments', id), {
        status: 'completed',
        paidAt: serverTimestamp()
      });
      alert('Payment marked as completed!');
    } catch (error) {
      console.error("Error marking payment as paid:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'failed': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-100';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'bankTransfer': return <Banknote size={16} />;
      case 'creditCard': return <CreditCard size={16} />;
      case 'letterOfCredit': return <CheckCircle2 size={16} />;
      default: return <DollarSign size={16} />;
    }
  };

  const filteredPayments = payments.filter(p => 
    p.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalCompleted = payments
    .filter(p => p.status === 'completed')
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">
            <TranslatedText>Collections & Payments</TranslatedText>
          </h2>
          <p className="text-zinc-500 mt-1">
            <TranslatedText>Track and manage export receivables and transaction history</TranslatedText>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold border border-emerald-100 shadow-sm">
            <ArrowUpRight size={16} />
            <span>{totalCompleted.toLocaleString()} <TranslatedText>Collected</TranslatedText></span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-bold border border-amber-100 shadow-sm">
            <ArrowDownLeft size={16} />
            <span>{totalPending.toLocaleString()} <TranslatedText>Pending</TranslatedText></span>
          </div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search payments..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
          <Filter size={18} />
          <TranslatedText>Filter</TranslatedText>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <TranslatedText>Order ID</TranslatedText>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <TranslatedText>Amount</TranslatedText>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <TranslatedText>Method</TranslatedText>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <TranslatedText>Due Date</TranslatedText>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <TranslatedText>Status</TranslatedText>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">
                  <TranslatedText>Actions</TranslatedText>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Loading payments...</p>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-zinc-400 text-sm">No payment records found</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 text-zinc-600 rounded-lg">
                          <DollarSign size={16} />
                        </div>
                        <p className="text-sm font-bold text-zinc-900">{payment.orderId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-zinc-900">
                        {payment.currency} {payment.amount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-600">
                        {getMethodIcon(payment.method)}
                        <span className="text-xs font-medium capitalize">
                          {payment.method.replace(/([A-Z])/g, ' $1')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Clock size={14} />
                        <span className="text-xs">
                          {payment.dueDate ? format(payment.dueDate.toDate(), 'MMM dd, yyyy') : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {payment.status === 'pending' && (
                          <button 
                            onClick={() => markAsPaid(payment.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Mark as Paid"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                        <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all">
                          <Download size={18} />
                        </button>
                        <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all">
                          <MoreVertical size={18} />
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
    </div>
  );
}
