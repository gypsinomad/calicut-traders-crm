import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, FileText, ShieldCheck } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const SYSTEM_INSTRUCTION = `You are the Compliance Assistant for Calicut Spice Traders LLP. 
Your goal is to help Akhil Venugopal and his team manage spice exports (Black Pepper, Cardamom, Honey, Turmeric, Ginger, etc.) from Kerala to Africa, UK, and Middle East.
You have expertise in:
1. APEDA (Agricultural and Processed Food Products Export Development Authority) regulations.
2. FSSAI (Food Safety and Standards Authority of India) requirements.
3. ICEGATE and Indian Customs procedures.
4. HS Codes for spices (e.g., 0904 for Pepper, 0908 for Cardamom).
5. Phyto-sanitary certificates and Certificate of Origin.
6. Market-specific requirements for UK (FSA), UAE (MOIAT), and various African nations.

Capabilities:
- Proactively check shipment details against APEDA regulations.
- Generate draft compliance documents:
    - Certificates of Origin
    - Phytosanitary Certificates
    - Commercial Invoices
    - Packing Lists
- Provide real-time compliance alerts based on destination country.

When asked to generate a document, provide a structured draft in Markdown that the user can copy.
When checking compliance, be specific about requirements for the commodity and destination.

Be professional, concise, and helpful. Use Markdown for formatting. Always remind users to verify with official government portals for the most up-to-date regulations.`;

export default function ComplianceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
    { role: 'model', content: 'Hello! I am your Compliance Assistant. How can I help you with your spice exports today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleTrigger = (e: CustomEvent<{ message: string }>) => {
      setIsOpen(true);
      if (e.detail.message) {
        handleSend(e.detail.message);
      }
    };

    window.addEventListener('trigger-compliance-ai' as any, handleTrigger as any);
    return () => window.removeEventListener('trigger-compliance-ai' as any, handleTrigger as any);
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageToSend = text || input.trim();
    if (!messageToSend || isLoading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: messageToSend }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: newMessages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });

      const assistantMessage = response.text || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'model', content: assistantMessage }]);
      
      if (isVoiceMode) {
        // In a real app, we'd use TTS here
        console.log('Speaking:', assistantMessage);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please check your API key or try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
    if (!isVoiceMode) {
      // Simulate Gemini Live activation
      setMessages(prev => [...prev, { role: 'model', content: "*Voice Mode Activated* I'm listening for your commands, Akhil." }]);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 items-end z-50">
        <button 
          onClick={toggleVoiceMode}
          className={`p-4 rounded-full shadow-lg transition-all hover:scale-110 ${
            isVoiceMode ? 'bg-rose-600 text-white animate-pulse' : 'bg-zinc-900 text-white'
          }`}
          title="Gemini Live Voice Control"
        >
          <div className="relative">
            <Bot size={24} />
            {isVoiceMode && <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />}
          </div>
        </button>
        <button 
          onClick={() => setIsOpen(true)}
          className="p-4 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all hover:scale-110"
        >
          <MessageSquare size={24} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden z-50"
          >
            <header className="p-4 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500 rounded-lg shadow-sm">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Compliance AI</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-zinc-400">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleSend("Generate a draft Commercial Invoice for my latest order")}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                  title="Generate Document"
                >
                  <FileText size={18} />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 scroll-smooth">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm' 
                      : 'bg-white border border-zinc-200 text-zinc-900 rounded-tl-none shadow-sm'
                  }`}>
                    {m.role === 'model' ? (
                      <div className="prose prose-sm prose-zinc max-w-none prose-p:leading-relaxed prose-headings:text-zinc-900 prose-a:text-emerald-600">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-zinc-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                    <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              
              {!isLoading && messages.length === 1 && (
                <div className="grid grid-cols-1 gap-2 mt-4">
                  <button 
                    onClick={() => handleSend("Check APEDA regulations for Black Pepper export to UK")}
                    className="text-left p-3 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-600 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-2 group"
                  >
                    <ShieldCheck size={14} className="text-emerald-500" />
                    Check APEDA Regulations
                  </button>
                  <button 
                    onClick={() => handleSend("Generate a draft Certificate of Origin for a spice shipment")}
                    className="text-left p-3 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-600 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-2 group"
                  >
                    <FileText size={14} className="text-amber-500" />
                    Draft Certificate of Origin
                  </button>
                  <button 
                    onClick={() => handleSend("Generate a draft Phytosanitary Certificate for Cardamom")}
                    className="text-left p-3 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-600 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-2 group"
                  >
                    <Sparkles size={14} className="text-blue-500" />
                    Draft Phytosanitary Certificate
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-zinc-100">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ask about export rules..." 
                  className="w-full pl-4 pr-12 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 text-center flex items-center justify-center gap-1">
                <Sparkles size={10} />
                Powered by Gemini AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
