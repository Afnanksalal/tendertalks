import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Receipt, CreditCard, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { SEO } from '../components/SEO';

interface Payment {
  id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  razorpayPaymentId: string | null;
  createdAt: string;
}

interface RefundRequest {
  id: string;
  amount: string;
  currency: string;
  status: string;
  reason: string | null;
  createdAt: string;
  processedAt: string | null;
}

export const BillingPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/users/payments', {
        headers: { 'X-User-Id': user!.id },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setRefunds(data.refunds || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (authLoading) {
    return <div className="min-h-screen bg-[#030014] flex items-center justify-center"><Loader2 className="w-8 h-8 text-neon-cyan animate-spin" /></div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': case 'processed': return <CheckCircle size={16} className="text-green-400" />;
      case 'pending': case 'approved': return <Clock size={16} className="text-yellow-400" />;
      case 'failed': case 'rejected': return <XCircle size={16} className="text-red-400" />;
      case 'refunded': return <RefreshCw size={16} className="text-purple-400" />;
      default: return <AlertCircle size={16} className="text-gray-400" />;
    }
  };

  const typeLabels: Record<string, string> = {
    subscription: 'Subscription',
    subscription_renewal: 'Renewal',
    purchase: 'Purchase',
    merch: 'Merchandise',
    invoice: 'Invoice',
    upgrade: 'Plan Upgrade',
    downgrade: 'Plan Downgrade',
  };

  return (
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-36 pb-20 px-4">
      <SEO title="Billing" noIndex />
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/settings" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
            <ArrowLeft size={18} /> Back to Settings
          </Link>

          <h1 className="text-3xl font-display font-bold text-white mb-2">Billing & Payments</h1>
          <p className="text-slate-400 mb-8">View your payment history and refund requests</p>

          {/* Refund Requests */}
          {refunds.length > 0 && (
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <RefreshCw size={20} /> Refund Requests
              </h2>
              <div className="space-y-3">
                {refunds.map(refund => (
                  <div key={refund.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-slate-800/50 rounded-xl gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {statusIcon(refund.status)}
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm sm:text-base">₹{parseFloat(refund.amount).toLocaleString()}</p>
                        <p className="text-xs sm:text-sm text-slate-400 truncate">{refund.reason || 'No reason provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        refund.status === 'processed' ? 'bg-green-500/20 text-green-400' :
                        refund.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        refund.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {refund.status}
                      </span>
                      <p className="text-xs text-slate-500">{formatDate(refund.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Receipt size={20} /> Payment History
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="w-6 h-6 text-neon-cyan animate-spin" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-10">
                <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">No payment history yet</p>
                <Link to="/pricing">
                  <Button variant="outline" size="sm">View Plans</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map(payment => (
                  <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {statusIcon(payment.status)}
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm sm:text-base truncate">{typeLabels[payment.type] || payment.type}</p>
                        <p className="text-xs sm:text-sm text-slate-400">{formatDate(payment.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-7 sm:pl-0">
                      <p className={`font-mono font-bold text-sm sm:text-base ${payment.status === 'refunded' ? 'text-purple-400 line-through' : 'text-green-400'}`}>
                        ₹{parseFloat(payment.amount).toLocaleString()}
                      </p>
                      {payment.razorpayPaymentId && (
                        <a 
                          href={`https://dashboard.razorpay.com/app/payments/${payment.razorpayPaymentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline flex items-center gap-1 touch-feedback"
                        >
                          View <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-slate-900/30 border border-white/5 rounded-xl">
            <p className="text-slate-400 text-sm">
              Need help with a payment? <Link to="/refund-policy" className="text-neon-cyan hover:underline">View our refund policy</Link> or contact support.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
