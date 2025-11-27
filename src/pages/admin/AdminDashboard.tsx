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
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900/50 border-r border-white/5 pt-20 hidden lg:block overflow-y-auto">
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

      {/* Mobile Admin Header */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-2 text-white font-medium"
          >
            <Menu size={20} className="text-slate-400" />
            <span>{currentPage}</span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          <Link
            to="/admin/podcasts/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-cyan text-slate-900 text-sm font-bold rounded-lg"
          >
            <Plus size={16} /> New
          </Link>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/5"
            >
              <nav className="p-2 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-1">
                  {sidebarLinks.map((link) => {
                    const isActive = location.pathname === link.path;
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive 
                            ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Icon size={16} />
                        {link.name}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-32 lg:pt-20 pb-10 px-4 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

interface Stats {
  totalPodcasts: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalProducts: number;
  totalRevenue: number;
  monthlyRevenue: number;
  newUsersThisMonth: number;
  newSubsThisMonth: number;
  pendingRefunds: number;
}

interface ChartData {
  revenueByDay: { date: string; day: string; revenue: number }[];
  planDistribution: { planId: string; planName: string; count: number }[];
  topPodcasts: { id: string; title: string; thumbnailUrl: string | null; purchaseCount: number; revenue: string }[];
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total Revenue', value: `₹${((stats?.totalRevenue || 0) / 1000).toFixed(1)}K`, icon: CreditCard, color: 'text-neon-green', bg: 'bg-neon-green/10' },
          { label: 'Monthly Revenue', value: `₹${((stats?.monthlyRevenue || 0) / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
          { label: 'Active Subs', value: stats?.activeSubscriptions || 0, icon: Users, color: 'text-neon-purple', bg: 'bg-neon-purple/10' },
          { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'Podcasts', value: stats?.totalPodcasts || 0, icon: Mic2, color: 'text-pink-400', bg: 'bg-pink-400/10' },
        ].map((stat, idx) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={14} className={stat.color} />
              </div>
            </div>
            <p className={`text-xl font-display font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'New Users (30d)', value: stats?.newUsersThisMonth || 0, trend: 'up' },
          { label: 'New Subs (30d)', value: stats?.newSubsThisMonth || 0, trend: 'up' },
          { label: 'Products', value: stats?.totalProducts || 0, trend: 'neutral' },
          { label: 'Pending Refunds', value: stats?.pendingRefunds || 0, trend: 'alert', link: '/admin/refunds' },
        ].map((stat, idx) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + idx * 0.05 }}
            className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
              </div>
              {stat.trend === 'up' && <ArrowUpRight className="text-neon-green" size={20} />}
              {stat.trend === 'alert' && stat.value > 0 && (
                <Link to={stat.link!}><AlertCircle className="text-amber-400" size={20} /></Link>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-slate-900/50 border border-white/10 rounded-xl p-5">
          <h3 className="text-lg font-bold text-white mb-4">Revenue (Last 7 Days)</h3>
          <div className="flex items-end gap-2 h-40">
            {charts?.revenueByDay.map((day, idx) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-800 rounded-t relative" style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 5)}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/50 to-neon-cyan/20 rounded-t" />
                  {day.revenue > 0 && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-neon-cyan font-mono">
                      ₹{day.revenue >= 1000 ? `${(day.revenue/1000).toFixed(1)}K` : day.revenue}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{day.day}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Plan Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
          <h3 className="text-lg font-bold text-white mb-4">Subscription Plans</h3>
          {charts?.planDistribution && charts.planDistribution.length > 0 ? (
            <div className="space-y-3">
              {charts.planDistribution.map((plan, idx) => {
                const total = charts.planDistribution.reduce((a, b) => a + b.count, 0);
                const percent = total > 0 ? (plan.count / total) * 100 : 0;
                const colors = ['bg-neon-cyan', 'bg-neon-purple', 'bg-neon-green', 'bg-amber-400'];
                return (
                  <div key={plan.planId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{plan.planName}</span>
                      <span className="text-slate-400">{plan.count} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[idx % colors.length]} rounded-full`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No active subscriptions</p>
          )}
        </motion.div>
      </div>

      {/* Top Podcasts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Podcasts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
          <h3 className="text-lg font-bold text-white mb-4">Top Podcasts</h3>
          {charts?.topPodcasts && charts.topPodcasts.length > 0 ? (
            <div className="space-y-3">
              {charts.topPodcasts.filter(p => p.purchaseCount > 0).slice(0, 5).map((podcast, idx) => (
                <div key={podcast.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <span className="text-slate-500 text-sm w-5">{idx + 1}</span>
                  {podcast.thumbnailUrl ? (
                    <img src={podcast.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center"><Mic2 size={16} className="text-slate-600" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{podcast.title}</p>
                    <p className="text-slate-500 text-xs">{podcast.purchaseCount} purchases</p>
                  </div>
                  <span className="text-neon-green text-sm font-mono">₹{parseFloat(podcast.revenue || '0').toLocaleString()}</span>
                </div>
              ))}
              {charts.topPodcasts.filter(p => p.purchaseCount > 0).length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No purchases yet</p>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No data available</p>
          )}
        </motion.div>

        {/* Recent Purchases */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-slate-900/50 border border-white/10 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Recent Purchases</h3>
            <Link to="/admin/payments" className="text-neon-cyan text-sm hover:underline">View all</Link>
          </div>
          {recentPurchases.length > 0 ? (
            <div className="space-y-3">
              {recentPurchases.slice(0, 5).map((purchase: any) => (
                <div key={purchase.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm">{purchase.user?.name || purchase.user?.email || 'Unknown'}</p>
                    <p className="text-slate-500 text-xs truncate max-w-[150px]">{purchase.podcast?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-neon-green text-sm font-mono">₹{parseFloat(purchase.amount).toFixed(0)}</p>
                    <p className="text-slate-500 text-xs">{formatDate(purchase.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No purchases yet</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};
