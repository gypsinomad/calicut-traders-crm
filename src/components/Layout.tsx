import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.tsx';
import ComplianceAssistant from './ComplianceAssistant.tsx';
import NotificationCenter from './NotificationCenter.tsx';
import { Search, User, LogOut, Ship, Users, Building2, X, Menu, Sun, Moon } from 'lucide-react';
import { useAuth } from './Auth.tsx';
import { subscribeToCollection } from '../services/db';
import { Lead, ExportOrder, Supplier } from '../lib/types';
import { motion, AnimatePresence } from 'motion/react';

import { useTranslation } from '../contexts/LanguageContext.tsx';
import { TranslatedText } from './TranslatedText.tsx';
import AICostBadge from './AICostBadge.tsx';
import AIStatusBanner from './AIStatusBanner.tsx';

export default function Layout() {
  const { profile, logout } = useAuth();
  const { isRTL } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<{ leads: Lead[], orders: ExportOrder[], suppliers: Supplier[] }>({ leads: [], orders: [], suppliers: [] });
  const [showResults, setShowResults] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allOrders, setAllOrders] = useState<ExportOrder[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    if (!profile?.organization) return;
    const filter = [{ field: 'organization', operator: '==', value: profile.organization }];

    const unsubLeads = subscribeToCollection<Lead>('leads', setAllLeads, filter);
    const unsubOrders = subscribeToCollection<ExportOrder>('orders', setAllOrders, filter);
    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', setAllSuppliers, filter);

    return () => {
      unsubLeads();
      unsubOrders();
      unsubSuppliers();
    };
  }, [profile]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults({ leads: [], orders: [], suppliers: [] });
      setShowResults(false);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filteredLeads = allLeads.filter(l => l.fullName.toLowerCase().includes(term) || l.companyName.toLowerCase().includes(term)).slice(0, 3);
    const filteredOrders = allOrders.filter(o => o.orderNumber.toLowerCase().includes(term) || o.customerName.toLowerCase().includes(term)).slice(0, 3);
    const filteredSuppliers = allSuppliers.filter(s => s.name.toLowerCase().includes(term)).slice(0, 3);

    setResults({ leads: filteredLeads, orders: filteredOrders, suppliers: filteredSuppliers });
    setShowResults(true);
  }, [searchTerm, allLeads, allOrders, allSuppliers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex h-screen bg-[#fcfaf7] overflow-hidden ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 w-full">
        <AIStatusBanner />
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-zinc-200/50 flex items-center justify-between px-6 md:px-10 shrink-0 z-10">
          <div className="flex items-center gap-6 flex-1 max-w-2xl">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 text-zinc-500 hover:bg-zinc-100 rounded-xl md:hidden transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block relative w-full group" ref={searchRef}>
              <Search className={`${isRTL ? 'right-4' : 'left-4'} absolute top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#064e3b] transition-colors`} size={18} />
              <input 
                type="text" 
                placeholder="Search leads, orders, or suppliers..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.trim() && setShowResults(true)}
                className={`w-full ${isRTL ? 'pr-12 pl-6' : 'pl-12 pr-6'} py-3 bg-zinc-100/50 border border-transparent rounded-2xl text-sm focus:outline-none focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all`}
              />
              
              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden z-50"
                  >
                    <div className="max-h-[400px] overflow-y-auto p-2">
                      {results.leads.length > 0 && (
                        <div className="mb-2">
                          <p className="px-3 py-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Leads</p>
                          {results.leads.map(lead => (
                            <button
                              key={lead.id}
                              onClick={() => { navigate('/leads'); setSearchTerm(''); setShowResults(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 rounded-xl transition-colors text-left"
                            >
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Users size={14} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{lead.fullName}</p>
                                <p className="text-[10px] text-zinc-500">{lead.companyName}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {results.orders.length > 0 && (
                        <div className="mb-2">
                          <p className="px-3 py-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Orders</p>
                          {results.orders.map(order => (
                            <button
                              key={order.id}
                              onClick={() => { navigate('/orders'); setSearchTerm(''); setShowResults(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 rounded-xl transition-colors text-left"
                            >
                              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <Ship size={14} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{order.orderNumber}</p>
                                <p className="text-[10px] text-zinc-500">{order.customerName}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {results.suppliers.length > 0 && (
                        <div className="mb-2">
                          <p className="px-3 py-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Suppliers</p>
                          {results.suppliers.map(supplier => (
                            <button
                              key={supplier.id}
                              onClick={() => { navigate('/suppliers'); setSearchTerm(''); setShowResults(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 rounded-xl transition-colors text-left"
                            >
                              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                <Building2 size={14} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{supplier.name}</p>
                                <p className="text-[10px] text-zinc-500">{supplier.category}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {results.leads.length === 0 && results.orders.length === 0 && results.suppliers.length === 0 && (
                        <div className="p-8 text-center">
                          <p className="text-sm text-zinc-400 font-bold">No results found for "{searchTerm}"</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />}
            </button>
            <div className="sm:hidden">
              <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg">
                <Search size={20} />
              </button>
            </div>
            <NotificationCenter />
            <AICostBadge />
            <div className="h-8 w-[1px] bg-zinc-200 mx-1 md:mx-2" />
            <div className="flex items-center gap-2 md:gap-3 pl-2 group relative">
              <div className={`${isRTL ? 'text-left' : 'text-right'} hidden sm:block`}>
                <p className="text-sm font-bold text-zinc-900">{profile?.displayName || 'User'}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{profile?.role || 'Member'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 overflow-hidden">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={20} />
                )}
              </div>
              
              {/* Dropdown for logout */}
              <div className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50`}>
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut size={16} />
                  <TranslatedText>Sign Out</TranslatedText>
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <ComplianceAssistant />
    </div>
  );
}
