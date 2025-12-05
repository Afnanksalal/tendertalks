import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Calendar,
  MoreVertical,
  Play,
  Pause,
  X,
  RefreshCw,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

interface Subscription {
  id: string;
  status: string;
  amount: string;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  razorpaySubscriptionId: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  plan: { id: string; name: string; price: string; interval: string } | null;
}

export default function SubscriptionsManager() {
  const { user, getAuthHeaders } = useAuthStore();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [showExtendModal, setShowExtendModal] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, [filter, user]);

  const fetchSubscriptions = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/admin/subscriptions?status=${filter}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setSubscriptions(await res.json());
    } catch {
      /* Fetch failed silently */
    }
    setLoading(false);
  };

  const handleAction = async (subscriptionId: string, action: string, data?: any) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/admin/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ subscriptionId, action, data }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        fetchSubscriptions();
      } else toast.error(result.error);
    } catch (e) {
      toast.error('Action failed');
    }
    setActionMenu(null);
    setShowExtendModal(null);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const isExpired = (date: string) => new Date(date) < new Date();

  const statusColors: Record<string, string> = {
    active: 'bg-neon-green/20 text-neon-green',
    cancelled: 'bg-red-500/20 text-red-400',
    expired: 'bg-slate-700 text-slate-400',
    paused: 'bg-amber-500/20 text-amber-400',
    pending_downgrade: 'bg-orange-500/20 text-orange-400',
  };

  const filters = ['all', 'active', 'cancelled', 'paused', 'expired'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-2 sm:gap-3">
          <TrendingUp size={20} className="text-neon-green" /> Subscriptions
        </h1>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium capitalize transition-colors whitespace-nowrap flex-shrink-0 ${filter === f ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-slate-800/50 text-slate-400 border border-white/10 hover:bg-slate-800'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {subscriptions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-900/50 border border-white/10 rounded-xl p-12 text-center"
        >
          <TrendingUp size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">No subscriptions found</p>
        </motion.div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {subscriptions.map((sub, idx) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-slate-900/50 border border-white/10 rounded-xl p-3 sm:p-4"
            >
              {/* Mobile Layout */}
              <div className="sm:hidden">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Users size={14} className="text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {sub.user?.name || 'Unknown'}
                      </p>
                      <p className="text-slate-500 text-xs truncate">{sub.user?.email}</p>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setActionMenu(actionMenu === sub.id ? null : sub.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {actionMenu === sub.id && (
                      <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-20 min-w-[140px] py-1">
                        {sub.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleAction(sub.id, 'pause')}
                              className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Pause size={12} /> Pause
                            </button>
                            <button
                              onClick={() => handleAction(sub.id, 'cancel')}
                              className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-slate-700 flex items-center gap-2"
                            >
                              <X size={12} /> Cancel
                            </button>
                          </>
                        )}
                        {(sub.status === 'cancelled' || sub.status === 'paused') && (
                          <button
                            onClick={() => handleAction(sub.id, 'reactivate')}
                            className="w-full px-3 py-2 text-left text-xs text-neon-green hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Play size={12} /> Reactivate
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowExtendModal(sub.id);
                            setActionMenu(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <RefreshCw size={12} /> Extend
                        </button>
                        {sub.razorpaySubscriptionId && (
                          <a
                            href={`https://dashboard.razorpay.com/app/subscriptions/${sub.razorpaySubscriptionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full px-3 py-2 text-left text-xs text-neon-cyan hover:bg-slate-700 flex items-center gap-2"
                          >
                            <ArrowUpRight size={12} /> Razorpay
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium">{sub.plan?.name}</span>
                    <span className="text-slate-500 text-[10px]">
                      ₹{sub.plan?.price}/{sub.plan?.interval}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusColors[sub.status] || 'bg-slate-700 text-slate-400'}`}
                    >
                      {sub.status}
                    </span>
                    <span className="text-slate-500 text-[10px] flex items-center gap-0.5">
                      <Calendar size={10} /> {formatDate(sub.currentPeriodEnd)}
                    </span>
                  </div>
                </div>
                {sub.cancelAtPeriodEnd && (
                  <p className="text-amber-400 text-[10px] mt-1">Cancels at period end</p>
                )}
                {isExpired(sub.currentPeriodEnd) && (
                  <p className="text-red-400 text-[10px] mt-1">Expired</p>
                )}
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                    <Users size={18} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{sub.user?.name || 'Unknown'}</p>
                    <p className="text-slate-500 text-sm">{sub.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-center">
                    <p className="text-white font-medium">{sub.plan?.name}</p>
                    <p className="text-slate-500 text-xs">
                      ₹{sub.plan?.price}/{sub.plan?.interval}
                    </p>
                  </div>
                  <div className="text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[sub.status] || 'bg-slate-700 text-slate-400'}`}
                    >
                      {sub.status}
                    </span>
                    {sub.cancelAtPeriodEnd && (
                      <p className="text-amber-400 text-xs mt-1">Cancels at end</p>
                    )}
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-slate-400 text-sm flex items-center gap-1">
                      <Calendar size={12} /> {formatDate(sub.currentPeriodEnd)}
                    </p>
                    {isExpired(sub.currentPeriodEnd) && (
                      <p className="text-red-400 text-xs">Expired</p>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setActionMenu(actionMenu === sub.id ? null : sub.id)}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {actionMenu === sub.id && (
                      <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-20 min-w-[160px] py-1">
                        {sub.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleAction(sub.id, 'pause')}
                              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Pause size={14} /> Pause
                            </button>
                            <button
                              onClick={() => handleAction(sub.id, 'cancel')}
                              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                            >
                              <X size={14} /> Cancel
                            </button>
                          </>
                        )}
                        {(sub.status === 'cancelled' || sub.status === 'paused') && (
                          <button
                            onClick={() => handleAction(sub.id, 'reactivate')}
                            className="w-full px-4 py-2 text-left text-sm text-neon-green hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Play size={14} /> Reactivate
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowExtendModal(sub.id);
                            setActionMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <RefreshCw size={14} /> Extend
                        </button>
                        {sub.razorpaySubscriptionId && (
                          <a
                            href={`https://dashboard.razorpay.com/app/subscriptions/${sub.razorpaySubscriptionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full px-4 py-2 text-left text-sm text-neon-cyan hover:bg-slate-700 flex items-center gap-2"
                          >
                            <ArrowUpRight size={14} /> Razorpay
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Extend Modal - Mobile Optimized */}
      {showExtendModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExtendModal(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm my-auto shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5">
                <h3 className="text-base sm:text-lg font-bold text-white">Extend Subscription</h3>
                <button
                  onClick={() => setShowExtendModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors touch-feedback"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                <label className="text-xs sm:text-sm text-slate-400 mb-2 block">
                  Days to extend
                </label>
                <input
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white text-base focus:border-neon-cyan/50 focus:outline-none"
                  placeholder="30"
                />
                <p className="text-xs text-slate-500 mt-2">
                  This will add {extendDays} days to the subscription end date.
                </p>
              </div>

              {/* Actions */}
              <div className="p-4 sm:p-6 pt-0 flex gap-3">
                <Button variant="ghost" onClick={() => setShowExtendModal(null)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => handleAction(showExtendModal, 'extend', { days: extendDays })}
                  className="flex-1"
                >
                  Extend
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
