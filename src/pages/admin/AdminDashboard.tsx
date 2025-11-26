import React, { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Mic2, Users, CreditCard, Settings, 
  Plus, BarChart3, Loader2, TrendingUp, Calendar, RotateCcw
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const sidebarLinks = [
  { name: 'Overview', path: '/admin', icon: LayoutDashboard },
  { name: 'Podcasts', path: '/admin/podcasts', icon: Mic2 },
  { name: 'Users', path: '/admin/users', icon: Users },
  { name: 'Payments', path: '/admin/payments', icon: CreditCard },
  { name: 'Refunds', path: '/admin/refunds', icon: RotateCcw },
];

export const AdminLayout: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuthStore();
  const location = useLocation();

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
    <div className="min-h-screen bg-[#030014] flex">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900/50 border-r border-white/5 pt-20 hidden lg:block">
        <div className="p-4">
          <Link
            to="/admin/podcasts/new"
            className="flex items-center justify-center gap-2 w-full py-3 bg-neon-cyan text-slate-900 font-bold rounded-xl hover:bg-neon-cyan/90 transition-colors"
          >
            <Plus size={18} />
            New Podcast
          </Link>
        </div>

        <nav className="px-2 mt-4">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 lg:ml-64 pt-20 pb-10 px-4 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

interface AdminStats {
  totalPodcasts: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
}

interface RecentActivity {
  recentPurchases: any[];
  recentSubscriptions: any[];
  recentUsers: any[];
}

export const AdminOverview: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: { 'X-User-Id': user!.id },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setActivity({
          recentPurchases: data.recentPurchases,
          recentSubscriptions: data.recentSubscriptions,
          recentUsers: data.recentUsers,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Podcasts', value: stats?.totalPodcasts || 0, icon: Mic2, color: 'text-neon-cyan' },
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-neon-purple' },
    { label: 'Revenue', value: `₹${((stats?.totalRevenue || 0) / 1000).toFixed(1)}K`, icon: CreditCard, color: 'text-neon-green' },
    { label: 'Active Subs', value: stats?.activeSubscriptions || 0, icon: TrendingUp, color: 'text-amber-400' },
  ];

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

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-white mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-slate-900/50 border border-white/10 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">{stat.label}</span>
                <Icon size={18} className={stat.color} />
              </div>
              <p className="text-2xl font-display font-bold text-white">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Purchases</h3>
          <div className="space-y-3">
            {activity?.recentPurchases?.length === 0 ? (
              <p className="text-slate-500 text-sm">No purchases yet</p>
            ) : (
              activity?.recentPurchases?.slice(0, 5).map((purchase: any) => (
                <div key={purchase.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm">{purchase.user?.name || purchase.user?.email}</p>
                    <p className="text-slate-500 text-xs">{purchase.podcast?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-neon-green text-sm font-mono">₹{parseFloat(purchase.amount).toFixed(0)}</p>
                    <p className="text-slate-500 text-xs">{formatDate(purchase.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">New Users</h3>
          <div className="space-y-3">
            {activity?.recentUsers?.length === 0 ? (
              <p className="text-slate-500 text-sm">No users yet</p>
            ) : (
              activity?.recentUsers?.slice(0, 5).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                        <Users size={14} className="text-slate-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm">{u.name || 'User'}</p>
                      <p className="text-slate-500 text-xs">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">{formatDate(u.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
