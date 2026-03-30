import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { 
  Share2, 
  Search, 
  Filter, 
  Plus, 
  Send, 
  Inbox, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Calendar as CalendarIcon,
  BarChart2,
  Zap,
  Layout,
  RefreshCw,
  MoreHorizontal,
  Image as ImageIcon,
  MessageSquare,
  Eye,
  MousePointer2,
  TrendingUp,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SocialPost } from '../../lib/types';
import { metaService } from '../../services/metaService';
import { zohoSocialService } from '../../services/zohosocialService';
import { TranslatedText } from '../TranslatedText';

type SocialTab = 'composer' | 'calendar' | 'analytics' | 'engagement';

export function SocialMediaManager() {
  const [activeTab, setActiveTab] = useState<SocialTab>('composer');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [metaInsights, setMetaInsights] = useState<any>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const charLimits = {
    fb: 63206,
    ig: 2200,
    li: 3000,
    tw: 280
  };

  const hashtagSuggestions = [
    '#GlobalTrade', '#CommodityExport', '#SupplyChain', '#QualityControl', 
    '#InternationalBusiness', '#ExportImport', '#TradeLogistics', '#SustainableSourcing'
  ];

  useEffect(() => {
    loadPosts();
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const insights = await metaService.getInsights();
      setMetaInsights(insights);
    } catch (error) {
      console.error('Error loading meta insights:', error);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const metaPosts = await metaService.getPosts();
      const zohoPosts = await zohoSocialService.getQueue('calicut_traders_ws');
      setPosts([...metaPosts, ...zohoPosts]);
    } catch (error) {
      console.error('Error loading social posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostNow = async () => {
    if (!newPostContent.trim() || selectedPlatforms.length === 0) return;
    
    setIsPosting(true);
    try {
      // In a real app, we'd loop or use a multi-platform service
      for (const platformId of selectedPlatforms) {
        const postData = {
          platform: (platformId === 'fb' || platformId === 'ig' ? 'facebook' : platformId === 'li' ? 'linkedin' : 'twitter') as any,
          content: newPostContent,
          status: scheduledDate ? 'scheduled' : 'published' as const,
          organization: 'default',
          scheduledAt: scheduledDate ? Timestamp.fromDate(new Date(scheduledDate)) : undefined
        };

        if (platformId === 'fb' || platformId === 'ig') {
          if (scheduledDate) {
            await metaService.schedulePost(postData as any);
          } else {
            await metaService.publishPost(postData as any);
          }
        } else {
          await zohoSocialService.publishPost(postData as any);
        }
      }

      await loadPosts();
      setIsNewPostOpen(false);
      setNewPostContent('');
      setSelectedPlatforms([]);
      setScheduledDate(null);
    } catch (error) {
      console.error('Error publishing post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const tabs = [
    { id: 'composer', label: 'Composer', icon: Layout },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'engagement', label: 'Engagement', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/5 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SocialTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                activeTab === tab.id 
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" 
                  : "text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 border border-transparent"
              }`}
            >
              <tab.icon size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">
                <TranslatedText>{tab.label}</TranslatedText>
              </span>
            </button>
          ))}
        </div>
        <button 
          onClick={() => setIsNewPostOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-bold text-xs uppercase tracking-wider"
        >
          <Plus size={16} />
          Create Post
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'composer' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 space-y-6">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 p-6 shadow-2xl">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Recent Posts</h3>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="p-4 bg-black/20 border border-white/5 rounded-2xl flex items-start gap-4 group hover:bg-black/30 transition-all">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                        {post.platform === 'facebook' && <Facebook size={24} />}
                        {post.platform === 'instagram' && <Instagram size={24} />}
                        {post.platform === 'linkedin' && <Linkedin size={24} />}
                        {post.platform === 'twitter' && <Twitter size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                            {post.platform}
                          </span>
                          <span className="text-[10px] text-emerald-400/40 font-medium">
                            {post.publishedAt?.toDate().toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-emerald-50 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-6 mt-3">
                          <div className="flex items-center gap-1.5 text-emerald-400/40">
                            <Eye size={14} />
                            <span className="text-[10px] font-bold">{post.analytics?.reach}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400/40">
                            <TrendingUp size={14} />
                            <span className="text-[10px] font-bold">{post.analytics?.engagement}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400/40">
                            <MousePointer2 size={14} />
                            <span className="text-[10px] font-bold">{post.analytics?.clicks}</span>
                          </div>
                        </div>
                      </div>
                      <button className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-4 space-y-6">
              <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <Zap size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Best Time to Post</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { platform: 'LinkedIn', time: 'Tuesday, 10:00 AM', score: 95 },
                    { platform: 'Facebook', time: 'Wednesday, 2:00 PM', score: 88 },
                    { platform: 'Instagram', time: 'Friday, 6:00 PM', score: 92 }
                  ].map((item) => (
                    <div key={item.platform} className="p-3 bg-black/20 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{item.platform}</span>
                        <span className="text-[10px] font-bold text-emerald-400">{item.score}% Reach</span>
                      </div>
                      <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider">{item.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scheduled Posts</h3>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-emerald-400 hover:bg-white/5 rounded-lg"><RefreshCw size={16} /></button>
                </div>
              </div>
              <div className="space-y-4">
                {posts.filter(p => p.status === 'scheduled').length > 0 ? (
                  posts.filter(p => p.status === 'scheduled').map(post => (
                    <div key={post.id} className="p-4 bg-black/20 border border-white/5 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Clock size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium line-clamp-1">{post.content}</p>
                        <p className="text-[10px] text-emerald-400/40 uppercase tracking-widest mt-1">
                          {post.scheduledAt?.toDate().toLocaleString()} • {post.platform}
                        </p>
                      </div>
                      <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        Edit
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <CalendarIcon size={48} className="mx-auto text-emerald-400/10 mb-4" />
                    <p className="text-emerald-400/40 text-sm">No posts scheduled for this month.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-4 space-y-6">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 p-6 shadow-2xl">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Calendar Overview</h3>
                <div className="grid grid-cols-7 gap-1">
                  {['S','M','T','W','T','F','S'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-emerald-400/40 py-2">{d}</div>
                  ))}
                  {Array.from({ length: 31 }).map((_, i) => (
                    <div key={i} className={`aspect-square flex items-center justify-center text-[10px] font-bold rounded-lg ${i + 1 === new Date().getDate() ? 'bg-emerald-600 text-white' : 'text-emerald-400/60 hover:bg-white/5'}`}>
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Total Reach', value: '124.5K', trend: '+12%', icon: Eye },
                { label: 'Engagement Rate', value: '4.8%', trend: '+0.5%', icon: TrendingUp },
                { label: 'Link Clicks', value: '2,840', trend: '+18%', icon: MousePointer2 }
              ].map((stat) => (
                <div key={stat.label} className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <stat.icon size={20} />
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{stat.trend}</span>
                  </div>
                  <h4 className="text-xs font-bold text-emerald-400/40 uppercase tracking-widest">{stat.label}</h4>
                  <p className="text-3xl font-serif font-bold text-white mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {metaInsights && (
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <Facebook className="text-blue-600" size={24} />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Facebook Insights</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-emerald-400/40 uppercase tracking-widest">Reach</p>
                      <p className="text-xl font-bold text-white mt-1">{metaInsights.facebook.totalReach.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-emerald-400/40 uppercase tracking-widest">Engagement</p>
                      <p className="text-xl font-bold text-white mt-1">{metaInsights.facebook.engagementRate}%</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <h4 className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest mb-3">Top Countries</h4>
                    <div className="space-y-2">
                      {metaInsights.facebook.audience.topCountries.map((c: string) => (
                        <div key={c} className="flex items-center justify-between">
                          <span className="text-xs text-emerald-50">{c}</span>
                          <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.random() * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <Instagram className="text-pink-500" size={24} />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Instagram Insights</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-emerald-400/40 uppercase tracking-widest">Reach</p>
                      <p className="text-xl font-bold text-white mt-1">{metaInsights.instagram.totalReach.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-emerald-400/40 uppercase tracking-widest">Engagement</p>
                      <p className="text-xl font-bold text-white mt-1">{metaInsights.instagram.engagementRate}%</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <h4 className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest mb-3">Audience Split</h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-[10px] font-bold text-emerald-400/40 mb-1">
                          <span>WOMEN</span>
                          <span>{metaInsights.instagram.audience.women}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-500" style={{ width: `${metaInsights.instagram.audience.women}%` }} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-[10px] font-bold text-emerald-400/40 mb-1">
                          <span>MEN</span>
                          <span>{metaInsights.instagram.audience.men}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${metaInsights.instagram.audience.men}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'engagement' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Engagement Feed</h3>
              <div className="space-y-4">
                {[
                  { user: 'Global Trade UK', platform: 'linkedin', type: 'mention', content: 'Great quality cardamom from @GlobalTradeConnect!', time: '2h ago' },
                  { user: 'DubaiFoodie', platform: 'twitter', type: 'comment', content: 'Where can I buy your black pepper in UAE?', time: '5h ago' }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-black/20 border border-white/5 rounded-2xl flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
                      <User size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-white">{item.user}</h4>
                        <span className="text-[10px] text-emerald-400/40 font-medium">{item.time}</span>
                      </div>
                      <p className="text-xs text-emerald-300/60">{item.content}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <button className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider hover:text-emerald-300 transition-all">Reply</button>
                        <button className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-wider hover:text-emerald-400 transition-all">Like</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-4 bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/5 p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Brand Monitoring</h3>
              <div className="space-y-4">
                {[
                  { keyword: 'Global Trade Connect', count: 12, trend: 'up' },
                  { keyword: 'Black Pepper Export', count: 45, trend: 'stable' },
                  { keyword: 'Kerala Turmeric', count: 28, trend: 'up' }
                ].map((item) => (
                  <div key={item.keyword} className="p-3 bg-black/20 rounded-xl border border-white/5">
                    <h4 className="text-xs font-bold text-white mb-1">{item.keyword}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400/40 font-medium">{item.count} Mentions</span>
                      <TrendingUp size={12} className={item.trend === 'up' ? 'text-emerald-400' : 'text-emerald-400/40'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {isNewPostOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create Social Post</h3>
                <button 
                  onClick={() => setIsNewPostOpen(false)}
                  className="p-2 text-emerald-300/40 hover:text-emerald-300 hover:bg-white/5 rounded-lg transition-all"
                >
                  <AlertCircle size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest ml-1">Select Platforms</label>
                      <div className="flex items-center gap-3">
                        {[
                          { id: 'fb', icon: Facebook, color: 'text-blue-600' },
                          { id: 'ig', icon: Instagram, color: 'text-pink-500' },
                          { id: 'li', icon: Linkedin, color: 'text-blue-700' },
                          { id: 'tw', icon: Twitter, color: 'text-sky-400' }
                        ].map((p) => (
                          <button 
                            key={p.id} 
                            onClick={() => setSelectedPlatforms(prev => 
                              prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                            )}
                            className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${
                              selectedPlatforms.includes(p.id) 
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                : 'bg-white/5 border-white/10 text-emerald-400/40 hover:bg-white/10'
                            }`}
                          >
                            <p.icon size={20} className={selectedPlatforms.includes(p.id) ? p.color : 'opacity-40'} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest">Content</label>
                        <div className="flex gap-2">
                          {selectedPlatforms.map(p => (
                            <span key={p} className={`text-[10px] font-bold ${newPostContent.length > (charLimits[p as keyof typeof charLimits] || 2000) ? 'text-red-400' : 'text-emerald-400/40'}`}>
                              {p.toUpperCase()}: {newPostContent.length}/{charLimits[p as keyof typeof charLimits] || 2000}
                            </span>
                          ))}
                        </div>
                      </div>
                      <textarea 
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="w-full h-40 bg-black/20 border border-white/5 rounded-2xl p-4 text-sm text-white placeholder-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none"
                        placeholder="Share an update about your commodities or trade operations..."
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {hashtagSuggestions.map(tag => (
                          <button 
                            key={tag}
                            onClick={() => setNewPostContent(prev => prev + ' ' + tag)}
                            className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/10 text-emerald-400/60 rounded-lg border border-white/5 transition-all"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-emerald-400/40 uppercase tracking-widest ml-1">Quick Templates</label>
                    <div className="space-y-3">
                      {[
                        { title: 'New Product Launch', text: 'Excited to announce our new [Product Name]! Directly sourced and quality verified. #GlobalTrade #NewArrival' },
                        { title: 'Trade Show Alert', text: 'Visit our team at [Event Name]! We are at Stand [Number]. #TradeShow #BusinessNetworking' },
                        { title: 'Quality Spotlight', text: 'Quality is our priority. Our latest batch is now ISO certified. #QualityControl #ExportImport' }
                      ].map((template) => (
                        <button 
                          key={template.title}
                          onClick={() => setNewPostContent(template.text)}
                          className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-left transition-all group"
                        >
                          <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-all">{template.title}</p>
                          <p className="text-[10px] text-emerald-400/40 line-clamp-1 mt-1">{template.text}</p>
                        </button>
                      ))}
                    </div>
                    
                    <div className="p-4 bg-black/20 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                      <ImageIcon size={24} className="text-emerald-400/20" />
                      <p className="text-[10px] text-emerald-400/40 uppercase tracking-widest">Upload Media</p>
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        id="media-upload"
                        onChange={(e) => setMediaFiles(Array.from(e.target.files || []))}
                      />
                      <label 
                        htmlFor="media-upload"
                        className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all"
                      >
                        Select Files
                      </label>
                      {mediaFiles.length > 0 && (
                        <p className="text-[10px] text-emerald-400 font-bold">{mediaFiles.length} files selected</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="p-2.5 bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 rounded-xl transition-all">
                      <ImageIcon size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        const date = prompt('Enter schedule date (YYYY-MM-DD HH:MM):', new Date().toISOString().slice(0, 16).replace('T', ' '));
                        if (date) setScheduledDate(date);
                      }}
                      className={`p-2.5 border rounded-xl transition-all ${
                        scheduledDate 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-white/5 border-white/10 text-emerald-300 hover:bg-white/10'
                      }`}
                    >
                      <CalendarIcon size={20} />
                    </button>
                    {scheduledDate && (
                      <span className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-widest">
                        Scheduled: {scheduledDate}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setIsNewPostOpen(false);
                        setScheduledDate(null);
                      }}
                      className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 rounded-xl transition-all font-bold text-sm uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handlePostNow}
                      disabled={isPosting || !newPostContent.trim() || selectedPlatforms.length === 0}
                      className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-bold text-sm uppercase tracking-wider"
                    >
                      {isPosting ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                      {isPosting ? 'Processing...' : scheduledDate ? 'Schedule Post' : 'Post Now'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
