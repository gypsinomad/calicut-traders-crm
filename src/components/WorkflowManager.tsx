import React, { useState } from 'react';
import { 
  Activity, 
  Plus, 
  Search, 
  Filter, 
  Settings, 
  Play, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Zap,
  MoreVertical,
  ChevronRight,
  Ship,
  FileText,
  Truck,
  ShieldCheck,
  DollarSign,
  Users,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: {
    id: string;
    label: string;
    icon: any;
    status: 'pending' | 'active' | 'completed';
    assignee?: string;
  }[];
  status: 'active' | 'paused' | 'draft';
  lastRun?: string;
  successRate: number;
}

const defaultWorkflows: Workflow[] = [
  {
    id: 'wf-1',
    name: 'New Export Inquiry → Shipment',
    description: 'Standard workflow for processing new international spice inquiries through to shipment.',
    trigger: 'New Lead Created',
    status: 'active',
    successRate: 94,
    lastRun: '2 hours ago',
    steps: [
      { id: 's1', label: 'Inquiry Qualification', icon: Users, status: 'completed' },
      { id: 's2', label: 'Quotation Generation', icon: FileText, status: 'active' },
      { id: 's3', label: 'Document Preparation', icon: ShieldCheck, status: 'pending' },
      { id: 's4', label: 'Quality Inspection', icon: Activity, status: 'pending' },
      { id: 's5', label: 'Shipment Booking', icon: Ship, status: 'pending' },
    ]
  },
  {
    id: 'wf-2',
    name: 'Payment Follow-up Sequence',
    description: 'Automated reminders and escalations for outstanding export payments.',
    trigger: 'Invoice Overdue',
    status: 'active',
    successRate: 88,
    lastRun: '5 hours ago',
    steps: [
      { id: 's1', label: 'Soft Reminder (Email)', icon: Zap, status: 'completed' },
      { id: 's2', label: 'WhatsApp Notification', icon: Zap, status: 'completed' },
      { id: 's3', label: 'Manager Escalation', icon: Users, status: 'active' },
      { id: 's4', label: 'Legal Notice Draft', icon: FileText, status: 'pending' },
    ]
  },
  {
    id: 'wf-3',
    name: 'Supplier Procurement Flow',
    description: 'Sourcing spices from local farmers and processing for export.',
    trigger: 'Inventory Below Threshold',
    status: 'paused',
    successRate: 91,
    lastRun: '1 day ago',
    steps: [
      { id: 's1', label: 'Supplier Notification', icon: Users, status: 'completed' },
      { id: 's2', label: 'Sample Testing', icon: Activity, status: 'completed' },
      { id: 's3', label: 'Purchase Order', icon: DollarSign, status: 'completed' },
      { id: 's4', label: 'Inbound Logistics', icon: Truck, status: 'active' },
    ]
  }
];

export default function WorkflowManager() {
  const [workflows, setWorkflows] = useState<Workflow[]>(defaultWorkflows);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredWorkflows = workflows.filter(wf => 
    wf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wf.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">Export Workflows</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-lg font-serif italic">Automate your export operations from inquiry to final delivery.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2">
            <Settings size={18} />
            Global Settings
          </button>
          <button className="px-8 py-3 bg-[#064e3b] dark:bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] dark:hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-2">
            <Plus size={18} />
            Create Workflow
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {filteredWorkflows.map((wf) => (
          <div key={wf.id} className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800 shadow-sm overflow-hidden group">
            <div className="p-8 md:p-10 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${wf.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'}`}>
                      <Zap size={20} className={wf.status === 'active' ? 'fill-current' : ''} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-[#064e3b] dark:group-hover:text-emerald-400 transition-colors">{wf.name}</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{wf.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-6 mt-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Trigger:</span>
                      <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold rounded-lg border border-zinc-200 dark:border-zinc-700">{wf.trigger}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Success Rate:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${wf.successRate}%` }} />
                        </div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{wf.successRate}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Last Run:</span>
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{wf.lastRun}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-2">
                    <Play size={16} />
                    Run Now
                  </button>
                  <button className="p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-all">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-8 md:p-10 bg-zinc-50/50 dark:bg-zinc-800/30">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {wf.steps.map((step, i) => (
                  <React.Fragment key={step.id}>
                    <div className="flex-1 flex flex-col items-center text-center gap-4 relative">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${
                        step.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' :
                        step.status === 'active' ? 'bg-white border-emerald-500 text-emerald-600 dark:bg-zinc-900 dark:border-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-900/10' :
                        'bg-white border-zinc-200 text-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-700'
                      }`}>
                        <step.icon size={24} />
                        {step.status === 'completed' && (
                          <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-2 border-white dark:border-zinc-900">
                            <CheckCircle2 size={12} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-widest ${step.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-600'}`}>{step.label}</p>
                        <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mt-1">{step.status}</p>
                      </div>
                    </div>
                    {i < wf.steps.length - 1 && (
                      <div className="hidden md:block text-zinc-200 dark:text-zinc-800">
                        <ChevronRight size={24} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
