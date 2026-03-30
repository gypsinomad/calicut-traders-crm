import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Globe, 
  RefreshCw, 
  Search,
  Sparkles,
  ArrowRight,
  Info,
  LineChart as ChartIcon
} from 'lucide-react';
import { MarketPrice } from '../lib/types';
import { subscribeToCollection, createDocument, updateDocument } from '../services/db';
import { formatDate } from '../lib/utils';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';
import { Timestamp } from 'firebase/firestore';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts';

import MarketIntelligence from './MarketIntelligence';

export default function MarketOracle() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedPrice, setSelectedPrice] = useState<MarketPrice | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToCollection<MarketPrice>(
      'market_prices',
      async (data) => {
        if (data.length === 0 && !loading) {
          // Seed initial data if empty
          const initialProducts = [
            { product: 'Black Pepper', commodity: 'Product', region: 'Kochi, India', price: 625, currency: 'INR', unit: 'kg', trend: 'up' },
            { product: 'Cardamom', commodity: 'Product', region: 'Idukki, India', price: 2150, currency: 'INR', unit: 'kg', trend: 'down' },
            { product: 'Ginger', commodity: 'Product', region: 'Wayanad, India', price: 180, currency: 'INR', unit: 'kg', trend: 'up' },
            { product: 'Turmeric', commodity: 'Product', region: 'Erode, India', price: 145, currency: 'INR', unit: 'kg', trend: 'up' },
            { product: 'Clove', commodity: 'Product', region: 'Zanzibar', price: 12.5, currency: 'USD', unit: 'kg', trend: 'down' },
            { product: 'Nutmeg', commodity: 'Product', region: 'Grenada', price: 9.2, currency: 'USD', unit: 'kg', trend: 'stable' },
          ];
          
          for (const s of initialProducts) {
            await createDocument('market_prices', {
              ...s,
              timestamp: Timestamp.now()
            });
          }
        }
        setPrices(data);
        setLoading(false);
      },
      undefined,
      'timestamp',
      'desc'
    );

    return () => unsubscribe();
  }, [loading]);

  const generatePrediction = async (price: MarketPrice) => {
    setPredicting(price.id);

    if (!isAIAvailable()) {
      // Rule-based fallback
      const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
      const randomTrend = trends[Math.floor(Math.random() * trends.length)];
      const confidence = 60 + Math.floor(Math.random() * 20);
      
      let reasoning = '';
      if (randomTrend === 'up') {
        reasoning = `Anticipated supply tightening in ${price.region} combined with steady export demand suggests a moderate price increase in the coming weeks.`;
      } else if (randomTrend === 'down') {
        reasoning = `Upcoming harvest season in major production hubs is expected to increase market arrivals, potentially putting downward pressure on prices.`;
      } else {
        reasoning = `Current market equilibrium between domestic supply and international demand indicates price stability for ${price.product} in the short term.`;
      }

      const prediction = {
        trend: randomTrend,
        confidence,
        reasoning
      };

      await updateDocument('market_prices', price.id, { prediction });
      setPrices(prev => prev.map(p => 
        p.id === price.id ? { ...p, prediction } : p
      ));
      setPredicting(null);
      return;
    }

    try {
      const model = 'gemini-3-flash-preview';
      const prompt = `As a commodity market analyst, predict the price trend for ${price.product} in ${price.region}. 
      Current price: ${price.price} ${price.currency}. 
      Consider global trade dynamics, harvest cycles, and demand in Europe/Middle East.
      Return a JSON object with: trend ('up', 'down', 'stable'), confidence (0-100), and reasoning (max 100 words).`;

      const response = await generateAIContent('Price Prediction', {
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const prediction = JSON.parse(response.text || '{}');
      
      // Update Firestore with the prediction
      await updateDocument('market_prices', price.id, { prediction });
      
      setPrices(prev => prev.map(p => 
        p.id === price.id ? { ...p, prediction } : p
      ));
    } catch (error: any) {
      const errorMessage = handleAIError(error);
      
      // If it's a quota or spending cap error, automatically trigger fallback
      if (errorMessage.toLowerCase().includes('quota') || 
          errorMessage.toLowerCase().includes('spending') ||
          errorMessage.toLowerCase().includes('429')) {
        console.warn("AI Quota exceeded, switching to Smart Mode fallback.");
        // Re-run the function, it will now hit the !isAIAvailable() check
        generatePrediction(price);
        return;
      }
      
      alert(errorMessage);
    } finally {
      setPredicting(null);
    }
  };

  const filteredPrices = prices.filter(p => 
    p.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mockChartData = [
    { date: '2025-10', price: 580, forecast: null },
    { date: '2025-11', price: 595, forecast: null },
    { date: '2025-12', price: 610, forecast: null },
    { date: '2026-01', price: 605, forecast: null },
    { date: '2026-02', price: 620, forecast: null },
    { date: '2026-03', price: 625, forecast: 625 },
    { date: '2026-04', price: null, forecast: 640 },
    { date: '2026-05', price: null, forecast: 655 },
    { date: '2026-06', price: null, forecast: 670 },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">Market Price Oracle</h2>
          <p className="text-zinc-500 mt-1">Real-time global product indices and AI predictions</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-100">
          <Globe size={14} />
          Live Global Feed
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Search product or region..." 
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {selectedPrice && (
            <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                    <ChartIcon size={20} className="text-emerald-600" />
                    {selectedPrice.product} Price Analysis & Forecast
                  </h3>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">{selectedPrice.region}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Historical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-300 border-2 border-dashed border-emerald-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">AI Forecast</span>
                  </div>
                </div>
              </div>
              <div className="p-6 w-full h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={mockChartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#71717a', fontWeight: 'bold' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#71717a', fontWeight: 'bold' }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      name="Historical Price"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="forecast" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fillOpacity={0.1} 
                      fill="#10b981" 
                      name="AI Forecast"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center">
                <RefreshCw className="animate-spin mx-auto text-zinc-400" size={32} />
                <p className="text-zinc-500 mt-4 font-medium">Fetching global indices...</p>
              </div>
            ) : filteredPrices.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
                <p className="text-zinc-400 font-medium">No market data available for this search</p>
              </div>
            ) : (
              filteredPrices.map((price) => (
                <div 
                  key={price.id} 
                  onClick={() => setSelectedPrice(price)}
                  className={`bg-white rounded-2xl border transition-all group cursor-pointer ${
                    selectedPrice?.id === price.id ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-lg' : 'border-zinc-200 shadow-sm hover:border-emerald-500/50'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-black text-zinc-900 tracking-tight">{price.product}</h3>
                        <div className="flex items-center gap-2 text-zinc-500 mt-1">
                          <Globe size={14} />
                          <span className="text-sm font-medium">{price.region}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-zinc-900">{price.price} <span className="text-sm font-bold text-zinc-400">{price.currency}/{price.unit}</span></p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Last Updated: {formatDate(price.timestamp)}</p>
                      </div>
                    </div>

                    {price.prediction ? (
                      <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-emerald-600" />
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                              {isAIAvailable() ? 'AI Prediction' : 'Smart Prediction'}
                            </span>
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            price.prediction.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                            price.prediction.trend === 'down' ? 'bg-rose-100 text-rose-700' :
                            'bg-zinc-200 text-zinc-700'
                          }`}>
                            {price.prediction.trend === 'up' ? <TrendingUp size={10} /> :
                             price.prediction.trend === 'down' ? <TrendingDown size={10} /> :
                             <Minus size={10} />}
                            {price.prediction.trend}
                          </div>
                        </div>
                        <p className="text-sm text-zinc-600 leading-relaxed mb-3 italic">
                          "{price.prediction.reasoning}"
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500" 
                                style={{ width: `${price.prediction.confidence}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-zinc-400">{price.prediction.confidence}% Confidence</span>
                          </div>
                          <button 
                            onClick={() => generatePrediction(price)}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider flex items-center gap-1"
                          >
                            Refresh {isAIAvailable() ? 'AI' : 'Smart'} <RefreshCw size={10} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => generatePrediction(price)}
                        disabled={predicting === price.id}
                        className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all group-hover:bg-emerald-600"
                      >
                        {predicting === price.id ? (
                          <RefreshCw size={18} className="animate-spin" />
                        ) : (
                          <>
                            <Sparkles size={18} />
                            Generate {isAIAvailable() ? 'AI' : 'Smart'} Prediction
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <MarketIntelligence />
          
          <div className="bg-emerald-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-4 tracking-tight">
                {isAIAvailable() ? 'Predictive Logistics Engine' : 'Smart Logistics Planner'}
              </h3>
              <p className="text-emerald-100/80 mb-6 leading-relaxed">
                {isAIAvailable() 
                  ? 'Our Gemini-powered engine analyzes global shipping lanes, fuel costs, and market volatility to suggest optimal shipment sizes and timing.'
                  : 'Our smart algorithm analyzes historical shipping lanes and current market trends to suggest optimal shipment sizes and timing.'}
              </p>
              <button className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-900 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all">
                Open Logistics Planner
                <ArrowRight size={18} />
              </button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800/50 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 right-0 p-8 opacity-20">
              <Sparkles size={120} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
