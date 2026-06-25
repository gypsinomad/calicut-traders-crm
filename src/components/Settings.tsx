import React, { useState, useEffect } from 'react';
import { 
  User, 
  Users,
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
  Plug,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  FileText as FileIcon,
  Cpu,
  Smartphone,
  SmartphoneIcon,
  Download,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from './Auth.tsx';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useTranslation } from '../contexts/LanguageContext.tsx';
import { Language } from '../services/translationService.ts';
import AIUsageDashboard from './AIUsageDashboard.tsx';
import { getDocuments, subscribeToCollection, updateDocument, createDocument } from '../services/db';
import { formatBytes } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { UserProfile, UserRole } from '../lib/types.ts';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';
import { hasPermission } from '../lib/permissions';

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

export default function Settings() {
  const { profile } = useAuth();
  const { language, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');

  // Integration States
  const [shippingProvider, setShippingProvider] = useState('Maersk Track & Trace');
  const [shippingApiKey, setShippingApiKey] = useState('');
  const [shippingBaseUrl, setShippingBaseUrl] = useState('https://api.maersk.com/track');
  
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappAccountId, setWhatsappAccountId] = useState('');

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');

  // General & Language States
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');

  // Automation States
  const [autoBackups, setAutoBackups] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(true);

  const navigate = (path: string) => {
    window.location.hash = path;
  };

  useEffect(() => {
    if (profile?.role === 'admin' && profile?.organization) {
      const unsubscribe = subscribeToCollection<UserProfile>(
        'users',
        (data) => setUsers(data),
        [{ field: 'organization', operator: '==', value: profile.organization }]
      );
      return () => unsubscribe();
    }
  }, [profile]);

  const handleSaveGeneral = async () => {
    if (!profile?.organization) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'organizations', profile.organization, 'settings', 'general');
      await setDoc(docRef, {
        timezone,
        currency,
        dateFormat,
        language
      }, { merge: true });
      toast.success('General settings saved successfully!');
    } catch (error) {
      console.error('Error saving general settings:', error);
      toast.error('Failed to save general settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      // In a real app, we'd update the user profile in Firestore
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Account settings saved successfully!');
    } catch (error) {
      console.error('Error saving account settings:', error);
      toast.error('Failed to save account settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAutomation = async () => {
    if (!profile?.organization) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'organizations', profile.organization, 'settings', 'automation');
      await setDoc(docRef, {
        autoBackups,
        weeklyReports,
        slackAlerts
      }, { merge: true });
      toast.success('Automation settings saved successfully!');
    } catch (error) {
      console.error('Error saving automation settings:', error);
      toast.error('Failed to save automation settings');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string, status: 'active' | 'suspended') => {
    try {
      await updateDocument('users', userId, { status });
      
      if (status === 'active') {
        // Send welcome notification to the user
        await createDocument('notifications', {
          title: 'Welcome to Global Trade Connect!',
          message: 'Your account has been approved. You can now access all features of the platform.',
          type: 'success',
          userId: userId,
          timestamp: Timestamp.now(),
          read: false,
          organization: profile?.organization || 'Calicut Traders'
        });
      }
      
      toast.success(`User status updated to ${status}`);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateDocument('users', userId, { role: newRole });
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleExportAllData = async () => {
    if (!profile?.organization) return;
    setExporting(true);
    try {
      const collections = ['leads', 'orders', 'payments', 'inventory', 'documents', 'audit_trail'];
      const allData: Record<string, any[]> = {};

      for (const coll of collections) {
        const data = await getDocuments(coll, [
          { field: 'organization', operator: '==', value: profile.organization }
        ]);
        allData[coll] = data;
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calicut_traders_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (profile?.organization) {
      const fetchSettings = async () => {
        try {
          const docRef = doc(db, 'organizations', profile.organization, 'settings', 'integrations');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.shipping) {
              setShippingProvider(data.shipping.provider || 'Maersk Track & Trace');
              setShippingApiKey(data.shipping.apiKey || '');
              setShippingBaseUrl(data.shipping.baseUrl || 'https://api.maersk.com/track');
            }
            if (data.whatsapp) {
              setWhatsappToken(data.whatsapp.token || '');
              setWhatsappPhoneId(data.whatsapp.phoneNumberId || '');
              setWhatsappAccountId(data.whatsapp.businessAccountId || '');
            }
          }
        } catch (error) {
          console.error('Error fetching integration settings:', error);
        }
      };
      fetchSettings();
    }
  }, [profile]);

  const saveIntegrations = async (type: 'shipping' | 'whatsapp') => {
    if (!profile?.organization) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'organizations', profile.organization, 'settings', 'integrations');
      const updateData: any = {};
      if (type === 'shipping') {
        updateData.shipping = {
          provider: shippingProvider,
          apiKey: shippingApiKey,
          baseUrl: shippingBaseUrl
        };
      } else {
        updateData.whatsapp = {
          token: whatsappToken,
          phoneNumberId: whatsappPhoneId,
          businessAccountId: whatsappAccountId
        };
      }
      await setDoc(docRef, updateData, { merge: true });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving integration settings:', error);
      alert('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = (key: string) => {
    if (key.trim()) {
      alert('Connection successful!');
    } else {
      alert('Please enter an API key first');
    }
  };

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
            hasPermission(profile?.role, 'settings.integrations.write') && { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            hasPermission(profile?.role, 'settings.security.write') && { id: 'security', label: 'Security', icon: Lock },
            hasPermission(profile?.role, 'users.write') && { id: 'users', label: 'User Management', icon: Users },
            { id: 'language', label: 'Language', icon: Globe },
            hasPermission(profile?.role, 'settings.automation.write') && { id: 'automation', label: 'Automation', icon: Zap },
            hasPermission(profile?.role, 'settings.ai.write') && { id: 'ai_usage', label: 'AI Usage', icon: Cpu },
            { id: 'mobile_app', label: 'Mobile App', icon: Smartphone },
            hasPermission(profile?.role, 'settings.integrations.write') && { id: 'integrations', label: 'Integrations', icon: Plug },
            hasPermission(profile?.role, 'settings.data.write') && { id: 'data', label: 'Data & Storage', icon: Database },
          ].filter((item): item is any => !!item).map((item) => (
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
                  <p className="text-sm text-zinc-500 mt-1">Public information about {profile?.organization || 'your organization'}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Company Name</label>
                      <input 
                        type="text" 
                        defaultValue={profile?.organization || "Global Trade Connect LLP"}
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
                          defaultValue="exports@calicuttraders.com"
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
                  {hasPermission(profile?.role, 'settings.general.write') ? (
                    <button 
                      onClick={handleSaveGeneral}
                      disabled={loading}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                    >
                      Save Organization Settings
                    </button>
                  ) : (
                    <p className="text-xs text-zinc-500 italic flex items-center gap-2">
                       <Shield size={14} /> Read-only: Settings managed by Administrator
                    </p>
                  )}
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
                    <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-2xl overflow-hidden">
                      {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        profile?.displayName?.split(' ').map(n => n[0]).join('') || 'U'
                      )}
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
                        defaultValue={profile?.displayName}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email" 
                        defaultValue={profile?.email}
                        readOnly
                        className="w-full px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                  <button 
                    onClick={handleSaveAccount}
                    disabled={loading}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                  >
                    Save Profile
                  </button>
                </div>
              </section>

              <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-rose-900">Danger Zone</h4>
                  <p className="text-xs text-rose-600 mt-0.5">Irreversible actions for your organization account</p>
                </div>
                <button 
                  onClick={() => toast.error("Account deletion is disabled in this demo.")}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
                >
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

                  <div className="pt-6 border-t border-zinc-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">Password Management</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Update your account password regularly</p>
                      </div>
                      <button 
                        onClick={() => toast.info("Password reset email sent to " + profile?.email)}
                        className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
                      >
                        Change Password
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">Session Management</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">View and manage your active sessions across devices</p>
                      </div>
                      <button 
                        onClick={() => navigate('/audit')}
                        className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
                      >
                        View Login History
                      </button>
                    </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <option value="hi">Hindi (हिन्दी)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Date Format</label>
                      <select 
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Time Zone</label>
                      <select 
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      >
                        <option value="Asia/Kolkata">India (IST) - UTC+5:30</option>
                        <option value="Asia/Dubai">Dubai (GST) - UTC+4:00</option>
                        <option value="UTC">Universal Time (UTC)</option>
                        <option value="America/New_York">New York (EST) - UTC-5:00</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Currency Display</label>
                      <select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="AED">UAE Dirham (د.إ)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>
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
                  <button 
                    onClick={handleSaveGeneral}
                    disabled={loading}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                  >
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
                      <input 
                        type="checkbox" 
                        checked={autoBackups}
                        onChange={() => setAutoBackups(!autoBackups)}
                        className="sr-only peer" 
                      />
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
                      <input 
                        type="checkbox" 
                        checked={weeklyReports}
                        onChange={() => setWeeklyReports(!weeklyReports)}
                        className="sr-only peer" 
                      />
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
                      <input 
                        type="checkbox" 
                        checked={slackAlerts}
                        onChange={() => setSlackAlerts(!slackAlerts)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>
                <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                  <button 
                    onClick={handleSaveAutomation}
                    disabled={loading}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'ai_usage' && (
            <AIUsageDashboard />
          )}

          {activeTab === 'mobile_app' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold text-zinc-900">Mobile Access</h3>
                  <p className="text-sm text-zinc-500 mt-1">Install the CRM on your mobile device for quick access</p>
                </div>
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                          <Smartphone size={20} />
                        </div>
                        <h4 className="font-bold text-zinc-900">Progressive Web App (PWA)</h4>
                      </div>
                      <p className="text-sm text-zinc-600 leading-relaxed">
                        The fastest way to get the CRM on your phone. It works just like a native app, supports offline access, and doesn't require a store download.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500 mt-0.5">1</div>
                          <p className="text-xs text-zinc-500">Open this URL in Safari (iOS) or Chrome (Android)</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500 mt-0.5">2</div>
                          <p className="text-xs text-zinc-500">Tap the <span className="font-bold">Share</span> button (iOS) or <span className="font-bold">Menu</span> (Android)</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-500 mt-0.5">3</div>
                          <p className="text-xs text-zinc-500">Select <span className="font-bold text-emerald-600">"Add to Home Screen"</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <Globe size={20} />
                        </div>
                        <h4 className="font-bold text-zinc-900">Store Submission</h4>
                      </div>
                      <p className="text-sm text-zinc-600 leading-relaxed">
                        If you require a listing on the Google Play Store or Apple App Store, we recommend using <span className="font-bold">Capacitor</span> or <span className="font-bold">TWA (Trusted Web Activities)</span>.
                      </p>
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                        <p className="text-xs text-zinc-500 font-medium">
                          Contact your technical team to package this web application using Capacitor. It allows you to use the same codebase for both stores.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-zinc-100 flex flex-col items-center text-center">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200 flex items-center justify-center mb-4">
                      <QRCodeSVG 
                        value={window.location.origin} 
                        size={128}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <p className="text-xs text-zinc-400 max-w-xs">
                      Scan this QR code with your mobile device to open the CRM directly.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900">Shipping & Logistics</h3>
                      <p className="text-sm text-zinc-500 mt-1">Container Tracking API</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      shippingApiKey ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {shippingApiKey ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {shippingApiKey ? 'Configured' : 'Not Configured'}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
                    Connect to a real-time shipping line API (Maersk, MSC, etc.) for live container tracking. Currently using simulated data.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">API Provider</label>
                      <select 
                        value={shippingProvider}
                        onChange={(e) => setShippingProvider(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      >
                        <option>Maersk Track & Trace</option>
                        <option>MSC MyContainer</option>
                        <option>CMA CGM</option>
                        <option>Hapag-Lloyd</option>
                        <option>Custom</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">API Key</label>
                      <input 
                        type="password" 
                        value={shippingApiKey}
                        onChange={(e) => setShippingApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">API Base URL</label>
                    <input 
                      type="text" 
                      value={shippingBaseUrl}
                      onChange={(e) => setShippingBaseUrl(e.target.value)}
                      placeholder="https://api.maersk.com/track"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <button 
                      onClick={() => testConnection(shippingApiKey)}
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
                    >
                      Test Connection
                    </button>
                    <button 
                      onClick={() => saveIntegrations('shipping')}
                      disabled={loading}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900">Customs & Compliance</h3>
                      <p className="text-sm text-zinc-500 mt-1">ICEGATE / Customs API Integration</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
                      <AlertCircle size={12} />
                      Not Configured
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-zinc-500">Connect to ICEGATE for automated Bill of Entry and Shipping Bill tracking.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">ICEGATE ID</label>
                      <input 
                        type="text" 
                        placeholder="Enter ICEGATE ID"
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">API Key</label>
                      <input 
                        type="password" 
                        placeholder="Enter API Key"
                        className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
                    Configure ICEGATE
                  </button>
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900">Financial Systems</h3>
                      <p className="text-sm text-zinc-500 mt-1">Tally / ERP Integration</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
                      <AlertCircle size={12} />
                      Not Configured
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-zinc-500">Sync your orders and payments directly with your accounting software.</p>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">ERP Provider</label>
                    <select className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all">
                      <option>Tally Prime</option>
                      <option>SAP Business One</option>
                      <option>Zoho Books</option>
                      <option>Oracle NetSuite</option>
                    </select>
                  </div>
                  <button className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
                    Connect ERP
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'users' && profile?.role === 'admin' && (
            <div className="space-y-6">
              <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900">User Management</h3>
                    <p className="text-sm text-zinc-500 mt-1">Approve and manage user access for your organization</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Filter:</label>
                    <select 
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value as any)}
                      className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending ({users.filter(u => u.status === 'pending').length})</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
                <div className="divide-y divide-zinc-100">
                  {users.filter(u => userFilter === 'all' || u.status === userFilter).length === 0 ? (
                    <div className="p-12 text-center">
                      <Users size={48} className="text-zinc-200 mx-auto mb-4" />
                      <p className="text-zinc-500">No users found matching the filter.</p>
                    </div>
                  ) : (
                    users.filter(u => userFilter === 'all' || u.status === userFilter).map((u) => (
                      <div 
                        key={u.uid} 
                        className={`p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors ${
                          u.status === 'pending' ? 'bg-amber-50/30 border-l-4 border-amber-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden border-2 ${
                            u.status === 'pending' ? 'border-amber-200 bg-amber-100' : 'border-zinc-100 bg-zinc-100'
                          }`}>
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User size={24} className={u.status === 'pending' ? 'text-amber-600' : 'text-zinc-400'} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-zinc-900">{u.displayName}</h4>
                              {u.status === 'pending' && (
                                <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded uppercase animate-pulse">
                                  New Request
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500">{u.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                                disabled={u.uid === profile.uid}
                                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded border-none focus:ring-1 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                              >
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="staff">Staff</option>
                                <option value="user">User</option>
                              </select>
                              {u.status === 'active' ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded flex items-center gap-1">
                                  <CheckCircle2 size={10} />
                                  Active
                                </span>
                              ) : u.status === 'pending' ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-500 text-white rounded flex items-center gap-1">
                                  <AlertCircle size={10} />
                                  Pending Approval
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded flex items-center gap-1">
                                  <AlertCircle size={10} />
                                  Suspended
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.uid !== profile.uid && (
                            u.status === 'pending' ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleApproveUser(u.uid, 'active')}
                                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                                >
                                  Approve Access
                                </button>
                                <button
                                  onClick={() => handleApproveUser(u.uid, 'suspended')}
                                  className="px-6 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-50 transition-all active:scale-95"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleApproveUser(u.uid, u.status !== 'active' ? 'active' : 'suspended')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                                  u.status === 'active' 
                                    ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200' 
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
                                }`}
                              >
                                {u.status === 'active' ? 'Suspend Access' : 'Reactivate User'}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))
                  )}
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
                    <button 
                      onClick={handleExportAllData}
                      disabled={exporting}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                      Download Backup
                    </button>
                  </div>
                  <div className="pt-6 border-t border-zinc-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-zinc-900">Storage Usage</h4>
                      <span className="text-xs font-medium text-zinc-500">{formatBytes(124500000)} of 10 GB used</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '1.2%' }}></div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
