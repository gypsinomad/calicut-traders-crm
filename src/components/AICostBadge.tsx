import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { getAIUsageSummary } from '../lib/aiUsageTracker';
import { useAuth } from './Auth';
import { motion, AnimatePresence } from 'motion/react';

export default function AICostBadge() {
  const { profile } = useAuth();
  const [totalCost, setTotalCost] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diff = midnight.getTime() - now.getTime();

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);

      return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0')
      ].join(':');
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!profile?.organization) return;

    const fetchCost = async () => {
      try {
        const summary = await getAIUsageSummary(profile.organization);
        setTotalCost(summary.totalCostINR);
      } catch (error) {
        console.error('Error fetching AI cost:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCost();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchCost, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [profile?.organization]);

  if (loading || totalCost === null || totalCost === 0) return null;

  return (
    <div className="hidden lg:flex items-center gap-3">
      {/* Quota Reset Badge */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 border border-zinc-200 rounded-full text-zinc-500" title="Time until daily quota reset (UTC)">
        <span className="text-[10px]">⏱</span>
        <span className="text-[10px] font-bold font-mono">{timeLeft}</span>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full group cursor-help relative"
        title="Estimated AI Usage Cost (INR)"
      >
        <div className="p-1 bg-emerald-100 text-emerald-600 rounded-full group-hover:animate-pulse">
          <Zap size={12} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-emerald-700 leading-none uppercase tracking-tighter">AI Cost</span>
          <span className="text-xs font-bold text-emerald-600 leading-none mt-0.5">₹{totalCost.toFixed(2)}</span>
        </div>
        
        {/* Tooltip on hover */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-3 bg-zinc-900 text-white rounded-xl text-[10px] leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl">
          <p className="font-bold mb-1 text-emerald-400">Gemini AI Usage</p>
          <p>Estimated cost for all AI-powered features in your organization. Refreshes every 5 minutes.</p>
          <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between">
            <span className="text-zinc-400 uppercase tracking-widest">Rate</span>
            <span className="text-emerald-400">1 USD = 83.5 INR</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
