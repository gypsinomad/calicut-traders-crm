import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  MessageSquare, 
  Share2, 
  Settings as SettingsIcon, 
  Search, 
  Filter, 
  Plus, 
  Send, 
  Inbox, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  MoreVertical,
  User,
  Calendar as CalendarIcon,
  BarChart2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UnifiedInbox } from './UnifiedInbox';
import { EmailManager } from './EmailManager';
import { WhatsAppManager } from './WhatsAppManager';
import { SocialMediaManager } from './SocialMediaManager';
import { IntegrationSettings } from './IntegrationSettings';
import { useTranslation } from '../../contexts/LanguageContext';
import { TranslatedText } from '../TranslatedText';

type Tab = 'inbox' | 'email' | 'whatsapp' | 'social' | 'settings';

export default function CommunicationsHub() {
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const { isRTL } = useTranslation();

  const tabs = [
    { id: 'inbox', label: 'Unified Inbox', icon: Inbox },
    { id: 'email', label: 'Zoho Mail', icon: Mail },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'social', label: 'Social Media', icon: Share2 },
    { id: 'settings', label: 'Integrations', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">
            <TranslatedText>Communications & Integrations Hub</TranslatedText>
          </h1>
          <p className="text-emerald-400/60 mt-1">
            <TranslatedText>Manage all your buyer and supplier communications in one place</TranslatedText>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20">
            <Plus size={18} />
            <span className="font-medium text-sm"><TranslatedText>New Communication</TranslatedText></span>
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/5 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
              activeTab === tab.id 
                ? "bg-emerald-600 text-white shadow-lg" 
                : "text-emerald-300/60 hover:text-emerald-300 hover:bg-white/5"
            }`}
          >
            <tab.icon size={18} />
            <span className="text-sm font-medium tracking-tight">
              <TranslatedText>{tab.label}</TranslatedText>
            </span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'inbox' && <UnifiedInbox />}
            {activeTab === 'email' && <EmailManager />}
            {activeTab === 'whatsapp' && <WhatsAppManager />}
            {activeTab === 'social' && <SocialMediaManager />}
            {activeTab === 'settings' && <IntegrationSettings />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
