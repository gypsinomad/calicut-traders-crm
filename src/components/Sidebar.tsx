import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Ship, 
  FileText, 
  CheckSquare, 
  Building2, 
  Settings, 
  BarChart3,
  LogOut,
  Package,
  TrendingUp,
  Truck,
  PieChart,
  ScanLine,
  Kanban,
  Command,
  Zap,
  Shield,
  Activity,
  DollarSign,
  AlertTriangle,
  FileSearch,
  UserCircle,
  Calendar,
  MessageSquare,
  FileCheck,
  LayoutGrid,
  Navigation,
  Mail,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { APP_NAME, ROUTES, UserRole, UserStatus } from '../lib/constants';
import { useTranslation } from '../contexts/LanguageContext.tsx';
import { TranslatedText } from './TranslatedText.tsx';
import { useAuth } from './Auth.tsx';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const navSections = [
  {
    label: 'Sales & CRM',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: ROUTES.DASHBOARD },
      { icon: Users, label: 'Leads', path: ROUTES.LEADS },
      { icon: FileSearch, label: 'Prospecting', path: ROUTES.PROSPECTING },
      { icon: Zap, label: 'Signals', path: ROUTES.SIGNALS },
      { icon: FileText, label: 'Quotations', path: ROUTES.QUOTES },
      { icon: Kanban, label: 'Pipeline', path: ROUTES.PIPELINE },
      { icon: LayoutGrid, label: 'Buyer Pipeline', path: ROUTES.BUYER_PIPELINE },
      { icon: Building2, label: 'Companies', path: ROUTES.COMPANIES },
    ]
  },
  {
    label: 'Operations',
    items: [
      { icon: Ship, label: 'Export Orders', path: ROUTES.ORDERS },
      { icon: Truck, label: 'Execution', path: ROUTES.EXECUTION },
      { icon: Navigation, label: 'Shipment Tracker', path: ROUTES.TRACKER },
      { icon: Package, label: 'Inventory', path: ROUTES.INVENTORY },
      { icon: UserCircle, label: 'Procurement', path: ROUTES.PROCUREMENT },
      { icon: UserCircle, label: 'Suppliers', path: ROUTES.SUPPLIERS },
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { icon: TrendingUp, label: 'Market Oracle', path: ROUTES.MARKET },
      { icon: PieChart, label: 'Analytics', path: ROUTES.ANALYTICS },
      { icon: BarChart3, label: 'Reports', path: ROUTES.REPORTS },
      { icon: ScanLine, label: 'Smart Scanner', path: ROUTES.SCANNER },
    ]
  },
  {
    label: 'Communication',
    items: [
      { icon: Mail, label: 'Communications', path: ROUTES.COMMUNICATIONS },
      { icon: MessageSquare, label: 'Collaboration', path: ROUTES.COLLABORATION },
      { icon: Calendar, label: 'Calendar', path: ROUTES.CALENDAR },
      { icon: CheckSquare, label: 'Tasks', path: ROUTES.TASKS },
      { icon: Activity, label: 'Workflows', path: ROUTES.WORKFLOWS },
    ]
  },
  {
    label: 'System',
    items: [
      { icon: DollarSign, label: 'Finance', path: ROUTES.FINANCE },
      { icon: DollarSign, label: 'Payments', path: ROUTES.PAYMENTS },
      { icon: AlertTriangle, label: 'Exceptions', path: ROUTES.EXCEPTIONS },
      { icon: Shield, label: 'Document Vault', path: ROUTES.DOCUMENTS },
      { icon: FileCheck, label: 'Export Docs', path: ROUTES.DOC_MANAGER },
      { icon: Users, label: 'User Management', path: ROUTES.USERS },
      { icon: Activity, label: 'Audit Trail', path: ROUTES.AUDIT },
      { icon: Activity, label: 'System Health', path: ROUTES.HEALTH },
      { icon: Settings, label: 'Settings', path: ROUTES.SETTINGS },
    ]
  }
];

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const { isRTL } = useTranslation();
  const { profile, logout } = useAuth();
  const [unreadMessagesCount, setUnreadMessagesCount] = React.useState(0);
  const [pendingUsersCount, setPendingUsersCount] = React.useState(0);

  React.useEffect(() => {
    if (!profile?.organization) return;

    const q = query(
      collection(db, 'messages'),
      where('organization', '==', profile.organization),
      where('status', '==', 'unread')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadMessagesCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching unread messages count:", error);
    });

    return () => unsubscribe();
  }, [profile?.organization]);

  React.useEffect(() => {
    if (profile?.role !== 'admin' || !profile?.organization) return;

    const q = query(
      collection(db, 'users'),
      where('organization', '==', profile.organization),
      where('status', '==', UserStatus.PENDING)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingUsersCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching pending users count:", error);
    });

    return () => unsubscribe();
  }, [profile?.role, profile?.organization]);

  const isItemVisible = (path: string) => {
    if (path === ROUTES.USERS) return profile?.role === UserRole.ADMIN;
    if (path === ROUTES.AUDIT || path === ROUTES.HEALTH) return profile?.role === UserRole.ADMIN;
    return true;
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-[#064e3b] dark:bg-zinc-950 text-emerald-100/70 dark:text-zinc-400 w-64 border-emerald-900/50 dark:border-zinc-800 transition-transform duration-300 z-50",
      isRTL ? 'border-l' : 'border-r',
      "fixed md:static inset-y-0",
      isRTL ? (isOpen ? "translate-x-0" : "translate-x-full") : (isOpen ? "translate-x-0" : "-translate-x-full"),
      "md:translate-x-0"
    )}>
      <div className="p-8 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white dark:text-zinc-100 flex items-center gap-2">
            <Ship className="text-[#d97706] dark:text-amber-500" />
            <TranslatedText>{APP_NAME}</TranslatedText>
          </h1>
          <TranslatedText as="p" className="text-[10px] font-medium text-emerald-300/50 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">Trade Management</TranslatedText>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-emerald-300/50 dark:text-zinc-500 hover:bg-emerald-900 dark:hover:bg-zinc-900 rounded-lg md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar pb-8">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-1">
            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/30 dark:text-zinc-600 mb-2">
              <TranslatedText>{section.label}</TranslatedText>
            </h3>
            {section.items.filter(item => isItemVisible(item.path)).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768 && onClose) {
                    onClose();
                  }
                }}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-white/10 dark:bg-zinc-800 text-white dark:text-zinc-100 shadow-sm" 
                    : "hover:bg-white/5 dark:hover:bg-zinc-900 hover:text-white dark:hover:text-zinc-200"
                )}
              >
                <item.icon size={16} className={cn(
                  "transition-colors",
                  "group-hover:text-[#d97706] dark:group-hover:text-amber-500"
                )} />
                <TranslatedText as="span" className="text-xs font-medium tracking-tight flex-1">{item.label}</TranslatedText>
                {item.path === ROUTES.COMMUNICATIONS && unreadMessagesCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#d97706] dark:bg-amber-600 text-white text-[10px] font-bold">
                    {unreadMessagesCount}
                  </span>
                )}
                {item.path === ROUTES.USERS && pendingUsersCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 dark:bg-amber-600 text-white text-[10px] font-bold animate-pulse">
                    {pendingUsersCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-emerald-900/50 dark:border-zinc-800 space-y-4">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-100/50 hover:text-white hover:bg-white/5 rounded-xl transition-all"
        >
          <LogOut size={18} />
          <TranslatedText>Sign Out</TranslatedText>
        </button>
        <div className="flex items-center gap-2 px-4 py-3 bg-black/20 dark:bg-zinc-900 rounded-2xl border border-white/5 dark:border-zinc-800 text-[10px] font-medium text-emerald-300/40 dark:text-zinc-500">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 dark:border-zinc-800 bg-black/40 dark:bg-zinc-950">
            <Command size={10} />
            <span>K</span>
          </div>
          <TranslatedText as="span">Quick Search</TranslatedText>
        </div>
      </div>
    </div>
  );
}
