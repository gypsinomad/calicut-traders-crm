import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { SystemHealth } from '../lib/types';
import { format } from 'date-fns';
import { Activity, CheckCircle2, AlertCircle, XCircle, Clock, RefreshCw, Server, Database, Globe, Shield } from 'lucide-react';
import { TranslatedText } from './TranslatedText';

export default function HealthMonitoring() {
  const [healthData, setHealthData] = useState<SystemHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'system_health'),
      orderBy('lastChecked', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SystemHealth[];
      setHealthData(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="text-emerald-500" size={20} />;
      case 'degraded': return <AlertCircle className="text-amber-500" size={20} />;
      case 'down': return <XCircle className="text-rose-500" size={20} />;
      default: return <Activity className="text-zinc-400" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'degraded': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'down': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-100';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">
            <TranslatedText>System Health & Monitoring</TranslatedText>
          </h2>
          <p className="text-zinc-500 mt-1">
            <TranslatedText>Real-time status of all critical infrastructure and services</TranslatedText>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold border border-emerald-100 shadow-sm">
            <CheckCircle2 size={16} />
            <span><TranslatedText>All Systems Operational</TranslatedText></span>
          </div>
          <button className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">
            <RefreshCw size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Server size={24} />
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Infrastructure</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-900">99.99%</h3>
            <p className="text-sm text-zinc-500 mt-1">Average Uptime (30d)</p>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[99.99%]" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Database size={24} />
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Database</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-900">12ms</h3>
            <p className="text-sm text-zinc-500 mt-1">Average Latency</p>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[85%]" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Globe size={24} />
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Global CDN</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-900">100%</h3>
            <p className="text-sm text-zinc-500 mt-1">Edge Availability</p>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-full" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-bold text-zinc-900">Service Status</h3>
          <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Degraded</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Down</span>
            </div>
          </div>
        </div>
        <div className="divide-y divide-zinc-100">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-zinc-500 font-medium">Monitoring services...</p>
            </div>
          ) : healthData.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-400">No monitoring data available</p>
            </div>
          ) : (
            healthData.map((service) => (
              <div key={service.id} className="p-6 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg border ${getStatusColor(service.status)}`}>
                    {getStatusIcon(service.status)}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900">{service.serviceName}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                        <Clock size={10} />
                        <span>Last checked: {format(service.lastChecked.toDate(), 'HH:mm:ss')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                        <Activity size={10} />
                        <span>Latency: {service.latency}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                  {service.message && (
                    <p className="text-xs text-zinc-500 mt-1">{service.message}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-zinc-900 rounded-2xl p-8 text-white flex items-center justify-between overflow-hidden relative group">
        <div className="relative z-10">
          <h3 className="text-2xl font-bold">Security & Compliance</h3>
          <p className="text-zinc-400 mt-2 max-w-md">
            All services are monitored 24/7 for security threats and compliance with international export regulations.
          </p>
          <div className="flex items-center gap-4 mt-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 text-xs font-bold uppercase tracking-wider">
              <Shield size={14} className="text-emerald-400" />
              <span>ISO 27001</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 text-xs font-bold uppercase tracking-wider">
              <Shield size={14} className="text-emerald-400" />
              <span>GDPR Compliant</span>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/20 to-transparent pointer-events-none" />
        <CheckCircle2 className="absolute -right-12 -bottom-12 text-white/5 w-64 h-64 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
      </div>
    </div>
  );
}
