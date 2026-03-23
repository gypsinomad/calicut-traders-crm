import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  TrendingUp, 
  DollarSign, 
  RefreshCcw, 
  PieChart, 
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Clock,
  Info,
  Save,
  Loader2
} from 'lucide-react';
import { getAIUsageSummary, resetAIUsage, AIUsageSummary } from '../lib/aiUsageTracker';
import { getAISettings, saveAISettings, AISettings } from '../lib/aiSettings';
import { useAuth } from './Auth';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AIUsageDashboard() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<AIUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isLowQuota, setIsLowQuota] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [settings, setSettings] = useState<AISettings>({
    apiKey: '',
    model: 'gemini-3-flash-preview',
    spendingCapINR: 1000,
    enabled: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (profile?.organization) {
        const s = await getAISettings(profile.organization);
        setSettings(s);
      }
    }
    loadSettings();
  }, [profile?.organization]);

  const handleSaveSettings = async () => {
    if (!profile?.organization) return;
    setSaving(true);
    try {
      await saveAISettings(profile.organization, settings);
      alert('AI Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diff = midnight.getTime() - now.getTime();

      if (diff <= 0) {
        setIsResetting(true);
        setTimeout(() => {
          setIsResetting(false);
          fetchSummary();
        }, 2000);
        return 'Resetting...';
      }

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setIsLowQuota(hours === 0);

      return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
      ].join(':');
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchSummary = async () => {
    if (!profile?.organization) return;
    setLoading(true);
    try {
      const data = await getAIUsageSummary(profile.organization);
      setSummary(data);
    } catch (error) {
      console.error('Error fetching AI usage summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [profile?.organization]);

  const handleReset = async () => {
    if (!profile?.organization) return;
    if (!window.confirm('Are you sure you want to reset all AI usage data? This action cannot be undone.')) return;
    
    setResetting(true);
    try {
      await resetAIUsage(profile.organization);
      await fetchSummary();
    } catch (error) {
      console.error('Error resetting AI usage:', error);
    } finally {
      setResetting(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const chartData = summary?.byFeature.map(f => ({
    name: f.feature,
    calls: f.totalCalls,
    cost: f.totalCostUSD
  })) || [];

  return (
    <div className="space-y-8 pb-20">
      {/* Settings Section */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">AI Configuration</h2>
            <p className="text-sm text-zinc-500">Manage your Gemini API settings and usage limits</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-600">Enable AI Features</span>
            <button
              onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative",
                settings.enabled ? "bg-emerald-500" : "bg-zinc-200"
              )}
            >
              <div className={clsx(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                settings.enabled ? "left-7" : "left-1"
              )} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings(s => ({ ...s, apiKey: e.target.value }))}
                placeholder="Enter your API key (optional if env var set)"
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all font-mono text-sm"
              />
              <p className="mt-1 text-[10px] text-zinc-400">
                Leave blank to use the system default key.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                AI Model Selection
              </label>
              <select
                value={settings.model}
                onChange={(e) => setSettings(s => ({ ...s, model: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
              >
                <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast & Efficient)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Complex Reasoning)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Monthly Spending Cap (INR)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₹</span>
                <input
                  type="number"
                  value={settings.spendingCapINR}
                  onChange={(e) => setSettings(s => ({ ...s, spendingCapINR: Number(e.target.value) }))}
                  className="w-full pl-8 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all font-bold"
                />
              </div>
              <p className="mt-1 text-[10px] text-zinc-400">
                AI features will be disabled once this limit is reached.
              </p>
            </div>

            <div className="pt-6">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Save AI Configuration
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">AI Usage & Costs</h3>
          <p className="text-sm text-zinc-500 mt-1">Monitor your organization's Gemini AI consumption</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchSummary}
            className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
            Reset Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Zap size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Calls</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900">{summary?.totalCalls.toLocaleString()}</div>
          <p className="text-xs text-zinc-500 mt-1">AI interactions tracked</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Tokens</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900">{(summary?.totalTokens || 0).toLocaleString()}</div>
          <p className="text-xs text-zinc-500 mt-1">Input + Output tokens</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Est. Cost (USD)</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900">${summary?.totalCostUSD.toFixed(4)}</div>
          <p className="text-xs text-zinc-500 mt-1">Based on Gemini Flash pricing</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Est. Cost (INR)</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900">₹{summary?.totalCostINR.toFixed(2)}</div>
          <p className="text-xs text-zinc-500 mt-1">Conversion: 1 USD = 83.5 INR</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${isLowQuota ? 'bg-rose-50 text-rose-600' : 'bg-zinc-50 text-zinc-600'}`}>
              <Clock size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Quota Resets In</span>
          </div>
          <div className={`text-2xl font-bold font-mono ${isLowQuota ? 'text-rose-600' : 'text-zinc-900'}`}>
            {isResetting ? 'Resetting...' : timeLeft}
          </div>
          <p className="text-xs text-zinc-500 mt-1">Daily quota resets at midnight UTC</p>
          {isLowQuota && !isResetting && (
            <p className="text-[10px] font-bold text-rose-500 uppercase mt-2 animate-pulse">Quota running low</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage by Feature Chart */}
        <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 size={20} className="text-zinc-400" />
            <h4 className="text-sm font-bold text-zinc-900">Usage by Feature</h4>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="calls" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Cost Distribution Chart */}
        <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <PieChart size={20} className="text-zinc-400" />
            <h4 className="text-sm font-bold text-zinc-900">Cost Distribution</h4>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="cost"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Detailed Table */}
      <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <h4 className="text-sm font-bold text-zinc-900">Feature Breakdown</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50">
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Calls</th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Tokens</th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Cost (USD)</th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Cost (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {summary?.byFeature.map((f, idx) => (
                <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-sm font-medium text-zinc-900">{f.feature}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 text-right font-mono">{f.totalCalls.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-zinc-600 text-right font-mono">{f.totalTokens.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-zinc-900 text-right font-mono">${f.totalCostUSD.toFixed(4)}</td>
                  <td className="px-6 py-4 text-sm text-emerald-600 text-right font-bold font-mono">₹{f.totalCostINR.toFixed(2)}</td>
                </tr>
              ))}
              {(!summary || summary.byFeature.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="text-zinc-300" size={24} />
                      <p className="text-sm text-zinc-500">No AI usage data recorded yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing Info */}
      <div className="space-y-4">
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex items-start gap-3">
          <CheckCircle2 className="text-emerald-600 mt-0.5" size={16} />
          <div>
            <p className="text-xs font-bold text-zinc-900">Pricing Model: Gemini 1.5 Flash</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
              Input: $0.075 per 1M tokens | Output: $0.30 per 1M tokens. Costs are estimated based on token counts reported by the AI model. 
              INR conversion is calculated at a fixed rate of 83.5.
            </p>
          </div>
        </div>

        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
          <Info className="text-blue-600 mt-0.5" size={16} />
          <div>
            <p className="text-xs font-bold text-blue-900">Quota Information</p>
            <p className="text-[10px] text-blue-700 mt-0.5 leading-relaxed">
              Gemini free tier resets daily at 00:00 UTC (05:30 AM IST). Paid tier limits are set in Google Cloud Console.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
