import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Zap, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Building2, 
  MapPin, 
  Eye, 
  MousePointer2, 
  Clock, 
  MoreVertical,
  TrendingUp,
  Users,
  Activity,
  ExternalLink,
  Mail,
  Phone,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface VisitorSignal {
  id: string;
  companyName: string;
  location: string;
  countryCode: string;
  pagesViewed: string[];
  duration: string;
  intentScore: number;
  lastActive: string;
  source: 'Direct' | 'Search' | 'LinkedIn' | 'Referral';
  employees?: string;
  industry?: string;
}

export default function Signals() {
  const [signals, setSignals] = useState<VisitorSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSignals = signals.filter(s => 
    s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Live Visitors', value: '--', icon: Eye, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'High Intent', value: '--', icon: Zap, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Companies Identified', value: '--', icon: Building2, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Avg. Intent Score', value: '--%', icon: Activity, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">Buyer Signals</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-lg font-serif italic">Identify anonymous international companies viewing your export catalog.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2">
            <Globe size={18} />
            Tracking Script
          </button>
          <button className="px-8 py-3 bg-[#064e3b] dark:bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] dark:hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-2">
            <Zap size={18} />
            Reveal All Leads
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
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Real-time</span>
            </div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search companies, locations..."
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-zinc-100 dark:divide-zinc-800">
          {filteredSignals.map((signal) => (
            <div key={signal.id} className="p-8 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all group">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl flex items-center justify-center text-zinc-400 shadow-sm">
                      <Building2 size={32} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{signal.companyName}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          signal.intentScore > 80 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                          signal.intentScore > 60 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                          'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          Intent: {signal.intentScore}%
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-sm">
                          <MapPin size={14} />
                          {signal.location}
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-sm">
                          <Users size={14} />
                          {signal.employees} employees
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-sm">
                          <Globe size={14} />
                          {signal.industry}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pages Viewed</p>
                    <div className="flex flex-wrap gap-2">
                      {signal.pagesViewed.map((page, i) => (
                        <span key={i} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold rounded-lg border border-zinc-200 dark:border-zinc-700">
                          {page}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{signal.lastActive}</p>
                    <p className="text-[10px] font-medium text-zinc-400 mt-0.5">Duration: {signal.duration}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/10 flex items-center gap-2">
                      <Zap size={14} />
                      Convert to Lead
                    </button>
                    <button className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
