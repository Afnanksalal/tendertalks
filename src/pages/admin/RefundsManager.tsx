import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, Loader2, CheckCircle, XCircle, Clock, 
  AlertTriangle, DollarSign, User, Calendar
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

interface RefundRequest {
  refund: {
    id: string;
    userId: string;
    subscriptionId: string | null;
    purchaseId: string | null;
    amount: string;
    currency: string;
    reason: string | null;
    status: 'pending' | 'approved' | 'processed' | 'rejected';
    razorpayRefundId: string | null;
    adminNotes: string | null;
    createdAt: string;
    processedAt: string | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export const RefundsManager: React.FC = () => {
  const { user } = useAuthStore();
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [razorpayRefundId, setRazorpayRefundId] = useState('');

  useEffect(() => {
    if (user) {
      fetchRefunds();
    }
  }, [user, filter]);

  const fetchRefunds = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);

      const response = await fetch(`/api/admin/refunds?${params}`, {
        headers: { 'X-User-Id': user!.id },
      });
      if (response.ok) {
        const data = await response.json();
        setRefunds(data);
      }
    } catch (error) {
      console.error('Failed to fetch refunds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (refundId: string, action: string, notes?: string, razorpayId?: string) => {
    setProcessingId(refundId);
    try {
      const response = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user!.id 
        },
        body: JSON.stringify({ 
          refundId, 
          action, 
          adminNotes: notes || adminNotes,
          razorpayRefundId: razorpayId || razorpayRefundId,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message);
        setSelectedRefund(null);
        setAdminNotes('');
        setRazorpayRefundId('');
        await fetchRefunds();
      } else {
        toast.error(result.error || 'Action failed');
        if (result.manualRefundRequired) {
          toast('Process refund manually via Razorpay dashboard', { icon: '⚠️' });
        }
      }
    } catch (error) {
      toast.error('Failed to process action');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-500/20 text-amber-400',
      approved: 'bg-blue-500/20 text-blue-400',
      processed: 'bg-neon-green/20 text-neon-green',
      rejected: 'bg-red-500/20 text-red-400',
    };
    return styles[status as keyof typeof styles] || 'bg-slate-800 text-slate-400';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed': return <CheckCircle size={16} className="text-neon-green" />;
      case 'rejected': return <XCircle size={16} className="text-red-400" />;
      case 'approved': return <AlertTriangle size={16} className="text-blue-400" />;
      default: return <Clock size={16} className="text-amber-400" />;
    }
  };

  const pendingCount = refunds.filter(r => r.refund.status === 'pending').length;
  const totalRefunded = refunds
    .filter(r => r.refund.status === 'processed')
    .reduce((sum, r) => sum + parseFloat(r.refund.amount || '0'), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Refund Requests</h1>
          <div className="flex gap-4 mt-1">
            <p className="text-slate-400 text-sm">
              Pending: <span className="text-amber-400 font-mono">{pendingCount}</span>
            </p>
            <p className="text-slate-400 text-sm">
              Total Refunded: <span className="text-neon-green font-mono">₹{totalRefunded.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'pending', 'approved', 'processed', 'rejected'].map((f) => (
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
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-black text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
        </div>
      ) : refunds.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 border border-white/5 rounded-2xl">
          <CreditCard className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No refund requests</h3>
          <p className="text-slate-400">Refund requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {refunds.map((item) => (
            <motion.div
              key={item.refund.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">
                        {item.user?.name || item.user?.email || 'Unknown User'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusBadge(item.refund.status)}`}>
                        {item.refund.status}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                      {item.refund.subscriptionId ? 'Subscription Refund' : 'Purchase Refund'}
                    </p>
                    {item.refund.reason && (
                      <p className="text-slate-400 text-sm mt-2 italic">"{item.refund.reason}"</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(item.refund.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                      {item.refund.razorpayRefundId && (
                        <span className="font-mono">{item.refund.razorpayRefundId}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {getStatusIcon(item.refund.status)}
                      <span className="text-xl font-mono text-white">
                        ₹{parseFloat(item.refund.amount || '0').toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {item.refund.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedRefund(item)}
                        disabled={processingId !== null}
                      >
                        Review
                      </Button>
                    </div>
                  )}

                  {item.refund.status === 'approved' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(item.refund.id, 'process')}
                        isLoading={processingId === item.refund.id}
                      >
                        Process via Razorpay
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedRefund(item)}
                        disabled={processingId !== null}
                      >
                        Mark Manual
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {item.refund.adminNotes && (
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Admin Notes</p>
                  <p className="text-sm text-slate-300">{item.refund.adminNotes}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full"
          >
            <h3 className="text-xl font-bold text-white mb-4">Review Refund Request</h3>
            
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-400">User</span>
                  <span className="text-white">{selectedRefund.user?.email}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-400">Amount</span>
                  <span className="text-white font-mono">₹{parseFloat(selectedRefund.refund.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Type</span>
                  <span className="text-white">{selectedRefund.refund.subscriptionId ? 'Subscription' : 'Purchase'}</span>
                </div>
              </div>

              {selectedRefund.refund.reason && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Customer Reason</p>
                  <p className="text-white bg-slate-800/50 p-3 rounded-lg">{selectedRefund.refund.reason}</p>
                </div>
              )}

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this refund..."
                  className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 resize-none"
                  rows={3}
                />
              </div>

              {selectedRefund.refund.status === 'approved' && (
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Razorpay Refund ID (for manual refunds)</label>
                  <input
                    type="text"
                    value={razorpayRefundId}
                    onChange={(e) => setRazorpayRefundId(e.target.value)}
                    placeholder="rfnd_xxxxxxxxxxxxx"
                    className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => {
                setSelectedRefund(null);
                setAdminNotes('');
                setRazorpayRefundId('');
              }} className="flex-1">
                Cancel
              </Button>
              
              {selectedRefund.refund.status === 'pending' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => handleAction(selectedRefund.refund.id, 'reject')}
                    isLoading={processingId === selectedRefund.refund.id}
                    className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleAction(selectedRefund.refund.id, 'approve')}
                    isLoading={processingId === selectedRefund.refund.id}
                    className="flex-1"
                  >
                    Approve
                  </Button>
                </>
              )}

              {selectedRefund.refund.status === 'approved' && (
                <Button
                  onClick={() => handleAction(selectedRefund.refund.id, 'mark_processed')}
                  isLoading={processingId === selectedRefund.refund.id}
                  className="flex-1"
                >
                  Mark as Processed
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
