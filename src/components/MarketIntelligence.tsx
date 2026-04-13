import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, RefreshCw, Lightbulb } from 'lucide-react';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';
import { motion } from 'motion/react';
import { agentService } from '../services/agentService';
import { useAuth } from './Auth';

interface Insight {
  commodity: string;
  trend: 'up' | 'down' | 'stable';
  summary: string;
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export default function MarketIntelligence() {
  const { profile } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const generateInsights = async () => {
    setLoading(true);

    if (!isAIAvailable()) {
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }

    try {
      if (profile?.organization) {
        await agentService.runMarketIntelligenceAgent(profile.organization);
      }
      
      const model = "gemini-3-flash-preview";
      const prompt = `Analyze the current global export market (specifically Black Pepper, Cardamom, Ginger, Turmeric, and Cloves) for March 2026. 
      Provide a JSON array of insights with the following structure:
      {
        "commodity": string,
        "trend": "up" | "down" | "stable",
        "summary": string (brief market summary),
        "recommendation": string (actionable advice for an exporter),
        "riskLevel": "low" | "medium" | "high"
      }
      Focus on supply chain disruptions, harvest reports in India and Vietnam, and demand trends in Europe and Middle East.`;

      const response = await generateAIContent('Market Intelligence', {
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '[]');
      setInsights(data);
      setLastUpdated(new Date());
    } catch (error: any) {
      const errorMessage = handleAIError(error);
      
      // If it's a quota or spending cap error, automatically trigger fallback
      if (errorMessage.toLowerCase().includes('quota') || 
          errorMessage.toLowerCase().includes('spending') ||
          errorMessage.toLowerCase().includes('429')) {
        console.warn("AI Quota exceeded, switching to Smart Mode fallback.");
        // Re-run the function, it will now hit the !isAIAvailable() check
        generateInsights();
        return;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateInsights();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900">
              {isAIAvailable() ? 'AI Market Intelligence' : 'Smart Market Intelligence'}
            </h3>
            <p className="text-xs text-zinc-500">Real-time global market analysis</p>
          </div>
        </div>
        <button 
          onClick={generateInsights}
          disabled={loading}
          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-6">
        {loading && insights.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-zinc-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={index}
                className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/30 hover:border-emerald-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900">{insight.commodity}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      insight.riskLevel === 'high' ? 'bg-rose-50 text-rose-600' :
                      insight.riskLevel === 'medium' ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {insight.riskLevel} Risk
                    </span>
                  </div>
                  {insight.trend === 'up' ? <TrendingUp size={16} className="text-emerald-500" /> :
                   insight.trend === 'down' ? <TrendingDown size={16} className="text-rose-500" /> :
                   <Minus size={16} className="text-zinc-400" />}
                </div>
                
                <p className="text-xs text-zinc-600 mb-3 line-clamp-2">
                  {insight.summary}
                </p>
                
                <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-zinc-100">
                  <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-zinc-700 italic">
                    {insight.recommendation}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {lastUpdated && (
          <p className="text-[10px] text-zinc-400 mt-6 text-center">
            Last {isAIAvailable() ? 'AI' : 'Smart'} analysis: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
