import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Calendar, MoreVertical, Play, Pause, X, RefreshCw, ArrowUpRight, Loader2 } from 'lucide-react';
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
  const { user } = useAuthStore();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [showExtendModal, setShowExtendModal] = useState<string | null>(null);

  useEffect(() => { fetchSubscriptions(); }, [filter, user]);

  const fetchSubscriptions = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/admin/subscriptions?status=${filter}`, { headers: { 'X-User-Id': user.id } });
      if (res.ok) setSubscriptions(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAction = async (subscriptionId: string, action: string, data?: any) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/admin/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
        body: JSON.stringify({ subscriptionId, action, data }),
      });
      const result = await res.json();
      if (res.ok) { toast.success(result.message); fetchSubscriptions(); }
      else toast.error(result.error);
    } catch (e) { toast.error('Action failed'); }
    setActionMenu(null);
    setShowExtendModal(null);
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-neon-cyan animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
          <TrendingUp className="text-neon-green" /> Subscriptions
        </h1>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-slate-800/50 text-slate-400 border border-white/10 hover:bg-slate-800'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {subscriptions.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/50 border border-white/10 rounded-xl p-12 text-center">
          <TrendingUp size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">No subscriptions found</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub, idx) => (
            <motion.div key={sub.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                    <p className="text-slate-500 text-xs">₹{sub.plan?.price}/{sub.plan?.interval}</p>
                  </div>
                  <div className="text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[sub.status] || 'bg-slate-700 text-slate-400'}`}>
                      {sub.status}
                    </span>
                    {sub.cancelAtPeriodEnd && <p className="text-amber-400 text-xs mt-1">Cancels at end</p>}
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-slate-400 text-sm flex items-center gap-1"><Calendar size={12} /> {formatDate(sub.currentPeriodEnd)}</p>
                    {isExpired(sub.currentPeriodEnd) && <p className="text-red-400 text-xs">Expired</p>}
                  </div>
                  <div className="relative">
                    <button onClick={() => setActionMenu(actionMenu === sub.id ? null : sub.id)} 
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                      <MoreVertical size={18} />
                    </button>
                    {actionMenu === sub.id && (
                      <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-20 min-w-[160px] py-1">
                        {sub.status === 'active' && (
                          <>
                            <button onClick={() => handleAction(sub.id, 'pause')} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2">
                              <Pause size={14} /> Pause
                            </button>
                            <button onClick={() => handleAction(sub.id, 'cancel')} className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2">
                              <X size={14} /> Cancel
                            </button>
                          </>
                        )}
                        {(sub.status === 'cancelled' || sub.status === 'paused') && (
                          <button onClick={() => handleAction(sub.id, 'reactivate')} className="w-full px-4 py-2 text-left text-sm text-neon-green hover:bg-slate-700 flex items-center gap-2">
                            <Play size={14} /> Reactivate
                          </button>
                        )}
                        <button onClick={() => { setShowExtendModal(sub.id); setActionMenu(null); }} className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2">
                          <RefreshCw size={14} /> Extend
                        </button>
                        {sub.razorpaySubscriptionId && (
                          <a href={`https://dashboard.razorpay.com/app/subscriptions/${sub.razorpaySubscriptionId}`} target="_blank" rel="noopener noreferrer"
                            className="w-full px-4 py-2 text-left text-sm text-neon-cyan hover:bg-slate-700 flex items-center gap-2">
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

      {showExtendModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Extend Subscription</h3>
            <input type="number" value={extendDays} onChange={e => setExtendDays(parseInt(e.target.value) || 0)} 
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white mb-4 focus:border-neon-cyan/50 focus:outline-none" placeholder="Days to extend" />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowExtendModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => handleAction(showExtendModal, 'extend', { days: extendDays })} className="flex-1">Extend</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
