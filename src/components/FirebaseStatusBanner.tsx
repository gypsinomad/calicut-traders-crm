import React, { useState, useEffect } from 'react';
import { ShieldAlert, Database, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToFirebaseStatus } from '../firebase';

export default function FirebaseStatusBanner() {
  const [error, setError] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToFirebaseStatus((err, readOnly) => {
      setError(err);
      setIsReadOnly(readOnly);
      if (err || readOnly) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    });
    return unsubscribe;
  }, []);

  if (!isVisible) return null;

  const isExpired = error?.toLowerCase().includes('expired') || error?.toLowerCase().includes('key');

  return (
    <AnimatePresence>
      <motion.div
        id="firebase-status-banner-container"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-amber-500/15 border-b border-amber-500/20 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg shrink-0">
              <ShieldAlert size={16} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <p className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                {isExpired ? 'Firebase Key Renewal Needed' : 'Read-only Fallback Mode'}
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                {isExpired 
                  ? 'The Firebase API key has expired. Please contact support to renew configuration settings. ' 
                  : 'Database offline or configuration issue encountered. '}
                The system has safely failed over to a <span className="font-bold inline-flex items-center gap-0.5"><Database size={10} className="inline ml-0.5" /> Read-Only Mode</span> so you can securely explore features, leads, documents and logistics pipelines.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="hide-firebase-banner-btn"
              onClick={() => setIsVisible(false)}
              className="p-1 text-amber-500/60 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
