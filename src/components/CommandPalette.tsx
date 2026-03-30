import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  LayoutDashboard, 
  Users, 
  Ship, 
  Package, 
  BarChart3, 
  Settings, 
  FileText, 
  Plus,
  X,
  Command as CommandIcon,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  path: string;
  category: 'Navigation' | 'Actions';
}

const COMMANDS: CommandItem[] = [
  { id: 'dash', title: 'Dashboard', description: 'Go to main overview', icon: LayoutDashboard, path: '/', category: 'Navigation' },
  { id: 'pipeline', title: 'Pipeline', description: 'View shipment Kanban board', icon: Ship, path: '/pipeline', category: 'Navigation' },
  { id: 'inventory', title: 'Inventory', description: 'Manage product stocks', icon: Package, path: '/inventory', category: 'Navigation' },
  { id: 'leads', title: 'Leads', description: 'View potential customers', icon: Users, path: '/leads', category: 'Navigation' },
  { id: 'analytics', title: 'Analytics', description: 'View predictive insights', icon: BarChart3, path: '/analytics', category: 'Navigation' },
  { id: 'docs', title: 'Documents', description: 'Manage export documentation', icon: FileText, path: '/documents', category: 'Navigation' },
  { id: 'settings', title: 'Settings', description: 'Manage app preferences', icon: Settings, path: '/settings', category: 'Navigation' },
  { id: 'new-order', title: 'New Order', description: 'Create a new export order', icon: Plus, path: '/orders', category: 'Actions' },
  { id: 'new-lead', title: 'New Lead', description: 'Add a new business lead', icon: Plus, path: '/leads', category: 'Actions' },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          navigate(filteredCommands[selectedIndex].path);
          setIsOpen(false);
        }
      }
    }
  }, [isOpen, filteredCommands, selectedIndex, navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-100">
              <Search className="text-zinc-400" size={20} />
              <input 
                autoFocus
                placeholder="Search commands, pages, or actions... (Ctrl+K)"
                className="flex-1 bg-transparent border-none outline-none text-zinc-900 placeholder:text-zinc-400"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-400">
                <CommandIcon size={10} />
                <span>K</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredCommands.length > 0 ? (
                <div className="space-y-4">
                  {['Navigation', 'Actions'].map(category => {
                    const catCmds = filteredCommands.filter(c => c.category === category);
                    if (catCmds.length === 0) return null;
                    
                    return (
                      <div key={category}>
                        <h4 className="px-3 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          {category}
                        </h4>
                        <div className="space-y-1">
                          {catCmds.map((cmd) => {
                            const globalIndex = filteredCommands.indexOf(cmd);
                            const isSelected = globalIndex === selectedIndex;
                            
                            return (
                              <button
                                key={cmd.id}
                                onClick={() => {
                                  navigate(cmd.path);
                                  setIsOpen(false);
                                }}
                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                                  isSelected ? 'bg-emerald-50 text-emerald-900' : 'text-zinc-600 hover:bg-zinc-50'
                                }`}
                              >
                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                                  <cmd.icon size={18} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-bold">{cmd.title}</p>
                                  <p className={`text-xs ${isSelected ? 'text-emerald-600/70' : 'text-zinc-400'}`}>
                                    {cmd.description}
                                  </p>
                                </div>
                                {isSelected && (
                                  <Zap size={14} className="text-emerald-400 animate-pulse" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-zinc-400 text-sm italic">No results found for "{query}"</p>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[10px] font-medium text-zinc-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border border-zinc-200 bg-white">↑↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border border-zinc-200 bg-white">Enter</kbd> Select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-zinc-200 bg-white">Esc</kbd> Close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
