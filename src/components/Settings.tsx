import React, { useState } from 'react';
import { 
  User, 
  Building2, 
  Shield, 
  Bell, 
  Globe, 
  Database,
  Lock,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Save,
  Trash2,
  Moon,
  Sun,
  Zap,
  Slack,
  MessageSquare,
  FileText as FileIcon
} from 'lucide-react';

const SettingItem = ({ icon: Icon, title, description, badge, onClick }: any) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors group"
  >
    <div className="flex items-center gap-4">
      <div className="p-2 bg-zinc-100 text-zinc-600 rounded-lg group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
        <Icon size={20} />
      </div>
      <div className="text-left">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-zinc-900">{title}</h4>
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
  </button>
);

import { useTranslation } from '../contexts/LanguageContext.tsx';
import { Language } from '../services/translationService.ts';

export default function Settings() {
  const { language, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900">Settings</h2>
          <p className="text-zinc-500 mt-1">Manage your organization and account preferences</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
          <Save size={18} />
          Save Changes
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="space-y-1">
          {[
            { id: 'general', label: 'General', icon: Building2 },
            { id: 'account', label: 'Account', icon: User },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'language', label: 'Language', icon: Globe },
            { id: 'automation', label: 'Automation', icon: Zap },
            { id: 'data', label: 'Data & Storage', icon: Database },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === item.id 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </aside>

        <div className="lg:col-span-3 space-y-8">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Organization Profile</h3>
                  <p className="text-sm text-zinc-500 mt-1">Public information about Calicut Spice Traders LLP</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Company Name</label>
                      <input 
                        type="text" 
                        defaultValue="Calicut Spice Traders LLP"
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">GSTIN / Tax ID</label>
                      <input 
                        type="text" 
                        defaultValue="32AAACC1234A1Z5"
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Headquarters Address</label>
                    <textarea 
                      rows={3}
                      defaultValue="12/456, Beach Road, Kozhikode, Kerala, 673001, India"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Appearance</h3>
                  <p className="text-sm text-zinc-500 mt-1">Customize how the platform looks for you</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
                        <Moon size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">Dark Mode</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Switch to a dark interface for reduced eye strain</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        onChange={(e) => {
                          if (e.target.checked) {
                            document.documentElement.classList.add('dark');
                          } else {
                            document.documentElement.classList.remove('dark');
                          }
                        }}
                        defaultChecked={document.documentElement.classList.contains('dark')}
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Contact Information</h3>
                  <p className="text-sm text-zinc-500 mt-1">How customers and partners reach you</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Primary Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                          type="email" 
                          defaultValue="exports@calicutspices.com"
                          className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                          type="tel" 
                          defaultValue="+91 98765 43210"
                          className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Export Compliance Rules</h3>
                  <p className="text-sm text-zinc-500 mt-1">Configure default compliance checks for shipments</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Default Target Region</label>
                    <select className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all">
                      <option>European Union (EU)</option>
                      <option>United States (USA)</option>
                      <option>Middle East</option>
                      <option>Africa</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">Auto-Check Sanction Lists</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Automatically screen all new leads against global sanction lists</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
                <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                  <button className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
                    Save Changes
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Personal Profile</h3>
                  <p className="text-sm text-zinc-500 mt-1">Manage your personal information</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-2xl">
                      AV
                    </div>
                    <div className="space-y-2">
                      <button className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
                        Change Photo
                      </button>
                      <p className="text-xs text-zinc-500">JPG, GIF or PNG. Max size of 2MB.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                      <input 
                        type="text" 
                        defaultValue="Akhil Venugopal"
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email" 
                        defaultValue="akhilvenugopal@gmail.com"
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-rose-900">Danger Zone</h4>
                  <p className="text-xs text-rose-600 mt-0.5">Irreversible actions for your organization account</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors">
                  <Trash2 size={18} />
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Email Notifications</h3>
                  <p className="text-sm text-zinc-500 mt-1">Choose what updates you want to receive via email</p>
                </div>
                <div className="p-6 divide-y divide-zinc-100">
                  {[
                    { id: 'n1', title: 'New Lead Assigned', desc: 'Get notified when a new export lead is assigned to you' },
                    { id: 'n2', title: 'Order Status Updates', desc: 'Updates on shipment tracking and customs clearance' },
                    { id: 'n3', title: 'Compliance Alerts', desc: 'Critical alerts regarding changes in export regulations' },
                    { id: 'n4', title: 'Weekly Digest', desc: 'A summary of your organization\'s export performance' },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{item.title}</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900">WhatsApp Business API</h3>
                      <p className="text-sm text-zinc-500 mt-1">Configure automated order confirmations and shipment updates</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <Zap size={12} />
                      Active
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between py-4 bg-zinc-50 px-4 rounded-xl border border-zinc-100">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">Automated Messaging</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Automatically send WhatsApp messages on order status changes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone Number ID</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 106543210987654"
                          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Business Account ID</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 109876543210654"
                          className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Permanent Access Token</label>
                      <input 
                        type="password" 
                        placeholder="EAAB..."
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg text-amber-600 shadow-sm">
                      <Shield size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">Security Note</p>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        For maximum security, we recommend setting these values as <strong>Secrets</strong> in the platform settings (⚙️ gear icon). 
                        Values entered here are stored in your organization's encrypted database.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
                    <button className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
                      Test Connection
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
                      View API Logs
                    </button>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Message Templates</h3>
                  <p className="text-sm text-zinc-500 mt-1">Manage the templates used for automated notifications</p>
                </div>
                <div className="p-6 divide-y divide-zinc-100">
                  {[
                    { id: 't1', name: 'order_confirmation', status: 'Approved', type: 'Transactional' },
                    { id: 't2', name: 'shipment_update', status: 'Approved', type: 'Transactional' },
                    { id: 't3', name: 'payment_reminder', status: 'Pending', type: 'Marketing' },
                  ].map((template) => (
                    <div key={template.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{template.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-medium text-zinc-500">{template.type}</span>
                          <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                          <span className={`text-[10px] font-bold uppercase ${
                            template.status === 'Approved' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>{template.status}</span>
                        </div>
                      </div>
                      <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                        Edit Template
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Security Settings</h3>
                  <p className="text-sm text-zinc-500 mt-1">Protect your account and organization data</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">Two-Factor Authentication</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Add an extra layer of security to your account</p>
                    </div>
                    <button className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
                      Enable
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">Session Management</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">View and manage your active sessions across devices</p>
                    </div>
                    <button className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
                      View Sessions
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Language & Localization</h3>
                  <p className="text-sm text-zinc-500 mt-1">Choose your preferred language for the interface and documents</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Interface Language</label>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      <option value="en">English (Default)</option>
                      <option value="ar">Arabic (العربية)</option>
                      <option value="sw">Swahili (Kiswahili)</option>
                      <option value="ml">Malayalam (മലയാളം)</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between py-4 border-t border-zinc-100">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">AI Auto-Translation</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Use Gemini AI to automatically translate incoming leads and documents</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm">
                      <Globe size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Global Reach</p>
                      <p className="text-xs text-emerald-700 leading-relaxed">
                        Supporting your trade in Africa (Swahili), Middle East (Arabic), and UK (English). 
                        Our AI translation ensures zero communication barriers with your global partners.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                  <button className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
                    Save Changes
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Zero-Touch Automation</h3>
                  <p className="text-sm text-zinc-500 mt-1">Configure automated workflows and backups</p>
                </div>
                <div className="p-6 divide-y divide-zinc-100">
                  <div className="flex items-center justify-between py-4 first:pt-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Database size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">Auto-Backups to Google Drive</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Daily encrypted backups of all export records</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <FileIcon size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">Weekly Compliance Reports</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Automated PDF reports sent to stakeholders every Monday</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-4 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Slack size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">Slack/Email Alerts</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Real-time alerts for shipment delays or compliance risks</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
                <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                  <button className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
                    Save Changes
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Data & Storage</h3>
                  <p className="text-sm text-zinc-500 mt-1">Manage your organization's data and document storage</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900">Export All Data</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Download a complete backup of your leads, orders, and documents</p>
                    </div>
                    <button className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
                      Download Backup
                    </button>
                  </div>
                  <div className="pt-6 border-t border-zinc-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-zinc-900">Storage Usage</h4>
                      <span className="text-xs font-medium text-zinc-500">2.4 GB of 10 GB used</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '24%' }}></div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Placeholder for other tabs */}
          {!['general', 'account', 'notifications', 'security', 'language', 'automation', 'data'].includes(activeTab) && (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-zinc-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Section Under Development</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-xs mx-auto">
                We're currently refining the {activeTab} settings to provide a better experience.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
