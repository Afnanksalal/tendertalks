import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface Payment {
  id: string;
  type: 'purchase' | 'subscription' | 'merch';
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  razorpayPaymentId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  podcast?: { id: string; title: string } | null;
  plan?: { id: string; name: string; price: string } | null;
}

export const PaymentsManager: React.FC = () => {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user, filter]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);

      const response = await fetch(`/api/admin/payments?${params}`, {
        headers: { 'X-User-Id': user!.id },
      });
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'active':
        return <CheckCircle size={16} className="text-neon-green" />;
      case 'failed':
      case 'cancelled':
        return <XCircle size={16} className="text-red-400" />;
      default:
        return <Clock size={16} className="text-amber-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase': return 'Podcast Purchase';
      case 'subscription': return 'Subscription';
      case 'merch': return 'Merch Order';
      default: return type;
    }
  };

  const totalRevenue = payments
    .filter(p => ['completed', 'paid', 'active'].includes(p.status))
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Payments</h1>
          <p className="text-slate-400 text-sm mt-1">
            Total Revenue: <span className="text-neon-green font-mono">₹{totalRevenue.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'purchases', 'subscriptions', 'merch'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-neon-cyan text-black'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 border border-white/5 rounded-2xl">
          <CreditCard className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No payments yet</h3>
          <p className="text-slate-400">Payments will appear here once customers make purchases</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                    <CreditCard size={18} className="text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {payment.user?.name || payment.user?.email || 'Unknown'}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
                        {getTypeLabel(payment.type)}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm">
                      {payment.podcast?.title || payment.plan?.name || 'Order'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    {getStatusIcon(payment.status)}
                    <span className="text-lg font-mono text-white">
                      ₹{parseFloat(payment.amount || '0').toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">
                    {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {payment.razorpayPaymentId && (
                    <p className="text-slate-600 text-xs font-mono mt-1">
                      {payment.razorpayPaymentId}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
