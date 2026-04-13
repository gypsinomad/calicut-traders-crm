import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  CreditCard, 
  Building2, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  MoreVertical,
  PieChart,
  Activity,
  ShieldCheck,
  Globe,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './Auth.tsx';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  date: any;
  description: string;
  reference: string;
}

export default function FinanceOS() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!profile?.organization) return;

    const q = query(
      collection(db, 'transactions'),
      where('organization', '==', profile.organization),
      orderBy('date', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTransactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(newTransactions);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.organization]);

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)), change: '+12.5%', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Total Expenses', value: formatCurrency(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)), change: '-4.2%', icon: TrendingDown, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
    { label: 'Pending Payments', value: formatCurrency(transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0)), change: '+2.1%', icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Net Profit', value: formatCurrency(transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)), change: '+18.4%', icon: Activity, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">Finance OS</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-lg font-serif italic">Modern finance for international trade, payments, and compliance.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2">
            <Download size={18} />
            Financial Reports
          </button>
          <button className="px-8 py-3 bg-[#064e3b] dark:bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] dark:hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-2">
            <Plus size={18} />
            Add Transaction
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Recent Transactions</h3>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none dark:text-white text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-800/50">
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date & Ref</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Description</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center">
                      <Loader2 className="animate-spin text-emerald-600 mx-auto" size={24} />
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-zinc-500 dark:text-zinc-400">No transactions recorded.</td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all group">
                      <td className="px-8 py-4">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{formatDate(t.date)}</p>
                        <p className="text-[10px] font-medium text-zinc-400 mt-0.5">{t.reference}</p>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                            {t.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.description}</p>
                            <p className="text-[10px] font-medium text-zinc-400">{t.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <p className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </p>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-zinc-900 dark:bg-zinc-800 p-8 rounded-[2.5rem] text-white shadow-xl shadow-zinc-900/20">
            <div className="flex items-center justify-between mb-8">
              <CreditCard size={32} className="text-emerald-400" />
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-emerald-500" />
                <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-amber-500" />
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Corporate Card Balance</p>
            <h3 className="text-3xl font-serif font-bold mb-8 tracking-tight">$42,500.00</h3>
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>**** **** **** 4289</span>
              <span>12/28</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">Compliance Checklist</h3>
            <div className="space-y-4">
              {[
                { label: 'GST Filings (Q1)', status: 'completed', icon: CheckCircle2 },
                { label: 'Export License Renewal', status: 'pending', icon: Clock },
                { label: 'FSSAI Certification', status: 'completed', icon: CheckCircle2 },
                { label: 'Customs Audit (Annual)', status: 'warning', icon: AlertCircle },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className={
                      item.status === 'completed' ? 'text-emerald-500' :
                      item.status === 'warning' ? 'text-rose-500' :
                      'text-amber-500'
                    } />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{item.label}</span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
