import React, { useState, useEffect } from 'react';
import { AlertTriangle, Zap, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToAIStatus, clearAIError, getLastAIError } from '../lib/ai';

export default function AIStatusBanner() {
  const [error, setError] = useState<string | null>(getLastAIError());
  const [isVisible, setIsVisible] = useState(!!error);

  useEffect(() => {
    const unsubscribe = subscribeToAIStatus((newError) => {
      setError(newError);
      if (newError) setIsVisible(true);
    });
    return unsubscribe;
  }, []);

  if (!isVisible || !error) return null;

  const isQuotaError = error.toLowerCase().includes('quota') || 
                       error.toLowerCase().includes('429') || 
                       error.toLowerCase().includes('spending') ||
                       error.toLowerCase().includes('resource_exhausted');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-amber-50 border-b border-amber-100 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0">
              <AlertTriangle size={16} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <p className="text-xs font-medium text-amber-900">
                {isQuotaError ? 'AI Quota Reached' : 'AI Service Issue'}
              </p>
              <p className="text-[11px] text-amber-700">
                The app has automatically switched to <span className="font-bold flex inline-items items-center gap-0.5"><Zap size={10} className="inline" /> Smart Mode</span> (rule-based logic) to ensure uninterrupted service.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                clearAIError();
                window.location.reload();
              }}
              className="px-3 py-1 bg-white border border-amber-200 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-100 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={10} />
              Retry AI
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 text-amber-400 hover:text-amber-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
