import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Mail, 
  MessageSquare, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Twitter,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  Key,
  Database,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IntegrationConfig } from '../../lib/types';
import { Timestamp } from 'firebase/firestore';
import { TranslatedText } from '../TranslatedText';

export function IntegrationSettings() {
  const [configs, setConfigs] = useState<IntegrationConfig[]>([
    {
      id: 'ic_1',
      platform: 'zoho_mail',
      isConnected: true,
      lastSyncAt: Timestamp.now(),
      config: { email: 'sales@example.com' },
      organization: 'default'
    },
    {
      id: 'ic_2',
      platform: 'whatsapp',
      isConnected: false,
      config: {},
      organization: 'default'
    },
    {
      id: 'ic_3',
      platform: 'meta',
      isConnected: true,
      lastSyncAt: Timestamp.now(),
      config: { pageId: 'business_fb' },
      organization: 'default'
    },
    {
      id: 'ic_4',
      platform: 'zoho_social',
      isConnected: false,
      config: {},
      organization: 'default'
    }
  ]);

  const [isConfigOpen, setIsConfigOpen] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (platform: string) => {
    setIsConnecting(true);
    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      setConfigs(prev => prev.map(c => 
        c.platform === platform 
          ? { ...c, isConnected: true, lastSyncAt: Timestamp.now() } 
          : c
      ));
      setIsConfigOpen(null);
    } catch (error) {
      console.error(`Error connecting to ${platform}:`, error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = (platform: string) => {
    setConfigs(prev => prev.map(c => 
      c.platform === platform 
        ? { ...c, isConnected: true, lastSyncAt: Timestamp.now() } 
        : c
    ));
    setIsConfigOpen(null);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'zoho_mail': return <Mail size={24} className="text-blue-400" />;
      case 'whatsapp': return <MessageSquare size={24} className="text-emerald-400" />;
      case 'meta': return <Facebook size={24} className="text-blue-600" />;
      case 'zoho_social': return <Share2 size={24} className="text-emerald-400" />;
      default: return <SettingsIcon size={24} />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'zoho_mail': return 'Zoho Mail';
      case 'whatsapp': return 'WhatsApp Business';
      case 'meta': return 'Meta Business Suite';
      case 'zoho_social': return 'Zoho Social';
      default: return platform;
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6">
        {configs.map((config) => (
          <div key={config.id} className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 p-6 shadow-2xl group hover:border-emerald-500/30 transition-all">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:bg-emerald-500/10 transition-all">
                  {getPlatformIcon(config.platform)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{getPlatformName(config.platform)}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {config.isConnected ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        <CheckCircle2 size={10} />
                        Connected
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-bold text-red-400 uppercase tracking-wider">
                        <AlertCircle size={10} />
                        Disconnected
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsConfigOpen(config.platform)}
                className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-xl transition-all"
              >
                <SettingsIcon size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400/40 font-medium uppercase tracking-widest">Last Sync</span>
                <span className="text-white font-bold">{config.lastSyncAt ? config.lastSyncAt.toDate().toLocaleString() : 'Never'}</span>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 rounded-xl transition-all font-bold text-xs uppercase tracking-wider">
                  <RefreshCw size={14} />
                  Sync Now
                </button>
                <button 
                  onClick={() => setIsConfigOpen(config.platform)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-bold text-xs uppercase tracking-wider"
                >
                  Configure
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modals */}
      <AnimatePresence>
        {isConfigOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configure {getPlatformName(isConfigOpen)}</h3>
                <button 
                  onClick={() => setIsConfigOpen(null)}
                  className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all"
                >
                  <AlertCircle size={18} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                {isConfigOpen === 'zoho_mail' && (
                  <div className="space-y-6">
                    <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Mail size={32} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Zoho Mail OAuth</h4>
                        <p className="text-xs text-emerald-400/40 mt-1">Connect your Zoho Mail account to send and receive emails directly from the CRM.</p>
                      </div>
                      <button 
                        onClick={() => handleConnect('zoho_mail')}
                        disabled={isConnecting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 font-bold text-xs uppercase tracking-wider"
                      >
                        {isConnecting ? <RefreshCw size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                        {isConnecting ? 'Connecting...' : 'Connect Zoho Account'}
                      </button>
                    </div>
                  </div>
                )}

                {isConfigOpen === 'whatsapp' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest ml-1">Meta Business Account ID</label>
                      <div className="relative">
                        <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/40" size={16} />
                        <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" placeholder="Enter Account ID" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest ml-1">Phone Number ID</label>
                      <div className="relative">
                        <Zap className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/40" size={16} />
                        <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" placeholder="Enter Phone ID" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest ml-1">Permanent Access Token</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/40" size={16} />
                        <input type="password" value="••••••••••••••••" className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                      </div>
                    </div>
                  </div>
                )}

                {isConfigOpen === 'meta' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl mb-4">
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2">Connected Platforms</p>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-white text-xs">
                          <Facebook size={14} className="text-blue-600" />
                          Facebook Page
                        </div>
                        <div className="flex items-center gap-2 text-white text-xs">
                          <Instagram size={14} className="text-pink-500" />
                          Instagram Business
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest ml-1">App ID</label>
                      <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" placeholder="Enter App ID" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest ml-1">App Secret</label>
                      <input type="password" value="••••••••••••••••" className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest ml-1">Page Access Token</label>
                      <input type="password" value="••••••••••••••••" className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                    </div>
                  </div>
                )}

                {isConfigOpen === 'zoho_social' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl mb-4">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2">Connected Channels</p>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-white text-xs">
                          <Linkedin size={14} className="text-blue-700" />
                          LinkedIn
                        </div>
                        <div className="flex items-center gap-2 text-white text-xs">
                          <Twitter size={14} className="text-sky-400" />
                          Twitter (X)
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest ml-1">Workspace ID</label>
                      <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" placeholder="Enter Workspace ID" />
                    </div>
                    <button 
                      onClick={() => handleConnect('zoho_social')}
                      disabled={isConnecting}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-bold text-sm uppercase tracking-wider"
                    >
                      {isConnecting ? <RefreshCw size={18} className="animate-spin" /> : <ExternalLink size={18} />}
                      {isConnecting ? 'Connecting...' : 'Connect Zoho Social'}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4">
                  <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 rounded-xl transition-all font-bold text-sm uppercase tracking-wider">
                    <Zap size={18} />
                    Test Connection
                  </button>
                  <button 
                    onClick={() => handleSave(isConfigOpen)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-bold text-sm uppercase tracking-wider"
                  >
                    Save Config
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
