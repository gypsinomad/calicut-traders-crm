import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.tsx';
import ComplianceAssistant from './ComplianceAssistant.tsx';
import NotificationCenter from './NotificationCenter.tsx';
import CommandPalette from './CommandPalette.tsx';
import { Search, User, LogOut, Ship, Users, Building2, X, Menu, Sun, Moon, Download } from 'lucide-react';
import { useAuth } from './Auth.tsx';
import { subscribeToCollection } from '../services/db';
import { Lead, ExportOrder, Supplier } from '../lib/types';
import { motion, AnimatePresence } from 'motion/react';

import { useTranslation } from '../contexts/LanguageContext.tsx';
import { TranslatedText } from './TranslatedText.tsx';
import AICostBadge from './AICostBadge.tsx';
import AIStatusBanner from './AIStatusBanner.tsx';
import { updatePresence } from '../services/presenceService';
import { UserPresenceStatus } from '../lib/types';

import { useTheme } from '../contexts/ThemeContext.tsx';

export default function Layout() {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isRTL } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<{ leads: Lead[], orders: ExportOrder[], suppliers: Supplier[] }>({ leads: [], orders: [], suppliers: [] });
  const [showResults, setShowResults] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handlePresenceChange = async (status: UserPresenceStatus) => {
    if (profile) {
      await updatePresence(profile.uid, status, status !== 'offline');
    }
  };

  const getPresenceColor = (status: UserPresenceStatus) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'away': return 'bg-amber-500';
      case 'dnd': return 'bg-rose-500';
      case 'offline': return 'bg-zinc-300';
      default: return 'bg-zinc-300';
    }
  };

  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allOrders, setAllOrders] = useState<ExportOrder[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    if (!profile?.organization) return;
    const filter: any[] = [{ field: 'organization', operator: '==', value: profile.organization }];

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

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex h-screen bg-[#fcfaf7] dark:bg-zinc-950 overflow-hidden ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
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
        <header className="h-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between px-6 md:px-10 shrink-0 z-10">
          <div className="flex items-center gap-6 flex-1 max-w-2xl">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl md:hidden transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block relative w-full group" ref={searchRef}>
              <Search className={`${isRTL ? 'right-4' : 'left-4'} absolute top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#064e3b] dark:group-focus-within:text-emerald-400 transition-colors`} size={18} />
              <input 
                type="text" 
                placeholder="Search leads, orders, or suppliers... (Ctrl+K)" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.trim() && setShowResults(true)}
                className={`w-full ${isRTL ? 'pr-12 pl-6' : 'pl-12 pr-6'} py-3 bg-zinc-100/50 dark:bg-zinc-800/50 border border-transparent rounded-2xl text-sm dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-emerald-200 dark:focus:border-emerald-800 focus:ring-4 focus:ring-emerald-500/5 transition-all`}
              />
              
              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-50"
                  >
                    <div className="max-h-[400px] overflow-y-auto p-2">
                      {results.leads.length > 0 && (
                        <div className="mb-2">
                          <p className="px-3 py-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Leads</p>
                          {results.leads.map(lead => (
                            <button
                              key={lead.id}
                              onClick={() => { navigate('/leads'); setSearchTerm(''); setShowResults(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
                            >
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                <Users size={14} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{lead.fullName}</p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{lead.companyName}</p>
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
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
                            >
                              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                <Ship size={14} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{order.orderNumber}</p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{order.customerName}</p>
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
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
                            >
                              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                                <Building2 size={14} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{supplier.name}</p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{supplier.category}</p>
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
              onClick={toggleTheme}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />}
            </button>
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-2 md:px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
              >
                <Download size={16} />
                <span className="hidden md:inline">Install App</span>
              </button>
            )}
            <div className="sm:hidden">
              <button className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <Search size={20} />
              </button>
            </div>
            <NotificationCenter />
            <AICostBadge />
            <div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1 md:mx-2" />
              <div className="flex items-center gap-2 md:gap-3 pl-2 relative" ref={profileRef}>
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 md:gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 p-1 rounded-xl transition-colors"
                >
                  <div className={`${isRTL ? 'text-left' : 'text-right'} hidden sm:block`}>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{profile?.displayName || 'User'}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">{profile?.role || 'Member'}</p>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 overflow-hidden">
                      {profile?.photoURL || profile?.avatarUrl ? (
                        <img src={profile.photoURL || profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${getPresenceColor(profile?.presenceStatus || 'offline')}`} />
                  </div>
                </button>
                
                {/* Dropdown for profile and status */}
                <AnimatePresence>
                  {showProfileDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute top-full ${isRTL ? 'left-0' : 'right-0'} mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 py-3 z-50`}
                    >
                      <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Set Status</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'online', label: 'Online', color: 'bg-emerald-500' },
                            { id: 'away', label: 'Away', color: 'bg-amber-500' },
                            { id: 'dnd', label: 'DND', color: 'bg-rose-500' },
                            { id: 'offline', label: 'Offline', color: 'bg-zinc-300' }
                          ].map((s) => (
                            <button
                              key={s.id}
                              onClick={() => {
                                handlePresenceChange(s.id as UserPresenceStatus);
                                setShowProfileDropdown(false);
                              }}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                                profile?.presenceStatus === s.id 
                                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${s.color}`} />
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          logout();
                          setShowProfileDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors font-bold"
                      >
                        <LogOut size={16} />
                        <TranslatedText>Sign Out</TranslatedText>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
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
      <CommandPalette />
    </div>
  );
}
