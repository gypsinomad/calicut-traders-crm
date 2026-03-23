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
  Plus
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
import { ExportOrder, Company, Task, InventoryItem, MarketPrice, Supplier, Lead } from '../lib/types.ts';
import { Link } from 'react-router-dom';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';
import { motion, AnimatePresence } from 'motion/react';

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-zinc-500">{title}</p>
        <h3 className="text-2xl font-bold text-zinc-900 mt-1">{value}</h3>
        <div className="flex items-center gap-1 mt-2">
          {trend === 'up' ? (
            <ArrowUpRight size={16} className="text-emerald-500" />
          ) : (
            <ArrowDownRight size={16} className="text-rose-500" />
          )}
          <span className={trend === 'up' ? 'text-emerald-600 text-sm font-medium' : 'text-rose-600 text-sm font-medium'}>
            {change}
          </span>
          <span className="text-zinc-400 text-xs ml-1">vs last month</span>
        </div>
      </div>
      <div className="p-3 bg-zinc-50 rounded-xl">
        <Icon size={24} className="text-zinc-600" />
      </div>
    </div>
  </div>
);

import { useAuth } from './Auth.tsx';
import { UserRole } from '../lib/types.ts';

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
  const [notifications, setNotifications] = useState<any[]>([]);
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

    const unsubNotifications = subscribeToCollection<any>('notifications', (data) => {
      setNotifications(data);
    }, [{ field: 'userId', operator: '==', value: profile.uid }]);

    setLoading(false);

    return () => {
      unsubOrders();
      unsubCompanies();
      unsubLeads();
      unsubTasks();
      unsubInventory();
      unsubMarket();
      unsubSuppliers();
      unsubNotifications();
    };
  }, [profile]);

  const generateBriefing = async () => {
    if (!profile) return;
    setLoadingBriefing(true);
    
    if (!isAIAvailable()) {
      // Rule-based fallback
      const insights = [];
      if (activeLeads > 5) insights.push(`• High sales activity: ${activeLeads} active leads require follow-up.`);
      if (shipmentsInTransit > 0) insights.push(`• Logistics: ${shipmentsInTransit} shipments are currently in transit.`);
      if (pendingTasks > 0) insights.push(`• Productivity: You have ${pendingTasks} pending tasks to complete.`);
      if (lowStockItems.length > 0) insights.push(`• Inventory Alert: ${lowStockItems.length} items are below reorder levels.`);
      if (expiredItems.length > 0) insights.push(`• Quality Control: ${expiredItems.length} batches have expired and need attention.`);
      
      if (insights.length === 0) insights.push("• Business is steady. No immediate alerts or actions required.");
      
      const fallbackText = insights.join('\n') + "\n\nStay focused and have a productive day!";
      setBriefing(fallbackText);
      setLoadingBriefing(false);
      return;
    }

    try {
      const model = 'gemini-3-flash-preview';
      const prompt = `Generate a concise daily business briefing for an export manager.
      Context:
      - Active Leads: ${activeLeads}
      - Shipments in Transit: ${shipmentsInTransit}
      - Pending Tasks: ${pendingTasks}
      - Low Stock Items: ${lowStockItems.length}
      - Expired Batches: ${expiredItems.length}
      - Total Revenue: $${totalRevenue}
      
      Provide 3 actionable bullet points and a motivational closing sentence. Keep it under 100 words.`;

      const response = await generateAIContent('Daily Briefing', {
        model,
        contents: [{ parts: [{ text: prompt }] }]
      });

      setBriefing(response.text || 'Unable to generate briefing at this time.');
    } catch (error: any) {
      const errorMessage = handleAIError(error);
      
      // If it's a quota or spending cap error, automatically trigger fallback
      if (errorMessage.toLowerCase().includes('quota') || 
          errorMessage.toLowerCase().includes('spending') ||
          errorMessage.toLowerCase().includes('429')) {
        console.warn("AI Quota exceeded, switching to Smart Mode fallback.");
        // Re-run the function, it will now hit the !isAIAvailable() check
        generateBriefing();
        return;
      }
      
      setBriefing(errorMessage);
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
      ['Shipments in Transit', shipmentsInTransit],
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
  const shipmentsInTransit = orders.filter(o => o.status === 'shipped').length;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;
  const lowStockItems = inventory.filter(item => item.quantity <= item.reorderLevel);
  const expiredItems = inventory.filter(item => item.expiryDate && new Date(item.expiryDate.seconds * 1000) < new Date());

  // Real chart data based on orders
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toLocaleString('default', { month: 'short' });
  }).reverse();

  const chartData = last6Months.map(month => {
    const monthlyOrders = orders.filter(o => {
      const d = new Date(o.createdAt.seconds * 1000);
      return d.toLocaleString('default', { month: 'short' }) === month;
    });
    return {
      name: month,
      revenue: monthlyOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      leads: leads.filter(l => {
        const d = new Date(l.createdAt.seconds * 1000);
        return d.toLocaleString('default', { month: 'short' }) === month;
      }).length
    };
  });

  const revenueByMarket = orders.reduce((acc: any[], order) => {
    const existing = acc.find(item => item.name === order.destinationCountry);
    if (existing) {
      existing.value += order.totalValue;
    } else {
      acc.push({ name: order.destinationCountry, value: order.totalValue });
    }
    return acc;
  }, []);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">Dashboard</h2>
          <p className="text-zinc-500 mt-1">Welcome back, {profile?.displayName || 'User'} ({userRole})</p>
        </div>
        <div className="flex items-center gap-3">
          {(userRole === 'admin' || userRole === 'manager') && (
            <button 
              onClick={handleDownloadReport}
              className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Download Report
            </button>
          )}
          <Link 
            to="/orders"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            New Export Order
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(userRole === 'admin' || userRole === 'manager') && (
          <StatCard 
            title="Total Revenue" 
            value={`$${totalRevenue.toLocaleString()}`} 
            change="+12.5%" 
            icon={TrendingUp} 
            trend="up" 
          />
        )}
        <StatCard 
          title="Active Leads" 
          value={activeLeads.toString()} 
          change="+8.2%" 
          icon={Users} 
          trend="up" 
        />
        <StatCard 
          title="Shipments in Transit" 
          value={shipmentsInTransit.toString()} 
          change="-2.4%" 
          icon={Ship} 
          trend="down" 
        />
        <StatCard 
          title="Pending Tasks" 
          value={pendingTasks.toString()} 
          change="+4.1%" 
          icon={CheckSquare} 
          trend="up" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-emerald-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-emerald-900/20">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg backdrop-blur-sm">
                  <Sparkles size={16} className="text-emerald-300" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                  {isAIAvailable() ? 'Daily AI Briefing' : 'Daily Smart Briefing'}
                </span>
              </div>
              <button 
                onClick={generateBriefing}
                disabled={loadingBriefing}
                className="p-2 hover:bg-emerald-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={loadingBriefing ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {loadingBriefing ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-emerald-800 rounded w-3/4" />
                <div className="h-4 bg-emerald-800 rounded w-1/2" />
                <div className="h-4 bg-emerald-800 rounded w-2/3" />
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                <p className="text-lg font-medium leading-relaxed text-emerald-50">
                  {briefing || 'Welcome to your dashboard. Click refresh to generate your daily briefing.'}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/market" className="px-4 py-2 bg-white text-emerald-900 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all flex items-center gap-2">
                <Globe size={14} />
                Market Trends
              </Link>
              <Link to="/inventory" className="px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all border border-emerald-700 flex items-center gap-2">
                <Package size={14} />
                Adjust Inventory
              </Link>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 right-0 p-8 opacity-10">
            <Sparkles size={120} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3 flex-1">
            {[
              { label: 'New Order', icon: Ship, path: '/orders', color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Add Lead', icon: Users, path: '/leads', color: 'bg-blue-50 text-blue-600' },
              { label: 'Scan Stock', icon: Package, path: '/scanner', color: 'bg-amber-50 text-amber-600' },
              { label: 'Upload Doc', icon: FileText, path: '/documents', color: 'bg-indigo-50 text-indigo-600' },
            ].map((action, i) => (
              <Link 
                key={i} 
                to={action.path}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-zinc-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
              >
                <div className={`p-2.5 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{action.label}</span>
              </Link>
            ))}
          </div>
          <Link to="/settings" className="mt-4 flex items-center justify-center gap-2 py-3 bg-zinc-50 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 transition-colors">
            All Settings <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {(userRole === 'admin' || userRole === 'manager') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Revenue Growth</h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Lead Generation</h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="leads" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center justify-between">
            Recent Activity Feed
            <Link to="/orders" className="text-xs text-emerald-600 hover:underline">View All</Link>
          </h3>
          <div className="space-y-6">
            {orders.slice(0, 3).map((order, i) => (
              <div key={`order-${i}`} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <Ship size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-zinc-900">New Order: #{order.orderNumber}</p>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{formatDate(order.createdAt)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{order.customerName} placed an order for {order.quantity}{order.unit} of {order.commodity}.</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      order.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-zinc-50 text-zinc-600 border-zinc-100'
                    }`}>
                      {order.status}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{order.destination}</span>
                  </div>
                </div>
              </div>
            ))}
            {leads.slice(0, 2).map((lead, i) => (
              <div key={`lead-${i}`} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Users size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-zinc-900">New Inquiry: {lead.fullName}</p>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{formatDate(lead.createdAt)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Inquiry received for {lead.productInterest} from {lead.destinationCountry}.</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase tracking-wider">
                      {lead.status}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{lead.source}</span>
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && leads.length === 0 && (
              <p className="text-zinc-400 text-sm italic text-center py-8">No recent activity found</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center justify-between">
            Inventory Alerts
            <Link to="/inventory" className="text-xs text-emerald-600 hover:underline">Manage</Link>
          </h3>
          <div className="space-y-4">
            {lowStockItems.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-3">
                <AlertTriangle size={18} className="text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-amber-900">{lowStockItems.length} Low Stock Items</p>
                  <p className="text-xs text-amber-700">Reorder recommended</p>
                </div>
              </div>
            )}
            {expiredItems.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-3">
                <AlertTriangle size={18} className="text-rose-600" />
                <div>
                  <p className="text-sm font-bold text-rose-900">{expiredItems.length} Expired Batches</p>
                  <p className="text-xs text-rose-700">Action required: Composting</p>
                </div>
              </div>
            )}
            {lowStockItems.length === 0 && expiredItems.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package size={24} className="text-emerald-600" />
                </div>
                <p className="text-sm text-zinc-500 font-medium">Inventory is healthy</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {(userRole === 'admin' || userRole === 'manager') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center justify-between">
              Revenue by Market
              <Link to="/analytics" className="text-xs text-emerald-600 hover:underline">Full Report</Link>
            </h3>
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
                  <Tooltip />
                </RePieChart>
              </ReResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {revenueByMarket.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-zinc-500">{item.name}</span>
                  </div>
                  <span className="font-bold text-zinc-900">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center justify-between">
              Supplier Risk
              <Link to="/suppliers" className="text-xs text-emerald-600 hover:underline">Portal</Link>
            </h3>
            <div className="space-y-4">
              {suppliers.slice(0, 4).map((supplier, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{supplier.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">{supplier.category}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      supplier.riskScore < 30 ? 'bg-emerald-100 text-emerald-700' :
                      supplier.riskScore < 70 ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      Risk: {supplier.riskScore}%
                    </div>
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && (
                <p className="text-zinc-400 text-sm italic text-center py-4">No supplier data available</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center justify-between">
              Pipeline Overview
              <Link to="/pipeline" className="text-xs text-emerald-600 hover:underline">Kanban</Link>
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Confirmed', stage: 'orderConfirmed', color: 'bg-emerald-500' },
                { label: 'Documentation', stage: 'exportDocumentation', color: 'bg-blue-500' },
                { label: 'Packing', stage: 'shipmentReady', color: 'bg-amber-500' },
                { label: 'Shipping', stage: 'shippedDelivered', color: 'bg-indigo-500' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${s.color}`} />
                    <span className="text-sm text-zinc-600 font-medium">{s.label}</span>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">
                    {orders.filter(o => o.stage === s.stage).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
