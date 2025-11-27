import React, { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Mic2, Users, CreditCard, Settings,
  Plus, Loader2, TrendingUp, Calendar, RotateCcw,
  Package, Tag, Receipt, AlertCircle, ArrowUpRight, ArrowDownRight,
  Menu, X, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const sidebarLinks = [
  { name: 'Overview', path: '/admin', icon: LayoutDashboard },
  { name: 'Podcasts', path: '/admin/podcasts', icon: Mic2 },
  { name: 'Users', path: '/admin/users', icon: Users },
  { name: 'Payments', path: '/admin/payments', icon: CreditCard },
  { name: 'Invoices', path: '/admin/invoices', icon: Receipt },
  { name: 'Subscriptions', path: '/admin/subscriptions', icon: TrendingUp },
  { name: 'Refunds', path: '/admin/refunds', icon: RotateCcw },
  { name: 'Products', path: '/admin/products', icon: Package },
  { name: 'Plans', path: '/admin/plans', icon: Tag },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuthStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Get current page name for mobile header
  const currentPage = sidebarLinks.find(link => link.path === location.pathname)?.name || 'Admin';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#030014] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900/50 border-r border-white/5 pt-24 hidden lg:block overflow-y-auto">
        <div className="p-4">
          <Link to="/admin/podcasts/new"
            className="flex items-center justify-center gap-2 w-full py-3 bg-neon-cyan text-slate-900 font-bold rounded-xl hover:bg-neon-cyan/90 transition-colors">
            <Plus size={18} /> New Podcast
          </Link>
        </div>
        <nav className="px-2 mt-2">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link key={link.path} to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <Icon size={18} />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Admin Sidebar Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            {/* Sidebar Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 max-w-[80vw] bg-slate-900 border-r border-white/10 z-[70] flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <span className="text-white font-bold text-lg">Admin Panel</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* New Podcast Button */}
              <div className="p-3">
                <Link
                  to="/admin/podcasts/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-neon-cyan text-slate-900 font-bold rounded-xl hover:bg-neon-cyan/90 transition-colors text-sm"
                >
                  <Plus size={16} /> New Podcast
                </Link>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 overflow-y-auto px-2 pb-4">
                {sidebarLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-colors ${
                        isActive 
                          ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' 
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-sm font-medium">{link.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Back to Site */}
              <div className="p-3 border-t border-white/10">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition-colors text-sm"
                >
                  ← Back to Site
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Admin Header - Floating Button (Bottom Left Corner) */}
      <div className="lg:hidden fixed bottom-6 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-slate-900/95 backdrop-blur-lg border border-neon-cyan/30 rounded-full shadow-lg shadow-neon-cyan/10 text-white font-medium touch-feedback"
        >
          <Menu size={18} className="text-neon-cyan" />
          <span className="text-sm">{currentPage}</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-32 sm:pt-36 lg:pt-32 pb-28 lg:pb-10 px-4 sm:px-5 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

interface Stats {
  totalPodcasts: number;
  publishedPodcasts: number;
  totalUsers: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  totalProducts: number;
  totalCategories: number;
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  purchaseRevenue: number;
  subscriptionRevenue: number;
  merchRevenue: number;
  newUsersThisMonth: number;
  userGrowth: number;
  newSubsThisMonth: number;
  pendingRefunds: number;
  totalRefunded: number;
  totalViews: number;
  totalPlays: number;
  completedPlays: number;
  totalDownloads: number;
  newsletterSubscribers: number;
  avgOrderValue: number;
  conversionRate: number;
  churnRate: number;
}

interface ChartData {
  revenueByDay: { date: string; day: string; revenue: number; purchases: number; subscriptions: number; merch: number }[];
  usersByDay: { date: string; day: string; count: number }[];
  planDistribution: { planId: string; planName: string; planPrice: string; count: number }[];
  revenueByCategory: { categoryId: string; categoryName: string; revenue: string; count: number }[];
  topPodcasts: { id: string; title: string; slug: string; thumbnailUrl: string | null; viewCount: number; isFree: boolean; price: string; purchaseCount: number; revenue: string }[];
  topByViews: { id: string; title: string; thumbnailUrl: string | null; viewCount: number }[];
  mostPlayed: { podcastId: string; title: string; thumbnailUrl: string | null; playCount: number; completionRate: number }[];
  topMerch: { id: string; name: string; imageUrl: string | null; price: string; stockQuantity: number; soldCount: number; revenue: string }[];
}

export const AdminOverview: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', { headers: { 'X-User-Id': user!.id } });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setCharts(data.charts);
        setRecentPurchases(data.recentPurchases || []);
        setRecentUsers(data.recentUsers || []);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-neon-cyan animate-spin" /></div>;
  }

  const maxRevenue = Math.max(...(charts?.revenueByDay.map(d => d.revenue) || [1]), 1);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-white mb-6">Dashboard Overview</h1>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {[
          { label: 'Total Revenue', value: `₹${((stats?.totalRevenue || 0) / 1000).toFixed(1)}K`, icon: CreditCard, color: 'text-neon-green', bg: 'bg-neon-green/10' },
          { label: 'Monthly Revenue', value: `₹${((stats?.monthlyRevenue || 0) / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'text-neon-cyan', bg: 'bg-neon-cyan/10', growth: stats?.revenueGrowth },
          { label: 'Active Subs', value: stats?.activeSubscriptions || 0, icon: Users, color: 'text-neon-purple', bg: 'bg-neon-purple/10' },
          { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-amber-400', bg: 'bg-amber-400/10', growth: stats?.userGrowth },
          { label: 'Podcasts', value: `${stats?.publishedPodcasts || 0}/${stats?.totalPodcasts || 0}`, icon: Mic2, color: 'text-pink-400', bg: 'bg-pink-400/10' },
        ].map((stat, idx) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="bg-slate-900/50 border border-white/10 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-slate-400 text-[10px] sm:text-xs truncate pr-1">{stat.label}</span>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon size={12} className={`${stat.color} sm:hidden`} />
                <stat.icon size={14} className={`${stat.color} hidden sm:block`} />
              </div>
            </div>
            <p className={`text-base sm:text-xl font-display font-bold ${stat.color}`}>{stat.value}</p>
            {stat.growth !== undefined && (
              <p className={`text-[10px] sm:text-xs mt-0.5 flex items-center gap-0.5 ${stat.growth >= 0 ? 'text-neon-green' : 'text-red-400'}`}>
                {stat.growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {Math.abs(stat.growth).toFixed(1)}% vs last month
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {[
          { label: 'New Users (30d)', value: stats?.newUsersThisMonth || 0, trend: stats?.userGrowth >= 0 ? 'up' : 'down' },
          { label: 'New Subs (30d)', value: stats?.newSubsThisMonth || 0, trend: 'up' },
          { label: 'Total Views', value: stats?.totalViews?.toLocaleString() || 0, trend: 'neutral' },
          { label: 'Total Plays', value: stats?.totalPlays || 0, trend: 'neutral' },
          { label: 'Downloads', value: stats?.totalDownloads || 0, trend: 'neutral' },
          { label: 'Pending Refunds', value: stats?.pendingRefunds || 0, trend: 'alert', link: '/admin/refunds' },
        ].map((stat, idx) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + idx * 0.05 }}
            className="bg-slate-900/50 border border-white/10 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-slate-400 text-[10px] sm:text-xs mb-0.5 sm:mb-1 truncate">{stat.label}</p>
                <p className="text-base sm:text-lg font-bold text-white">{stat.value}</p>
              </div>
              {stat.trend === 'up' && <ArrowUpRight className="text-neon-green flex-shrink-0" size={16} />}
              {stat.trend === 'down' && <ArrowDownRight className="text-red-400 flex-shrink-0" size={16} />}
              {stat.trend === 'alert' && Number(stat.value) > 0 && (
                <Link to={stat.link!}><AlertCircle className="text-amber-400 flex-shrink-0" size={16} /></Link>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-neon-green/10 to-transparent border border-neon-green/20 rounded-xl p-3 sm:p-4">
          <p className="text-slate-400 text-[10px] sm:text-xs mb-1">Avg Order Value</p>
          <p className="text-lg sm:text-2xl font-bold text-neon-green">₹{stats?.avgOrderValue?.toFixed(0) || 0}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-gradient-to-br from-neon-cyan/10 to-transparent border border-neon-cyan/20 rounded-xl p-3 sm:p-4">
          <p className="text-slate-400 text-[10px] sm:text-xs mb-1">Conversion Rate</p>
          <p className="text-lg sm:text-2xl font-bold text-neon-cyan">{stats?.conversionRate?.toFixed(1) || 0}%</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-neon-purple/10 to-transparent border border-neon-purple/20 rounded-xl p-3 sm:p-4">
          <p className="text-slate-400 text-[10px] sm:text-xs mb-1">Churn Rate</p>
          <p className="text-lg sm:text-2xl font-bold text-neon-purple">{stats?.churnRate?.toFixed(1) || 0}%</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="bg-gradient-to-br from-amber-400/10 to-transparent border border-amber-400/20 rounded-xl p-3 sm:p-4">
          <p className="text-slate-400 text-[10px] sm:text-xs mb-1">Newsletter Subs</p>
          <p className="text-lg sm:text-2xl font-bold text-amber-400">{stats?.newsletterSubscribers || 0}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Revenue Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Revenue (Last 7 Days)</h3>
          <div className="flex items-end gap-1 sm:gap-2 h-32 sm:h-40">
            {charts?.revenueByDay.map((day, idx) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 sm:gap-2">
                <div className="w-full bg-slate-800 rounded-t relative" style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 5)}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/50 to-neon-cyan/20 rounded-t" />
                  {day.revenue > 0 && (
                    <span className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 text-[9px] sm:text-xs text-neon-cyan font-mono whitespace-nowrap">
                      ₹{day.revenue >= 1000 ? `${(day.revenue/1000).toFixed(0)}K` : day.revenue}
                    </span>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs text-slate-500">{day.day}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Plan Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Subscription Plans</h3>
          {charts?.planDistribution && charts.planDistribution.length > 0 ? (
            <div className="space-y-2.5 sm:space-y-3">
              {charts.planDistribution.map((plan, idx) => {
                const total = charts.planDistribution.reduce((a, b) => a + b.count, 0);
                const percent = total > 0 ? (plan.count / total) * 100 : 0;
                const colors = ['bg-neon-cyan', 'bg-neon-purple', 'bg-neon-green', 'bg-amber-400'];
                return (
                  <div key={plan.planId}>
                    <div className="flex justify-between text-xs sm:text-sm mb-1">
                      <span className="text-slate-300 truncate pr-2">{plan.planName}</span>
                      <span className="text-slate-400 flex-shrink-0">{plan.count} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[idx % colors.length]} rounded-full`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-6 sm:py-8">No active subscriptions</p>
          )}
        </motion.div>
      </div>

      {/* Top Podcasts & Most Viewed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Top Podcasts by Revenue */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-white">Top by Revenue</h3>
            <Link to="/admin/podcasts" className="text-neon-cyan text-xs hover:underline">View all</Link>
          </div>
          {charts?.topPodcasts && charts.topPodcasts.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {charts.topPodcasts.slice(0, 5).map((podcast, idx) => (
                <Link key={podcast.id} to={`/podcast/${podcast.slug}`} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <span className="text-slate-500 text-xs sm:text-sm w-4 sm:w-5 flex-shrink-0">{idx + 1}</span>
                  {podcast.thumbnailUrl ? (
                    <img src={podcast.thumbnailUrl} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0"><Mic2 size={14} className="text-slate-600" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs sm:text-sm font-medium truncate">{podcast.title}</p>
                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500">
                      <span>{podcast.purchaseCount} sales</span>
                      <span>•</span>
                      <span>{podcast.viewCount?.toLocaleString() || 0} views</span>
                    </div>
                  </div>
                  <span className="text-neon-green text-xs sm:text-sm font-mono flex-shrink-0">₹{parseFloat(podcast.revenue || '0').toLocaleString()}</span>
                </Link>
              ))}
              {charts.topPodcasts.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No data yet</p>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-6 sm:py-8">No data available</p>
          )}
        </motion.div>

        {/* Most Played */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Most Played</h3>
          {charts?.mostPlayed && charts.mostPlayed.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {charts.mostPlayed.map((podcast, idx) => (
                <div key={podcast.podcastId} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <span className="text-slate-500 text-xs sm:text-sm w-4 sm:w-5 flex-shrink-0">{idx + 1}</span>
                  {podcast.thumbnailUrl ? (
                    <img src={podcast.thumbnailUrl} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0"><Mic2 size={14} className="text-slate-600" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs sm:text-sm font-medium truncate">{podcast.title}</p>
                    <p className="text-slate-500 text-[10px] sm:text-xs">{podcast.playCount} plays</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-neon-cyan text-xs sm:text-sm font-mono">{podcast.completionRate}%</p>
                    <p className="text-slate-600 text-[10px]">completion</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-6 sm:py-8">No play data yet</p>
          )}
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Purchases */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-white">Recent Purchases</h3>
            <Link to="/admin/payments" className="text-neon-cyan text-xs sm:text-sm hover:underline">View all</Link>
          </div>
          {recentPurchases.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {recentPurchases.slice(0, 5).map((purchase: any) => (
                <div key={purchase.id} className="flex items-center justify-between py-1.5 sm:py-2 border-b border-white/5 last:border-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-white text-xs sm:text-sm truncate">{purchase.user?.name || purchase.user?.email || 'Unknown'}</p>
                    <p className="text-slate-500 text-[10px] sm:text-xs truncate">{purchase.podcast?.title}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-neon-green text-xs sm:text-sm font-mono">₹{parseFloat(purchase.amount).toFixed(0)}</p>
                    <p className="text-slate-500 text-[10px] sm:text-xs">{formatDate(purchase.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-6 sm:py-8">No purchases yet</p>
          )}
        </motion.div>

        {/* Recent Users */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
          className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-white">Recent Users</h3>
            <Link to="/admin/users" className="text-neon-cyan text-xs sm:text-sm hover:underline">View all</Link>
          </div>
          {recentUsers.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {recentUsers.slice(0, 5).map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 py-1.5 sm:py-2 border-b border-white/5 last:border-0">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-neon-cyan text-xs font-bold">{(u.name || u.email)?.[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs sm:text-sm truncate">{u.name || 'No name'}</p>
                    <p className="text-slate-500 text-[10px] sm:text-xs truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${u.role === 'admin' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-slate-700 text-slate-400'}`}>
                      {u.role}
                    </span>
                    <p className="text-slate-500 text-[10px] mt-0.5">{formatDate(u.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-6 sm:py-8">No users yet</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};
