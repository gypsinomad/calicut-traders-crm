import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Ship, 
  CheckSquare, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Globe,
  FileText,
  RefreshCw,
  Package,
  Truck,
  PieChart,
  AlertTriangle,
  Sparkles,
  Calendar,
  Zap,
  ChevronRight,
  Plus,
  DollarSign,
  Lightbulb
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer as ReResponsiveContainer
} from 'recharts';
import { subscribeToCollection } from '../services/db';
import { ExportOrder, Company, Task, InventoryItem, MarketPrice, Supplier, Lead, Quote, Payment, UserProfile } from '../lib/types.ts';
import { Link } from 'react-router-dom';
import { handleAIError, generateAIContent, isAIAvailable, ThinkingLevel } from '../lib/ai';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './Auth.tsx';
import { UserRole } from '../lib/types.ts';
import { cn, formatCurrency } from '../lib/utils.ts';
import { Skeleton } from './ui/Skeleton';

interface BriefingData {
  insights: string[];
  motivationalQuote: string;
}

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800 shadow-sm hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-500 group relative overflow-hidden">
    <div className="relative z-10 flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2">{title}</p>
        <h3 className="text-2xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-white group-hover:text-[#064e3b] dark:group-hover:text-emerald-400 transition-colors tracking-tight">{value}</h3>
        <div className="flex items-center gap-2 mt-4">
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider",
            trend === 'up' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800'
          )}>
            {trend === 'up' ? (
              <ArrowUpRight size={12} strokeWidth={3} />
            ) : (
              <ArrowDownRight size={12} strokeWidth={3} />
            )}
            {change}
          </div>
          <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest ml-1">vs last month</span>
        </div>
      </div>
      <div className="p-4 bg-[#fcfaf7] dark:bg-zinc-800 rounded-2xl group-hover:bg-[#064e3b] dark:group-hover:bg-emerald-600 group-hover:text-white transition-all duration-700 shadow-inner group-hover:shadow-emerald-900/20 group-hover:-translate-y-1">
        <Icon size={28} className="transition-colors" />
      </div>
    </div>
    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-700" />
  </div>
);

export default function Dashboard() {
  const { profile } = useAuth();
  const userRole = profile?.role || 'staff';
  
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  useEffect(() => {
    if (!profile?.organization) return;

    const filter = [{ field: 'organization', operator: '==', value: profile.organization }];

    const unsubOrders = subscribeToCollection<ExportOrder>('orders', (data) => {
      setOrders(data);
    }, filter);

    const unsubCompanies = subscribeToCollection<Company>('companies', (data) => {
      setCompanies(data);
    }, filter);

    const unsubLeads = subscribeToCollection<Lead>('leads', (data) => {
      setLeads(data);
    }, filter);

    const unsubTasks = subscribeToCollection<Task>('tasks', (data) => {
      setTasks(data);
    }, filter);

    const unsubInventory = subscribeToCollection<InventoryItem>('inventory', (data) => {
      setInventory(data);
    }, filter);

    const unsubMarket = subscribeToCollection<MarketPrice>('market_prices', (data) => {
      setMarketPrices(data);
    }, filter);

    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', (data) => {
      setSuppliers(data);
    }, filter);

    const unsubQuotes = subscribeToCollection<Quote>('quotes', (data) => {
      setQuotes(data);
    }, filter);

    const unsubNotifications = subscribeToCollection<any>('notifications', (data) => {
      setNotifications(data);
    }, [
      { field: 'userId', operator: '==', value: profile.uid },
      { field: 'organization', operator: '==', value: profile.organization }
    ]);

    let unsubPendingUsers = () => {};
    if (profile.role === 'admin') {
      unsubPendingUsers = subscribeToCollection<any>('users', (data) => {
        setPendingUsers(data.filter(u => u.status === 'pending'));
      }, filter);
    }

    setLoading(false);

    return () => {
      unsubOrders();
      unsubCompanies();
      unsubLeads();
      unsubTasks();
      unsubInventory();
      unsubMarket();
      unsubSuppliers();
      unsubQuotes();
      unsubNotifications();
      unsubPendingUsers();
    };
  }, [profile]);

  const generateBriefing = async () => {
    if (!profile) return;
    setLoadingBriefing(true);
    
    if (!isAIAvailable()) {
      setBriefing('Welcome back. Your business metrics are updated and ready for review.');
      setLoadingBriefing(false);
      return;
    }

    try {
      const model = 'gemini-3.1-pro-preview';
      const prompt = `Generate a concise daily business briefing for an export manager.
      Context:
      - Active Leads: ${activeLeads}
      - Active Orders: ${activeOrders}
      - Pending Tasks: ${pendingTasks}
      - Low Stock Items: ${lowStockItems.length}
      - Expired Batches: ${expiredItems.length}
      - Total Revenue: $${totalRevenue}
      
      Provide 3 actionable bullet points and a motivational closing sentence. Keep it under 100 words.
      Format the bullet points with "•" and ensure the closing sentence is on a new line.`;

      const response = await generateAIContent('Daily Briefing', {
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      setBriefing(response.text || 'Welcome back. Your business metrics are updated and ready for review.');
    } catch (error: any) {
      const errorMessage = handleAIError(error);
      
      if (errorMessage.toLowerCase().includes('quota') || 
          errorMessage.toLowerCase().includes('spending') ||
          errorMessage.toLowerCase().includes('429')) {
        generateBriefing();
        return;
      }
      
      setBriefing('Welcome back. Your business metrics are updated and ready for review.');
    } finally {
      setLoadingBriefing(false);
    }
  };

  useEffect(() => {
    if (!loading && !briefing) {
      generateBriefing();
    }
  }, [loading]);

  const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const handleDownloadReport = () => {
    const csvContent = [
      ['Dashboard Report', formatDate(new Date())],
      ['Metric', 'Value'],
      ['Total Revenue', totalRevenue],
      ['Active Leads', activeLeads],
      ['Active Orders', activeOrders],
      ['Pending Tasks', pendingTasks],
      ['Low Stock Items', lowStockItems.length],
      ['Expired Items', expiredItems.length]
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dashboard_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date.seconds * 1000);
    return d.toLocaleDateString();
  };
  const activeLeads = leads.filter(l => l.status !== 'converted' && l.status !== 'lost').length;
  const activeOrders = orders.filter(o => o.stage !== 'draft' && o.stage !== 'cancelled').length;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;
  const pendingQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'draft').length;
  const pendingQuotesValue = quotes
    .filter(q => q.status === 'sent' || q.status === 'draft')
    .reduce((sum, q) => sum + (q.totalAmount || 0), 0);
  
  const lowStockItems = inventory.filter(item => item.quantity <= item.reorderLevel);
  const expiredItems = inventory.filter(item => item.expiryDate && new Date(item.expiryDate.seconds * 1000) < new Date());

  const outstandingPayments = orders
    .filter(o => o.stage !== 'paymentReceived' && o.stage !== 'cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || o.totalValue || 0), 0);

  const complianceRate = orders.length > 0 
    ? (orders.reduce((acc, o) => {
        const total = o.docsTotal || 5;
        const completed = o.docsCompleted || (o.documents?.length || 0);
        return acc + Math.min(completed / total, 1);
      }, 0) / orders.length) * 100 
    : 0;

  const expiringCerts = orders.reduce((acc, o) => {
    const expiring = o.certificates?.filter(c => {
      if (!c.expiryDate) return false;
      const days = (new Date(c.expiryDate.seconds * 1000).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      return days > 0 && days <= 30;
    }).length || 0;
    return acc + expiring;
  }, 0);

  // Real chart data based on orders
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1); // Avoid month rollover issues on 30th/31st
    d.setMonth(d.getMonth() - i);
    return {
      month: d.toLocaleString('default', { month: 'short' }),
      year: d.getFullYear()
    };
  }).reverse();

  const chartData = last6Months.map(({ month, year }) => {
    const monthlyOrders = orders.filter(o => {
      const d = new Date(o.createdAt.seconds * 1000);
      return d.toLocaleString('default', { month: 'short' }) === month && d.getFullYear() === year;
    });
    return {
      name: month,
      revenue: monthlyOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      leads: leads.filter(l => {
        const d = new Date(l.createdAt.seconds * 1000);
        return d.toLocaleString('default', { month: 'short' }) === month && d.getFullYear() === year;
      }).length
    };
  });

  const revenueByMarket = orders.reduce((acc: any[], order) => {
    const existing = acc.find(item => item.name === order.destinationCountry);
    if (existing) {
      existing.value += (order.totalAmount || 0);
    } else {
      acc.push({ name: order.destinationCountry, value: (order.totalAmount || 0) });
    }
    return acc;
  }, []);

  const COLORS = ['#064e3b', '#059669', '#10b981', '#34d399', '#6ee7b7'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-[#064e3b]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">Executive Overview</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-base md:text-lg font-serif italic">Welcome back, {profile?.displayName || 'User'} — Here is your business at a glance.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          {(userRole === 'admin' || userRole === 'manager') && (
            <button 
              onClick={handleDownloadReport}
              className="px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <FileText size={18} />
              Export Report
            </button>
          )}
          <Link 
            to="/orders"
            className="px-8 py-3 bg-[#064e3b] dark:bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] dark:hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            New Export Order
          </Link>
        </div>
      </header>

      {profile?.role === 'admin' && pendingUsers.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center shrink-0 shadow-inner">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold text-amber-900">{pendingUsers.length} Users Pending Approval</h3>
              <p className="text-amber-700/80 font-medium">New team members are waiting for your verification to access the platform.</p>
            </div>
          </div>
          <Link 
            to="/users"
            className="px-8 py-4 bg-amber-600 text-white rounded-2xl font-bold text-sm hover:bg-amber-700 transition-all shadow-lg hover:shadow-amber-900/20 whitespace-nowrap flex items-center gap-2"
          >
            Review Applications
            <ChevronRight size={18} />
          </Link>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-8">
        {(userRole === 'admin' || userRole === 'manager') && (
          <StatCard 
            title="Outstanding Payments" 
            value={`$${outstandingPayments.toLocaleString()}`} 
            change="--" 
            icon={DollarSign} 
            trend="up" 
          />
        )}
        <div className="group relative">
          <StatCard 
            title="Compliance Rate" 
            value={`${Math.round(complianceRate)}%`} 
            change="--" 
            icon={FileText} 
            trend="up" 
          />
          <div className="absolute top-full left-0 mt-2 w-64 p-4 bg-zinc-900 text-white text-[10px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-2xl border border-white/10">
            <p className="font-black uppercase tracking-widest mb-2 text-emerald-400">Compliance Breakdown</p>
            <ul className="space-y-1.5 opacity-80">
              <li className="flex justify-between"><span>Docs Submitted</span> <span className="font-bold">85%</span></li>
              <li className="flex justify-between"><span>Certificates Valid</span> <span className="font-bold">92%</span></li>
              <li className="flex justify-between"><span>Regulations Met</span> <span className="font-bold">100%</span></li>
              <li className="flex justify-between"><span>Customs Clearance</span> <span className="font-bold">78%</span></li>
            </ul>
          </div>
        </div>
        <StatCard 
          title="Active Orders" 
          value={activeOrders.toString()} 
          change="--" 
          icon={Ship} 
          trend="up" 
        />
        <StatCard 
          title="Expiring Certificates" 
          value={expiringCerts.toString()} 
          change="--" 
          icon={AlertTriangle} 
          trend="up" 
        />
        <StatCard 
          title="Active Leads" 
          value={activeLeads.toString()} 
          change={`Conv: ${leads.length > 0 ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100) : 0}%`} 
          icon={Users} 
          trend="up" 
        />
        <StatCard 
          title="Pending Quotes" 
          value={pendingQuotes.toString()} 
          change={`$${pendingQuotesValue.toLocaleString()}`} 
          icon={Zap} 
          trend="up" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#064e3b] dark:bg-zinc-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-emerald-900/30">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                  <Sparkles size={20} className="text-emerald-300" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300/80">
                  {isAIAvailable() ? 'Executive Intelligence' : 'Smart Insights'}
                </span>
              </div>
              <button 
                onClick={generateBriefing}
                disabled={loadingBriefing}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all disabled:opacity-50 border border-white/5"
              >
                <RefreshCw size={18} className={loadingBriefing ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {loadingBriefing ? (
              <div className="space-y-4 md:space-y-6 animate-pulse">
                <div className="h-5 bg-white/10 rounded-full w-3/4" />
                <div className="h-5 bg-white/10 rounded-full w-1/2" />
                <div className="h-5 bg-white/10 rounded-full w-2/3" />
              </div>
            ) : (
              <div className="max-w-3xl">
                <div className="text-xl md:text-3xl font-serif font-medium leading-relaxed text-emerald-50 space-y-4">
                  {briefing ? (
                    briefing.split('\n').filter(line => line.trim()).map((line, i) => (
                      <p key={i} className={line.startsWith('•') ? 'pl-6 -indent-6 text-base md:text-2xl' : 'mt-4 md:mt-6 italic text-emerald-200/80 text-lg md:text-xl'}>
                        {line}
                      </p>
                    ))
                  ) : (
                    <p className="text-lg md:text-2xl">Welcome to your dashboard. Your daily business intelligence is being prepared.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 md:gap-4 mt-8 md:mt-12">
              <Link to="/market" className="px-5 md:px-6 py-2.5 md:py-3 bg-white text-[#064e3b] rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-lg">
                <Globe size={16} />
                Market Trends
              </Link>
              <Link to="/inventory" className="px-5 md:px-6 py-2.5 md:py-3 bg-emerald-800/50 text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-emerald-800 transition-all border border-white/10 flex items-center gap-2 backdrop-blur-sm">
                <Package size={16} />
                Inventory
              </Link>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-emerald-500/10 rounded-full blur-[80px] md:blur-[100px] -mr-32 md:-mr-48 -mt-32 md:-mt-48" />
          <div className="absolute bottom-0 right-0 p-6 md:p-12 opacity-5">
            <Ship size={100} className="md:w-[200px] md:h-[200px]" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800 shadow-sm flex flex-col relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-6 md:mb-10 flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Zap size={16} className="text-[#d97706]" />
              </div>
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-4 md:gap-6 flex-1">
              {[
                { label: 'New Order', icon: Ship, path: '/orders', color: 'bg-emerald-50 text-[#064e3b] border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
                { label: 'Add Lead', icon: Users, path: '/leads', color: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
                { label: 'Scan Stock', icon: Package, path: '/scanner', color: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
                { label: 'Upload Doc', icon: FileText, path: '/documents', color: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' },
              ].map((action, i) => (
                <Link 
                  key={i} 
                  to={action.path}
                  className="flex flex-col items-center justify-center gap-3 md:gap-4 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-[#fcfaf7] dark:hover:bg-zinc-800/50 transition-all group shadow-sm hover:shadow-xl hover:shadow-emerald-900/5"
                >
                  <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${action.color} border group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-md`}>
                    <action.icon size={20} className="md:w-6 md:h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-[#064e3b] dark:group-hover:text-emerald-400 transition-colors">{action.label}</span>
                </Link>
              ))}
            </div>
            <Link to="/settings" className="mt-6 md:mt-10 flex items-center justify-center gap-3 py-4 md:py-5 bg-[#fcfaf7] dark:bg-zinc-800/50 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[#064e3b] dark:hover:text-emerald-400 transition-all border border-zinc-100 dark:border-zinc-800">
              System Settings <ChevronRight size={16} />
            </Link>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        </div>
      </div>
      {(userRole === 'admin' || userRole === 'manager') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-200/50 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Revenue Growth</h3>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#064e3b]" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">USD</span>
              </div>
            </div>
            <div className="w-full h-[350px]">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#064e3b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#064e3b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#a1a1aa', fontSize: 10, fontWeight: 900}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#a1a1aa', fontSize: 10, fontWeight: 900}} 
                    tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
                  />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #f4f4f5', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                    itemStyle={{fontSize: '12px', fontWeight: 'bold', color: '#064e3b'}}
                    labelStyle={{fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', marginBottom: '8px'}}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#064e3b" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-200/50 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Lead Generation</h3>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Inquiries</span>
              </div>
            </div>
            <div className="w-full h-[350px]">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#a1a1aa', fontSize: 10, fontWeight: 900}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#a1a1aa', fontSize: 10, fontWeight: 900}} 
                  />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #f4f4f5', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                    itemStyle={{fontSize: '12px', fontWeight: 'bold', color: '#d97706'}}
                    labelStyle={{fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', marginBottom: '8px'}}
                  />
                  <Bar dataKey="leads" fill="#d97706" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-zinc-200/50 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Recent Activity Feed</h3>
            <Link to="/orders" className="text-[10px] font-black text-[#064e3b] uppercase tracking-widest hover:underline">View All</Link>
          </div>
          <div className="space-y-8">
            {orders.slice(0, 3).map((order, i) => (
              <div key={`order-${i}`} className="flex items-start gap-6 p-6 rounded-[2rem] hover:bg-[#fcfaf7] transition-all border border-transparent hover:border-zinc-100 group">
                <div className="p-4 rounded-2xl bg-emerald-50 text-[#064e3b] group-hover:bg-[#064e3b] group-hover:text-white transition-all duration-500 shadow-inner">
                  <Ship size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-serif font-bold text-zinc-900 group-hover:text-[#064e3b] transition-colors">New Order: #{order.orderNumber}</p>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{formatDate(order.createdAt)}</span>
                  </div>
                  <p className="text-sm text-zinc-500 mt-2 font-serif italic">{order.customerName} placed an order for {order.quantity}{order.unit} of {order.commodity}.</p>
                  <div className="flex items-center gap-4 mt-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      order.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-zinc-50 text-zinc-600 border-zinc-100'
                    )}>
                      {order.status}
                    </span>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Globe size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{order.destinationCountry}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {leads.slice(0, 2).map((lead, i) => (
              <div key={`lead-${i}`} className="flex items-start gap-6 p-6 rounded-[2rem] hover:bg-[#fcfaf7] transition-all border border-transparent hover:border-zinc-100 group">
                <div className="p-4 rounded-2xl bg-blue-50 text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition-all duration-500 shadow-inner">
                  <Users size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-serif font-bold text-zinc-900 group-hover:text-blue-700 transition-colors">New Inquiry: {lead.fullName}</p>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{formatDate(lead.createdAt)}</span>
                  </div>
                  <p className="text-sm text-zinc-500 mt-2 font-serif italic">Inquiry received for {lead.productInterest} from {lead.destinationCountry}.</p>
                  <div className="flex items-center gap-4 mt-4">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black uppercase tracking-widest">
                      {lead.status}
                    </span>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Zap size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{lead.source}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && leads.length === 0 && (
              <div className="py-20 text-center bg-zinc-50/50 rounded-[2rem] border border-dashed border-zinc-200">
                <p className="text-zinc-400 font-serif italic text-lg">No recent activity found.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-200/50 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Inventory Alerts</h3>
            <Link to="/inventory" className="text-[10px] font-black text-[#064e3b] uppercase tracking-widest hover:underline">Manage</Link>
          </div>
          <div className="space-y-6">
            {lowStockItems.length > 0 && (
              <div className="p-6 rounded-[2rem] bg-amber-50 border border-amber-100 flex items-start gap-4 shadow-sm">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-amber-900 uppercase tracking-widest">{lowStockItems.length} Low Stock Items</p>
                  <p className="text-xs text-amber-700 mt-1 font-serif italic">Reorder recommended immediately.</p>
                </div>
              </div>
            )}
            {expiredItems.length > 0 && (
              <div className="p-6 rounded-[2rem] bg-rose-50 border border-rose-100 flex items-start gap-4 shadow-sm">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <AlertTriangle size={20} className="text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-rose-900 uppercase tracking-widest">{expiredItems.length} Expired Batches</p>
                  <p className="text-xs text-rose-700 mt-1 font-serif italic">Action required: Quality control check.</p>
                </div>
              </div>
            )}
            {lowStockItems.length === 0 && expiredItems.length === 0 && (
              <div className="text-center py-20 bg-[#fcfaf7]/50 rounded-[2rem] border border-dashed border-zinc-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Package size={32} className="text-emerald-600" />
                </div>
                <p className="text-lg font-serif italic text-zinc-500">Inventory is healthy.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {(userRole === 'admin' || userRole === 'manager') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-200/50 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Revenue by Market</h3>
              <Link to="/analytics" className="text-[10px] font-black text-[#064e3b] uppercase tracking-widest hover:underline">Full Report</Link>
            </div>
            <div className="w-full h-[250px]">
              <ReResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie
                    data={revenueByMarket}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {revenueByMarket.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #f4f4f5', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                  />
                </RePieChart>
              </ReResponsiveContainer>
            </div>
            <div className="mt-8 space-y-4">
              {revenueByMarket.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.name}</span>
                  </div>
                  <span className="text-sm font-serif font-bold text-zinc-900">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-200/50 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Supplier Risk</h3>
              <Link to="/suppliers" className="text-[10px] font-black text-[#064e3b] uppercase tracking-widest hover:underline">Portal</Link>
            </div>
            <div className="space-y-6">
              {suppliers.slice(0, 4).map((supplier, i) => (
                <div key={i} className="flex items-center justify-between p-5 rounded-[2rem] bg-[#fcfaf7] border border-zinc-100 hover:border-emerald-200 transition-all group">
                  <div>
                    <p className="text-sm font-serif font-bold text-zinc-900 group-hover:text-[#064e3b] transition-colors">{supplier.name}</p>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">{supplier.category}</p>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border",
                      supplier.riskScore < 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      supplier.riskScore < 70 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-rose-50 text-rose-700 border-rose-100'
                    )}>
                      {supplier.riskScore}% Risk
                    </div>
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && (
                <div className="py-20 text-center bg-[#fcfaf7]/50 rounded-[2rem] border border-dashed border-zinc-200">
                  <p className="text-zinc-400 font-serif italic text-lg">No supplier data.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-200/50 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Pipeline Overview</h3>
              <Link to="/pipeline" className="text-[10px] font-black text-[#064e3b] uppercase tracking-widest hover:underline">Kanban</Link>
            </div>
            <div className="space-y-6">
              {[
                { label: 'Confirmed', stage: 'orderConfirmed', color: 'bg-emerald-500' },
                { label: 'Documentation', stage: 'exportDocumentation', color: 'bg-blue-500' },
                { label: 'Packing', stage: 'shipmentReady', color: 'bg-amber-500' },
                { label: 'Shipping', stage: 'shippedDelivered', color: 'bg-indigo-500' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${s.color} shadow-sm group-hover:scale-125 transition-transform`} />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] group-hover:text-[#064e3b] transition-colors">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${s.color}`} 
                        style={{ width: `${(orders.filter(o => o.stage === s.stage).length / Math.max(orders.length, 1)) * 100}%` }} 
                      />
                    </div>
                    <span className="text-sm font-serif font-bold text-zinc-900">
                      {orders.filter(o => o.stage === s.stage).length}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
