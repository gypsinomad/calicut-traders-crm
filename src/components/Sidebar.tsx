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
  Scan,
  Kanban,
  Command,
  Shield,
  Activity,
  DollarSign,
  AlertTriangle,
  FileSearch,
  UserCircle,
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
  { icon: Scan, label: 'Mobile Scanner', path: '/scanner' },
  { icon: Shield, label: 'Document Vault', path: '/documents' },
  { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  { icon: Building2, label: 'Companies', path: '/companies' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
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
      "flex flex-col h-full bg-zinc-950 text-zinc-400 w-64 border-zinc-800 transition-transform duration-300 z-50",
      isRTL ? 'border-l' : 'border-r',
      "fixed md:static inset-y-0",
      isRTL ? (isOpen ? "translate-x-0" : "translate-x-full") : (isOpen ? "translate-x-0" : "-translate-x-full"),
      "md:translate-x-0"
    )}>
      <div className="p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Ship className="text-emerald-500" />
            <TranslatedText>Calicut Spices</TranslatedText>
          </h1>
          <TranslatedText as="p" className="text-xs text-zinc-500 mt-1">Export Management System</TranslatedText>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-zinc-500 hover:bg-zinc-900 rounded-lg md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
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
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              isActive 
                ? "bg-emerald-500/10 text-emerald-500" 
                : "hover:bg-zinc-900 hover:text-white"
            )}
          >
            <item.icon size={20} />
            <TranslatedText as="span" className="text-sm font-medium">{item.label}</TranslatedText>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 rounded-lg border border-zinc-800 text-[10px] font-medium text-zinc-500">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900">
            <Command size={10} />
            <span>K</span>
          </div>
          <TranslatedText as="span">Quick Search</TranslatedText>
        </div>
        <button className="flex items-center gap-3 px-3 py-2 w-full text-zinc-400 hover:text-white transition-colors">
          <LogOut size={20} />
          <TranslatedText as="span" className="text-sm font-medium">Logout</TranslatedText>
        </button>
      </div>
    </div>
  );
}
