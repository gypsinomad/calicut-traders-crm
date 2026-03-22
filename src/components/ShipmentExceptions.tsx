import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ShipmentException } from '../lib/types';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, Search, Filter, MessageSquare, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { TranslatedText } from './TranslatedText';

export default function ShipmentExceptions() {
  const [exceptions, setExceptions] = useState<ShipmentException[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'shipment_exceptions'),
      orderBy('reportedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShipmentException[];
      setExceptions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const resolveException = async (id: string) => {
    try {
      await updateDoc(doc(db, 'shipment_exceptions', id), {
        status: 'resolved',
        resolvedAt: serverTimestamp()
      });
      alert('Exception marked as resolved!');
    } catch (error) {
      console.error("Error resolving exception:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'high': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'medium': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'investigating': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-rose-50 text-rose-700 border-rose-100';
    }
  };

  const filteredExceptions = exceptions.filter(ex => 
    ex.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">
            <TranslatedText>Exception Management</TranslatedText>
          </h2>
          <p className="text-zinc-500 mt-1">
            <TranslatedText>Track and resolve shipment delays, damages, and customs issues</TranslatedText>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm font-bold border border-rose-100 shadow-sm">
            <ShieldAlert size={16} />
            <span>{exceptions.filter(ex => ex.status === 'open').length} <TranslatedText>Open Exceptions</TranslatedText></span>
          </div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search exceptions..." 
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

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">Loading exceptions...</p>
          </div>
        ) : filteredExceptions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
            <ShieldCheck size={48} className="text-emerald-100 mx-auto mb-4" />
            <p className="text-zinc-400">No active exceptions found</p>
          </div>
        ) : (
          filteredExceptions.map((ex) => (
            <div key={ex.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                ex.severity === 'critical' ? 'bg-rose-500' :
                ex.severity === 'high' ? 'bg-amber-500' :
                'bg-blue-500'
              }`} />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${getSeverityColor(ex.severity)}`}>
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-zinc-900">{ex.orderId}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getSeverityColor(ex.severity)}`}>
                        {ex.severity}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(ex.status)}`}>
                        {ex.status}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 mt-1 font-medium capitalize">{ex.type.replace(/([A-Z])/g, ' $1')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block mr-4">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Reported</p>
                    <p className="text-xs font-bold text-zinc-900">
                      {ex.reportedAt ? format(ex.reportedAt.toDate(), 'MMM dd, HH:mm') : 'N/A'}
                    </p>
                  </div>
                  {ex.status !== 'resolved' && (
                    <button 
                      onClick={() => resolveException(ex.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <CheckCircle2 size={18} />
                      <TranslatedText>Resolve</TranslatedText>
                    </button>
                  )}
                  <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all">
                    <MessageSquare size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-sm text-zinc-700 leading-relaxed">
                  {ex.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    <span>Reported by: {ex.reportedBy}</span>
                  </div>
                  {ex.resolvedAt && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 size={10} />
                      <span>Resolved: {format(ex.resolvedAt.toDate(), 'MMM dd, HH:mm')}</span>
                    </div>
                  )}
                </div>
                <button className="flex items-center gap-1 text-zinc-900 hover:underline">
                  <span>View Order Details</span>
                  <ArrowRight size={10} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
