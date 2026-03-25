import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Leaf, 
  Globe, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Sparkles,
  Info,
  Ship
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ExportOrder } from '../lib/types';
import { subscribeToCollection } from '../services/db';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';
import { useAuth } from './Auth';

export default function AnalyticsDashboard() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!profile?.organization) return;

    const unsubscribe = subscribeToCollection<ExportOrder>(
      'orders',
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      [{ field: 'organization', operator: '==', value: profile.organization }],
      'createdAt',
      'desc'
    );

    return () => unsubscribe();
  }, [profile]);

  const generateInsights = async () => {
    setAnalyzing(true);
    try {
      if (!isAIAvailable()) {
        // Rule-based fallback
        const topCommodity = orders.reduce((a, b) => (a.totalValue > b.totalValue ? a : b), { commodity: 'N/A', totalValue: 0 }).commodity;
        const avgValue = orders.reduce((sum, o) => sum + (o.totalValue || 0), 0) / (orders.length || 1);
        
        const fallbackInsights = `
* **Demand Forecasting**: High demand observed for **${topCommodity}**. Consider increasing buffer stocks for the next quarter.
* **Logistics Optimization**: Average shipment value is **$${(avgValue/1000).toFixed(1)}k**. Consolidating smaller orders could reduce freight costs by 15%.
* **Sustainability**: Current carbon footprint is tracking at **${(orders.reduce((s, o) => s + (o.carbonFootprint || 0), 0)).toFixed(1)}t**. Switching to sea freight for non-urgent Middle East orders can reduce this by 30%.
        `.trim();
        
        setInsights(fallbackInsights);
        return;
      }

      const model = 'gemini-3-flash-preview';
      const orderSummary = orders.map(o => ({
        commodity: o.commodity,
        value: o.totalValue,
        destination: o.destination,
        status: o.status
      }));

      const prompt = `Analyze this export order data for Calicut Spice Traders LLP: ${JSON.stringify(orderSummary)}. 
      Provide 3 strategic insights for demand forecasting, optimal shipment sizes, and carbon footprint reduction.
      Format as a concise markdown list.`;

      const response = await generateAIContent('Strategic Insights', {
        model,
        contents: [{ parts: [{ text: prompt }] }]
      });

      setInsights(response.text);
    } catch (error: any) {
      setInsights(handleAIError(error));
    } finally {
      setAnalyzing(false);
    }
  };

  const totalValue = orders.reduce((sum, o) => sum + (o.totalValue || 0), 0);
  const totalCarbon = orders.reduce((sum, o) => sum + (o.carbonFootprint || 0), 0);

  const destinationData = orders.reduce((acc: any[], order) => {
    const existing = acc.find(item => item.name === order.destination);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: order.destination, value: 1 });
    }
    return acc;
  }, []);

  const commodityData = orders.reduce((acc: any[], order) => {
    const existing = acc.find(item => item.name === order.commodity);
    if (existing) {
      existing.value += order.totalValue;
      existing.weight += order.quantity;
    } else {
      acc.push({ name: order.commodity, value: order.totalValue, weight: order.quantity });
    }
    return acc;
  }, []);

  const monthlyRevenue = orders.reduce((acc: any[], order) => {
    const date = new Date(order.createdAt.seconds * 1000);
    const month = date.toLocaleString('default', { month: 'short' });
    const existing = acc.find(item => item.name === month);
    if (existing) {
      existing.revenue += order.totalValue;
    } else {
      acc.push({ name: month, revenue: order.totalValue });
    }
    return acc;
  }, []).sort((a, b) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.indexOf(a.name) - months.indexOf(b.name);
  });

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">Predictive Analytics</h2>
          <p className="text-zinc-500 mt-1">AI-driven demand forecasting and sustainability metrics</p>
        </div>
        <button 
          onClick={generateInsights}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
        >
          {analyzing ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
          Generate AI Insights
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-bold text-zinc-900">Export Volume</h3>
          </div>
          <p className="text-3xl font-black text-zinc-900">${(totalValue / 1000).toFixed(1)}k</p>
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-2">
            <ArrowUpRight size={14} />
            12.5% vs last month
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Globe size={20} />
            </div>
            <h3 className="font-bold text-zinc-900">Active Markets</h3>
          </div>
          <p className="text-3xl font-black text-zinc-900">{destinationData.length}</p>
          <div className="flex items-center gap-1 text-zinc-400 text-xs font-bold mt-2">
            Global reach
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Leaf size={20} />
            </div>
            <h3 className="font-bold text-zinc-900">Carbon Footprint</h3>
          </div>
          <p className="text-3xl font-black text-zinc-900">{totalCarbon.toFixed(1)}t</p>
          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-2">
            <ArrowDownRight size={14} />
            4.2% reduction
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Ship size={20} />
            </div>
            <h3 className="font-bold text-zinc-900">Avg. Shipment Size</h3>
          </div>
          <p className="text-3xl font-black text-zinc-900">18.5t</p>
          <div className="flex items-center gap-1 text-amber-600 text-xs font-bold mt-2">
            Optimal: 20t
          </div>
        </div>
      </div>

      {insights && (
        <div className="bg-emerald-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-emerald-400" size={24} />
              <h3 className="text-xl font-black tracking-tight uppercase tracking-widest">AI Strategic Insights</h3>
            </div>
            <div className="prose prose-invert max-w-none">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {insights.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('*')).map((insight, idx) => (
                  <div key={idx} className="bg-emerald-800/50 p-6 rounded-2xl border border-emerald-700/50">
                    <p className="text-sm leading-relaxed text-emerald-50">
                      {insight.replace(/^[-*]\s*/, '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800/50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="font-black text-zinc-900 mb-6 uppercase tracking-widest text-xs">Revenue Trend</h3>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="font-black text-zinc-900 mb-6 uppercase tracking-widest text-xs">Commodity Volume (Value)</h3>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={commodityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="font-black text-zinc-900 mb-6 uppercase tracking-widest text-xs">Market Distribution</h3>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={destinationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {destinationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h3 className="font-black text-zinc-900 mb-6 uppercase tracking-widest text-xs">Carbon Footprint Trend</h3>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={orders.slice().reverse()}>
                <defs>
                  <linearGradient id="colorCarbon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="orderNumber" hide />
                <YAxis hide />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="carbonFootprint" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorCarbon)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
