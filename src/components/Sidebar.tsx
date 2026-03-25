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
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Leads', path: '/leads' },
  { icon: FileSearch, label: 'Quotations', path: '/quotes' },
  { icon: Ship, label: 'Export Orders', path: '/orders' },
  { icon: Kanban, label: 'Pipeline', path: '/pipeline' },
  { icon: Truck, label: 'Execution', path: '/execution' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: TrendingUp, label: 'Market Oracle', path: '/market' },
  { icon: UserCircle, label: 'Suppliers', path: '/suppliers' },
  { icon: DollarSign, label: 'Payments', path: '/payments' },
  { icon: AlertTriangle, label: 'Exceptions', path: '/exceptions' },
  { icon: PieChart, label: 'Analytics', path: '/analytics' },
  { icon: ScanLine, label: 'Smart Scanner', path: '/scanner' },
  { icon: Shield, label: 'Document Vault', path: '/documents' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  { icon: Building2, label: 'Companies', path: '/companies' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: FileCheck, label: 'Export Docs', path: '/documents-manager' },
  { icon: LayoutGrid, label: 'Buyer Pipeline', path: '/buyer-pipeline' },
  { icon: Navigation, label: 'Shipment Tracker', path: '/shipment-tracker' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: MessageSquare, label: 'Collaboration', path: '/collaboration' },
  { icon: UserCircle, label: 'Customer Portal', path: '/portal' },
  { icon: Activity, label: 'Audit Trail', path: '/audit' },
  { icon: Activity, label: 'System Health', path: '/health' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

import { useTranslation } from '../contexts/LanguageContext.tsx';
import { TranslatedText } from './TranslatedText.tsx';

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
  const { isRTL } = useTranslation();

  return (
    <div className={cn(
      "flex flex-col h-full bg-[#064e3b] text-emerald-100/70 w-64 border-emerald-900/50 transition-transform duration-300 z-50",
      isRTL ? 'border-l' : 'border-r',
      "fixed md:static inset-y-0",
      isRTL ? (isOpen ? "translate-x-0" : "translate-x-full") : (isOpen ? "translate-x-0" : "-translate-x-full"),
      "md:translate-x-0"
    )}>
      <div className="p-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
            <Ship className="text-[#d97706]" />
            <TranslatedText>Calicut Spices</TranslatedText>
          </h1>
          <TranslatedText as="p" className="text-[10px] font-medium text-emerald-300/50 uppercase tracking-[0.2em] mt-1">Export Management</TranslatedText>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-emerald-300/50 hover:bg-emerald-900 rounded-lg md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              if (window.innerWidth < 768 && onClose) {
                onClose();
              }
            }}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group",
              isActive 
                ? "bg-white/10 text-white shadow-sm" 
                : "hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon size={18} className={cn(
              "transition-colors",
              "group-hover:text-[#d97706]"
            )} />
            <TranslatedText as="span" className="text-sm font-medium tracking-tight">{item.label}</TranslatedText>
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-emerald-900/50 space-y-4">
        <div className="flex items-center gap-2 px-4 py-3 bg-black/20 rounded-2xl border border-white/5 text-[10px] font-medium text-emerald-300/40">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-black/40">
            <Command size={10} />
            <span>K</span>
          </div>
          <TranslatedText as="span">Quick Search</TranslatedText>
        </div>
      </div>
    </div>
  );
}
