import React, { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Clock, Calendar, Crown, ArrowRight, Loader2, Download, Settings, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { Button } from '../components/ui/Button';

export const DashboardPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuthStore();
  const { purchases, subscription, fetchPurchases, fetchSubscription, isLoading, hasActiveSubscription } = useUserStore();

  useEffect(() => {
    if (user) {
      fetchPurchases();
      fetchSubscription();
    }
  }, [user, fetchPurchases, fetchSubscription]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-36 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
            Welcome back, {user.name || 'there'}!
          </h1>
          <p className="text-slate-400">Manage your content and subscription</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subscription Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    hasActiveSubscription() ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-neon-green/20 text-neon-green'
                  }`}>
                    <Crown size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Subscription</h3>
                    <p className="text-sm text-slate-400">
                      {subscription ? subscription.plan?.name : 'Free Plan'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  hasActiveSubscription() 
                    ? 'bg-neon-cyan/20 text-neon-cyan' 
                    : 'bg-neon-green/20 text-neon-green'
                }`}>
                  {hasActiveSubscription() ? 'Premium' : 'Free'}
                </span>
              </div>

              {subscription && hasActiveSubscription() ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                  {subscription.plan?.allowDownloads && (
                    <span className="flex items-center gap-1 text-neon-green">
                      <Download size={14} />
                      Downloads enabled
                    </span>
                  )}
                </div>
              ) : (
                <Link to="/pricing">
                  <Button variant="outline" size="sm" rightIcon={<ArrowRight size={16} />}>
                    View Plans
                  </Button>
                </Link>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              <Link
                to="/browse"
                className="p-4 bg-slate-900/50 border border-white/10 rounded-xl hover:border-neon-cyan/30 transition-colors text-center group"
              >
                <Play size={24} className="mx-auto mb-2 text-slate-400 group-hover:text-neon-cyan transition-colors" />
                <span className="text-sm text-slate-300">Browse</span>
              </Link>
              <Link
                to="/downloads"
                className="p-4 bg-slate-900/50 border border-white/10 rounded-xl hover:border-neon-cyan/30 transition-colors text-center group"
              >
                <Download size={24} className="mx-auto mb-2 text-slate-400 group-hover:text-neon-cyan transition-colors" />
                <span className="text-sm text-slate-300">Downloads</span>
              </Link>
              <Link
                to="/store"
                className="p-4 bg-slate-900/50 border border-white/10 rounded-xl hover:border-neon-cyan/30 transition-colors text-center group"
              >
                <ShoppingBag size={24} className="mx-auto mb-2 text-slate-400 group-hover:text-neon-cyan transition-colors" />
                <span className="text-sm text-slate-300">Store</span>
              </Link>
              <Link
                to="/billing"
                className="p-4 bg-slate-900/50 border border-white/10 rounded-xl hover:border-neon-cyan/30 transition-colors text-center group"
              >
                <Settings size={24} className="mx-auto mb-2 text-slate-400 group-hover:text-neon-cyan transition-colors" />
                <span className="text-sm text-slate-300">Billing</span>
              </Link>
            </motion.div>

            {/* Purchased Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/50 border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Your Library</h3>
                <span className="text-sm text-slate-500">{purchases.length} items</span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-neon-cyan animate-spin" />
                </div>
              ) : purchases.length === 0 ? (
                <div className="text-center py-10">
                  <Play className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">You haven't purchased any content yet</p>
                  <Link to="/browse">
                    <Button variant="outline" size="sm">
                      Browse Content
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {purchases.slice(0, 5).map((item: any) => {
                    const podcast = item.podcast || item;
                    const purchase = item.purchase || item;
                    
                    return (
                      <Link
                        key={purchase.id || item.id}
                        to={`/podcast/${podcast.slug}`}
                        className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group"
                      >
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                          {podcast.thumbnailUrl ? (
                            <img
                              src={podcast.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play size={20} className="text-slate-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium truncate group-hover:text-neon-cyan transition-colors">
                            {podcast.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            {podcast.duration && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {Math.floor(podcast.duration / 60)} min
                              </span>
                            )}
                            <span>
                              {new Date(purchase.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Play size={20} className="text-slate-500 group-hover:text-neon-cyan transition-colors flex-shrink-0" />
                      </Link>
                    );
                  })}
                  
                  {purchases.length > 5 && (
                    <Link
                      to="/downloads"
                      className="block text-center text-sm text-neon-cyan hover:underline py-2"
                    >
                      View all {purchases.length} items →
                    </Link>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/50 border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/10"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan text-xl font-bold border-2 border-neon-cyan/30">
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-white font-bold truncate">{user.name || 'User'}</h3>
                  <p className="text-sm text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <Link to="/settings">
                <Button variant="outline" size="sm" className="w-full">
                  Edit Profile
                </Button>
              </Link>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900/50 border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-sm font-medium text-slate-400 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Purchased</span>
                  <span className="text-white font-bold">{purchases.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Plan</span>
                  <span className={`font-bold ${hasActiveSubscription() ? 'text-neon-cyan' : 'text-neon-green'}`}>
                    {subscription?.plan?.name || 'Free'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Member Since</span>
                  <span className="text-white text-sm">
                    {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Upgrade CTA */}
            {!hasActiveSubscription() && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 rounded-2xl p-6 text-center"
              >
                <Crown className="w-10 h-10 text-neon-cyan mx-auto mb-3" />
                <h3 className="text-white font-bold mb-2">Go Premium</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Unlock all content, downloads, and exclusive features
                </p>
                <Link to="/pricing">
                  <Button size="sm" className="w-full">
                    View Plans
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
