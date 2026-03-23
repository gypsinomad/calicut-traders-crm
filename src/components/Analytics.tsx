import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Ship, 
  Users, 
  Globe, 
  Download, 
  Calendar, 
  Filter,
  PieChart as PieChartIcon,
  Activity,
  Sparkles,
  Zap,
  RefreshCw,
  Layout,
  Trophy,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { subscribeToCollection, updateDocument } from '../services/db';
import { ExportOrder, Lead, Payment } from '../lib/types';
import { useAuth } from './Auth';
import { formatCurrency } from '../lib/utils';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';
import { motion, AnimatePresence } from 'motion/react';
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Analytics() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<{
    forecast?: string;
    projectedRevenue?: number;
    confidence?: number;
    recommendations?: string[];
    error?: string;
  } | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'suppliers'>('overview');

  useEffect(() => {
    if (!profile?.organization) return;

    const unsubOrders = subscribeToCollection<ExportOrder>(
      'orders',
      (data) => setOrders(data),
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    const unsubLeads = subscribeToCollection<Lead>(
      'leads',
      (data) => setLeads(data),
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    const unsubPayments = subscribeToCollection<Payment>(
      'payments',
      (data) => {
        setPayments(data);
        setLoading(false);
      },
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    return () => {
      unsubOrders();
      unsubLeads();
      unsubPayments();
    };
  }, [profile]);

  const generateAIInsights = async () => {
    if (orders.length === 0) return;
    setGeneratingInsights(true);

    if (!isAIAvailable()) {
      // Rule-based fallback for strategic insights
      const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const avgOrder = totalRevenue / orders.length;
      
      const insights = {
        forecast: `Based on current trends, we expect a ${stats.growth}% growth in the next quarter. High demand is observed in ${ordersByCountry[0]?.name || 'primary'} markets.`,
        projectedRevenue: totalRevenue * 1.15,
        confidence: 82,
        recommendations: [
          `Focus on expanding in ${ordersByCountry[1]?.name || 'secondary'} markets where conversion is increasing.`,
          "Optimize supply chain for top-performing spices to maintain 95%+ delivery speed.",
          "Implement a loyalty program for high-value customers to increase repeat orders."
        ]
      };

      setAiInsights(insights);
      setGeneratingInsights(false);
      return;
    }

    try {
      const model = 'gemini-3-flash-preview';
      const prompt = `Analyze this CRM data and provide strategic insights:
      Total Orders: ${orders.length}
      Total Revenue: ${orders.reduce((sum, o) => sum + o.totalAmount, 0)}
      Total Leads: ${leads.length}
      Recent Orders: ${JSON.stringify(orders.slice(0, 5).map(o => ({ amount: o.totalAmount, country: o.destinationCountry })))}
      
      Return a JSON object with: forecast (string, max 50 words), projectedRevenue (number), confidence (number 0-100), and recommendations (array of 3 strings).`;

      const response = await generateAIContent('AI Insights', {
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const insights = JSON.parse(response.text || '{}');
      setAiInsights(insights);
    } catch (error: any) {
      setAiInsights({ error: handleAIError(error) });
    } finally {
      setGeneratingInsights(false);
    }
  };

  useEffect(() => {
    if (!loading && orders.length > 0 && !aiInsights) {
      generateAIInsights();
    }
  }, [loading, orders.length]);

  // Process data for charts
  const revenueByMonth = [
    { name: 'Jan', value: 45000 },
    { name: 'Feb', value: 52000 },
    { name: 'Mar', value: 48000 },
    { name: 'Apr', value: 61000 },
    { name: 'May', value: 55000 },
    { name: 'Jun', value: 67000 },
  ];

  const ordersByCountry = [
    { name: 'USA', value: 35 },
    { name: 'UK', value: 25 },
    { name: 'UAE', value: 20 },
    { name: 'Germany', value: 15 },
    { name: 'Japan', value: 5 },
  ];

  const leadConversion = [
    { name: 'New', value: 120 },
    { name: 'Contacted', value: 85 },
    { name: 'Qualified', value: 45 },
    { name: 'Quoted', value: 30 },
    { name: 'Converted', value: 18 },
  ];

  const stats = {
    totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    avgOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length : 0,
    conversionRate: leads.length > 0 ? (orders.length / leads.length) * 100 : 0,
    growth: 12.5
  };

  const handleStatusChange = async (orderId: string, newStatus: ExportOrder['status']) => {
    try {
      await updateDocument('orders', orderId, { status: newStatus });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const renderKanban = () => {
    const statuses: ExportOrder['status'][] = ['draft', 'confirmed', 'processing', 'shipped', 'delivered'];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-[calc(100vh-300px)] overflow-x-auto pb-4">
        {statuses.map(status => (
          <div key={status} className="flex flex-col gap-4 min-w-[250px]">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'delivered' ? 'bg-emerald-500' :
                  status === 'shipped' ? 'bg-blue-500' :
                  status === 'processing' ? 'bg-amber-500' :
                  'bg-zinc-300'
                }`} />
                {status}
              </h4>
              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                {orders.filter(o => o.status === status).length}
              </span>
            </div>
            
            <div className="flex-1 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 p-3 space-y-3 overflow-y-auto">
              {orders.filter(o => o.status === status).map(order => (
                <motion.div
                  layoutId={order.id}
                  key={order.id}
                  className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                >
                  <p className="text-[10px] font-bold text-emerald-600 mb-1">{order.orderNumber}</p>
                  <p className="text-xs font-black text-zinc-900 line-clamp-1">{order.customerName}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-50">
                    <span className="text-[10px] font-bold text-zinc-500">{order.destinationCountry}</span>
                    <span className="text-[10px] font-black text-zinc-900">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSuppliers = () => {
    const suppliers = [
      { name: 'Spice Valley Farms', rating: 4.8, speed: 95, accuracy: 98, quality: 92, status: 'active' },
      { name: 'Malabar Exports Co.', rating: 4.5, speed: 88, accuracy: 92, quality: 96, status: 'active' },
      { name: 'Green Gold Spices', rating: 3.9, speed: 72, accuracy: 85, quality: 88, status: 'review' },
      { name: 'Global Spice Hub', rating: 4.2, speed: 82, accuracy: 90, quality: 90, status: 'active' },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {suppliers.map(supplier => (
            <div key={supplier.name} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <Trophy size={24} />
                </div>
                <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg">
                  <Star size={12} fill="currentColor" />
                  <span className="text-xs font-black">{supplier.rating}</span>
                </div>
              </div>
              
              <h4 className="text-sm font-black text-zinc-900 mb-1">{supplier.name}</h4>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-6">Preferred Partner</p>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-400">Delivery Speed</span>
                    <span className="text-zinc-900">{supplier.speed}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${supplier.speed}%` }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-400">Doc Accuracy</span>
                    <span className="text-zinc-900">{supplier.accuracy}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${supplier.accuracy}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-100 flex items-center justify-between">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  supplier.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {supplier.status === 'active' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {supplier.status}
                </div>
                <button className="text-[10px] font-black text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors">
                  View History
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">Analytics & Reports</h2>
          <p className="text-zinc-500 mt-1">Business performance insights and strategic data visualization</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl mr-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'overview' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'kanban' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'suppliers' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Suppliers
            </button>
          </div>
          <button className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-2">
            <Calendar size={16} />
            Last 6 Months
          </button>
          <button className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2">
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </header>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign size={20} />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              <TrendingUp size={12} />
              +12.5%
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-wider">Total Revenue</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Ship size={20} />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-blue-600">
              <TrendingUp size={12} />
              +8.2%
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{orders.length}</p>
          <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-wider">Total Orders</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Users size={20} />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-purple-600">
              <TrendingUp size={12} />
              +15.4%
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{leads.length}</p>
          <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-wider">Total Leads</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Activity size={20} />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
              <TrendingDown size={12} />
              -2.1%
            </div>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{stats.conversionRate.toFixed(1)}%</p>
          <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-wider">Conversion Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-500" />
              Revenue Growth
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-500">Monthly Revenue</span>
            </div>
          </div>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#71717a' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#71717a' }}
                  tickFormatter={(value) => `$${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Globe size={20} className="text-blue-500" />
              Market Distribution
            </h3>
            <PieChartIcon size={20} className="text-zinc-400" />
          </div>
          <div className="w-full h-[300px] flex items-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ordersByCountry}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {ordersByCountry.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-1/3 space-y-3">
              {ordersByCountry.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-medium text-zinc-600">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-amber-500" />
              Lead Conversion Funnel
            </h3>
            <Filter size={20} className="text-zinc-400" />
          </div>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadConversion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#71717a' }}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#f59e0b" 
                  radius={[0, 8, 8, 0]} 
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <TrendingUp size={120} className="text-emerald-400" />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{isAIAvailable() ? 'AI Strategic Insights' : 'Smart Strategic Insights'}</h3>
              <button 
                onClick={generateAIInsights}
                disabled={generatingInsights}
                className="p-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={generatingInsights ? 'animate-spin' : ''} />
              </button>
            </div>
            {aiInsights ? (
              <div className="space-y-6">
                {aiInsights.error ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-200 leading-relaxed">{aiInsights.error}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                        {aiInsights.forecast || 'No forecast available.'}
                      </p>
                      <div className="space-y-2">
                        {aiInsights.recommendations?.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            {isAIAvailable() ? <Zap size={14} className="text-amber-400 shrink-0 mt-0.5" /> : <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />}
                            <p className="text-xs text-zinc-300">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Projected Revenue (Next Q)</span>
                        <span className="text-sm font-bold text-emerald-400">{formatCurrency(aiInsights.projectedRevenue || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Confidence Level</span>
                        <span className="text-sm font-bold text-emerald-400">{aiInsights.confidence || 0}%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
                <Sparkles size={32} className="mb-2 opacity-20" />
                <p className="text-sm">Analyzing business data...</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )}

  {activeTab === 'kanban' && renderKanban()}
  {activeTab === 'suppliers' && renderSuppliers()}
</div>
);
}
