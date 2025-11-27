import { useState, useEffect } from 'react';
import { CreditCard, Users, Calendar, MoreVertical, Play, Pause, X, RefreshCw, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
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

const API_URL = import.meta.env.VITE_APP_URL || '';

export default function SubscriptionsManager() {
  const { user } = useAuthStore();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [showExtendModal, setShowExtendModal] = useState<string | null>(null);

  useEffect(() => { fetchSubscriptions(); }, [filter]);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/subscriptions?status=${filter}`, {
        headers: { 'X-User-Id': user?.id || '' },
      });
      if (res.ok) setSubscriptions(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAction = async (subscriptionId: string, action: string, data?: any) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': user?.id || '' },
        body: JSON.stringify({ subscriptionId, action, data }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        fetchSubscriptions();
      } else {
        toast.error(result.error);
      }
    } catch (e) {
      toast.error('Action failed');
    }
    setActionMenu(null);
    setShowExtendModal(null);
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const isExpired = (date: string) => new Date(date) < new Date();

  const statusColors: Record<string, string> = {
    active: 'bg-green-600',
    cancelled: 'bg-red-600',
    expired: 'bg-gray-600',
    paused: 'bg-yellow-600',
    pending_downgrade: 'bg-orange-600',
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard /> Subscriptions</h1>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="input w-40">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="paused">Paused</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-3 text-left">User</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Status</th>
              <th className="p-3">Period</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map(sub => (
              <tr key={sub.id} className="border-t border-gray-700">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <div>
                      <div className="font-medium">{sub.user?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-400">{sub.user?.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <div className="font-medium">{sub.plan?.name}</div>
                  <div className="text-sm text-gray-400">₹{sub.plan?.price}/{sub.plan?.interval}</div>
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${statusColors[sub.status] || 'bg-gray-600'}`}>
                    {sub.status}
                  </span>
                  {sub.cancelAtPeriodEnd && <div className="text-xs text-yellow-400 mt-1">Cancels at period end</div>}
                </td>
                <td className="p-3 text-center text-sm">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar size={14} />
                    {formatDate(sub.currentPeriodStart)} - {formatDate(sub.currentPeriodEnd)}
                  </div>
                  {isExpired(sub.currentPeriodEnd) && <div className="text-xs text-red-400">Expired</div>}
                </td>
                <td className="p-3 text-center relative">
                  <button onClick={() => setActionMenu(actionMenu === sub.id ? null : sub.id)} className="p-2 hover:bg-gray-700 rounded">
                    <MoreVertical size={16} />
                  </button>
                  {actionMenu === sub.id && (
                    <div className="absolute right-0 mt-1 bg-gray-700 rounded-lg shadow-lg z-10 min-w-[160px]">
                      {sub.status === 'active' && (
                        <>
                          <button onClick={() => handleAction(sub.id, 'pause')} className="w-full px-4 py-2 text-left hover:bg-gray-600 flex items-center gap-2">
                            <Pause size={14} /> Pause
                          </button>
                          <button onClick={() => handleAction(sub.id, 'cancel')} className="w-full px-4 py-2 text-left hover:bg-gray-600 flex items-center gap-2 text-red-400">
                            <X size={14} /> Cancel
                          </button>
                        </>
                      )}
                      {(sub.status === 'cancelled' || sub.status === 'paused') && (
                        <button onClick={() => handleAction(sub.id, 'reactivate')} className="w-full px-4 py-2 text-left hover:bg-gray-600 flex items-center gap-2 text-green-400">
                          <Play size={14} /> Reactivate
                        </button>
                      )}
                      <button onClick={() => setShowExtendModal(sub.id)} className="w-full px-4 py-2 text-left hover:bg-gray-600 flex items-center gap-2">
                        <RefreshCw size={14} /> Extend
                      </button>
                      {sub.razorpaySubscriptionId && (
                        <a href={`https://dashboard.razorpay.com/app/subscriptions/${sub.razorpaySubscriptionId}`} target="_blank" rel="noopener noreferrer" className="w-full px-4 py-2 text-left hover:bg-gray-600 flex items-center gap-2 text-blue-400">
                          <ArrowUpRight size={14} /> Razorpay
                        </a>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {subscriptions.length === 0 && <div className="p-8 text-center text-gray-400">No subscriptions found</div>}
      </div>

      {/* Extend Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">Extend Subscription</h3>
            <input type="number" value={extendDays} onChange={e => setExtendDays(parseInt(e.target.value))} className="input w-full mb-4" placeholder="Days to extend" />
            <div className="flex gap-2">
              <button onClick={() => setShowExtendModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleAction(showExtendModal, 'extend', { days: extendDays })} className="btn-primary flex-1">Extend</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
