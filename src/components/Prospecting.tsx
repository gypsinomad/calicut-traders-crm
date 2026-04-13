import React, { useState } from 'react';
import { Search, Globe, Mail, Phone, Building2, Sparkles, Filter, Download, Plus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Prospect {
  id: string;
  company: string;
  country: string;
  industry: string;
  website: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status: 'new' | 'enriched' | 'outreached';
  score: number;
}

export default function Prospecting() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find 5 potential spice and food importers in ${searchTerm}. Return as a JSON array of objects with fields: company, country, industry, website, score (0-100).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                company: { type: Type.STRING },
                country: { type: Type.STRING },
                industry: { type: Type.STRING },
                website: { type: Type.STRING },
                score: { type: Type.NUMBER }
              },
              required: ["company", "country", "industry", "website", "score"]
            }
          }
        }
      });

      const results = JSON.parse(response.text || '[]');
      setProspects(results.map((r: any, i: number) => ({
        ...r,
        id: `p-${Date.now()}-${i}`,
        status: 'new'
      })));
      toast.success(`Found ${results.length} potential leads in ${searchTerm}`);
    } catch (error) {
      console.error("Error prospecting:", error);
      toast.error("Failed to find leads. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const enrichProspect = async (id: string) => {
    const prospect = prospects.find(p => p.id === id);
    if (!prospect) return;

    setEnrichingId(id);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find verified contact information for ${prospect.company} (${prospect.website}). Return as JSON with fields: contactName, email, phone.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              contactName: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING }
            }
          }
        }
      });

      const enrichment = JSON.parse(response.text || '{}');
      setProspects(prev => prev.map(p => 
        p.id === id ? { ...p, ...enrichment, status: 'enriched' } : p
      ));
      toast.success(`Enriched ${prospect.company} with contact data`);
    } catch (error) {
      console.error("Error enriching:", error);
      toast.error("Failed to enrich lead.");
    } finally {
      setEnrichingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">Global Prospecting</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-lg font-serif italic">Find and enrich international leads using AI intelligence.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2">
            <Download size={18} />
            Bulk Upload CSV
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by market (e.g., 'Spice importers in Germany' or 'Food distributors in UAE')..."
              className="w-full pl-12 pr-4 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none dark:text-white"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-[#064e3b] dark:bg-emerald-600 text-white rounded-2xl font-bold hover:bg-[#065f46] dark:hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            Find Leads
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {prospects.map((prospect) => (
            <motion.div
              key={prospect.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{prospect.company}</h3>
                      <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                        {prospect.country}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{prospect.industry}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <a href={`https://${prospect.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                        <Globe size={14} />
                        {prospect.website}
                      </a>
                      {prospect.email && (
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <Mail size={14} />
                          {prospect.email}
                        </span>
                      )}
                      {prospect.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <Phone size={14} />
                          {prospect.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right mr-4">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Match Score</p>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${prospect.score}%` }} />
                      </div>
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">{prospect.score}%</span>
                    </div>
                  </div>

                  {prospect.status === 'new' ? (
                    <button 
                      onClick={() => enrichProspect(prospect.id)}
                      disabled={enrichingId === prospect.id}
                      className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-2"
                    >
                      {enrichingId === prospect.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      Enrich Lead
                    </button>
                  ) : (
                    <button className="px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold border border-emerald-100 dark:border-emerald-800 flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      Lead Enriched
                    </button>
                  )}
                  
                  <button className="p-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {prospects.length === 0 && !loading && (
          <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Globe className="text-zinc-300" size={40} />
            </div>
            <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-white">Start Your Global Search</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto">Enter a market or product category above to find international spice and food importers.</p>
          </div>
        )}
      </div>
    </div>
  );
}
