import React, { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Mic2, Users, CreditCard, Settings, 
  Plus, BarChart3, Loader2 
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const sidebarLinks = [
  { name: 'Overview', path: '/admin', icon: LayoutDashboard },
  { name: 'Podcasts', path: '/admin/podcasts', icon: Mic2 },
  { name: 'Users', path: '/admin/users', icon: Users },
  { name: 'Payments', path: '/admin/payments', icon: CreditCard },
  { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
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
      {/* Sidebar */}
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

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-20 pb-10 px-4 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState({
    totalPodcasts: 0,
    totalUsers: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
  });

  useEffect(() => {
    // Fetch stats from API
    // For now, using placeholder data
    setStats({
      totalPodcasts: 24,
      totalUsers: 1250,
      totalRevenue: 125000,
      activeSubscriptions: 340,
    });
  }, []);

  const statCards = [
    { label: 'Total Podcasts', value: stats.totalPodcasts, icon: Mic2, color: 'text-neon-cyan' },
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'text-neon-purple' },
    { label: 'Revenue', value: `₹${(stats.totalRevenue / 1000).toFixed(0)}K`, icon: CreditCard, color: 'text-neon-green' },
    { label: 'Active Subs', value: stats.activeSubscriptions, icon: BarChart3, color: 'text-amber-400' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-white mb-6">Dashboard Overview</h1>

      {/* Stats Grid */}
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              to="/admin/podcasts/new"
              className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
            >
              <Plus size={18} className="text-neon-cyan" />
              Create New Podcast
            </Link>
            <Link
              to="/admin/users"
              className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
            >
              <Users size={18} className="text-neon-purple" />
              Manage Users
            </Link>
            <Link
              to="/admin/settings"
              className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
            >
              <Settings size={18} className="text-slate-400" />
              Platform Settings
            </Link>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { text: 'New user signed up', time: '2 min ago' },
              { text: 'Podcast "AI Future" published', time: '1 hour ago' },
              { text: 'New subscription purchase', time: '3 hours ago' },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-slate-300 text-sm">{activity.text}</span>
                <span className="text-slate-500 text-xs">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
