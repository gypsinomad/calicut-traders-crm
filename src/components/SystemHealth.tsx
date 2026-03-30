import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Server, 
  Database, 
  Globe, 
  Shield, 
  Zap, 
  Cpu, 
  HardDrive,
  RefreshCw,
  Info,
  ExternalLink,
  Signal,
  Wifi,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToCollection } from '../services/db';
import { SystemHealth as HealthType } from '../lib/types';
import { useAuth } from './Auth';
import { formatDate } from '../lib/utils';

export default function SystemHealth() {
  const { profile } = useAuth();
  const [services, setServices] = useState<HealthType[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (!profile?.organization) return;

    // In a real app, this would be populated by a backend monitoring service
    // For this demo, we'll subscribe to a collection or mock it if empty
    const unsub = subscribeToCollection<HealthType>(
      'system_health',
      (data) => {
        if (data.length === 0) {
          // Mock data if collection is empty
          setServices([
            { id: '1', serviceName: 'Core API', status: 'healthy', latency: 45, lastChecked: { toDate: () => new Date() } as any },
            { id: '2', serviceName: 'Firestore DB', status: 'healthy', latency: 12, lastChecked: { toDate: () => new Date() } as any },
            { id: '3', serviceName: 'Gemini AI Engine', status: 'healthy', latency: 850, lastChecked: { toDate: () => new Date() } as any },
            { id: '4', serviceName: 'WhatsApp Gateway', status: 'healthy', latency: 120, lastChecked: { toDate: () => new Date() } as any },
            { id: '5', serviceName: 'Document Processor', status: 'degraded', latency: 2400, lastChecked: { toDate: () => new Date() } as any, message: 'High load detected' },
            { id: '6', serviceName: 'ICEGATE Integration', status: 'healthy', latency: 450, lastChecked: { toDate: () => new Date() } as any },
          ]);
        } else {
          setServices(data);
        }
        setLoading(false);
        setLastUpdated(new Date());
      },
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    return () => unsub();
  }, [profile?.organization]);

  const getStatusColor = (status: HealthType['status']) => {
    switch (status) {
      case 'healthy': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'degraded': return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'down': return 'text-rose-500 bg-rose-50 border-rose-100';
      default: return 'text-zinc-500 bg-zinc-50 border-zinc-100';
    }
  };

  const getStatusIcon = (status: HealthType['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 size={16} />;
      case 'degraded': return <AlertCircle size={16} />;
      case 'down': return <AlertCircle size={16} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">System Health</h2>
          <p className="text-zinc-500 mt-1">Real-time monitoring of infrastructure and external integrations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-lg text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            <Clock size={12} />
            Last Updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Activity size={20} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Uptime</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">99.98%</p>
          <p className="text-xs text-zinc-500 mt-1">Last 30 days average</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Zap size={20} />
            </div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Latency</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">124ms</p>
          <p className="text-xs text-zinc-500 mt-1">Global average response</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Cpu size={20} />
            </div>
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">CPU Load</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">24%</p>
          <p className="text-xs text-zinc-500 mt-1">Current cluster utilization</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <HardDrive size={20} />
            </div>
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Storage</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">1.2 TB</p>
          <p className="text-xs text-zinc-500 mt-1">Document vault usage</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Server size={20} className="text-zinc-400" />
                Service Status
              </h3>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">All Systems Operational</span>
              </div>
            </div>
            <div className="divide-y divide-zinc-100">
              {services.map((service) => (
                <div key={service.id} className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${getStatusColor(service.status)}`}>
                      {service.serviceName.includes('DB') ? <Database size={18} /> : 
                       service.serviceName.includes('AI') ? <Zap size={18} /> :
                       service.serviceName.includes('API') ? <Globe size={18} /> : <Server size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{service.serviceName}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-2">
                        <Clock size={12} />
                        Checked {new Date(service.lastChecked.toDate()).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Latency</p>
                      <p className={`text-sm font-bold ${service.latency > 1000 ? 'text-amber-600' : 'text-zinc-900'}`}>
                        {service.latency}ms
                      </p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${getStatusColor(service.status)}`}>
                      {getStatusIcon(service.status)}
                      {service.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Signal size={120} className="text-emerald-400" />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Shield size={24} className="text-emerald-400" />
                Security & Compliance Monitoring
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">SSL Certificate</span>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Database Encryption</span>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      AES-256
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Firewall Status</span>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      Protected
                    </span>
                  </div>
                </div>
                <div className="p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Compliance Score</p>
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-bold text-white">98</p>
                    <p className="text-sm text-emerald-400 font-bold mb-1">/ 100</p>
                  </div>
                  <div className="mt-4 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[98%]" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Globe size={16} className="text-blue-500" />
              Regional Performance
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🇮🇳</span>
                  <span className="text-sm font-medium text-zinc-900">Mumbai (Primary)</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">12ms</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🇺🇸</span>
                  <span className="text-sm font-medium text-zinc-900">US East</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">145ms</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🇪🇺</span>
                  <span className="text-sm font-medium text-zinc-900">Europe West</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">112ms</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🇦🇪</span>
                  <span className="text-sm font-medium text-zinc-900">Middle East</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">85ms</span>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Info size={16} className="text-amber-500" />
              System Alerts
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">Document Processor Lag</p>
                    <p className="text-[10px] text-amber-700 mt-1">Processing time for large PDFs has increased. Investigating auto-scaling rules.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Backup Successful</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Daily system backup completed successfully at 02:00 UTC.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
