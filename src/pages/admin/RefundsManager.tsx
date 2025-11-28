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
    } catch {
      // Fetch failed silently
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Refund Requests</h1>
          <div className="flex gap-3 sm:gap-4 mt-0.5 sm:mt-1">
            <p className="text-slate-400 text-xs sm:text-sm">
              Pending: <span className="text-amber-400 font-mono">{pendingCount}</span>
            </p>
            <p className="text-slate-400 text-xs sm:text-sm">
              Refunded: <span className="text-neon-green font-mono">₹{totalRefunded.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
        {['all', 'pending', 'approved', 'processed', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              filter === f
                ? 'bg-neon-cyan text-black'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1 sm:ml-2 px-1 sm:px-1.5 py-0.5 bg-amber-500 text-black text-[10px] sm:text-xs rounded-full">
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
        <div className="space-y-3 sm:space-y-4">
          {refunds.map((item) => (
            <motion.div
              key={item.refund.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 border border-white/10 rounded-xl p-3 sm:p-5 hover:border-white/20 transition-colors"
            >
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-slate-400 sm:hidden" />
                      <User size={20} className="text-slate-400 hidden sm:block" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm sm:text-base font-medium truncate">
                          {item.user?.name || item.user?.email || 'Unknown User'}
                        </span>
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold ${getStatusBadge(item.refund.status)}`}>
                          {item.refund.status}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
                        {item.refund.subscriptionId ? 'Subscription Refund' : 'Purchase Refund'}
                      </p>
                      {item.refund.reason && (
                        <p className="text-slate-400 text-xs sm:text-sm mt-1.5 sm:mt-2 italic line-clamp-2">"{item.refund.reason}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {getStatusIcon(item.refund.status)}
                    <span className="text-base sm:text-xl font-mono text-white">
                      ₹{parseFloat(item.refund.amount || '0').toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Meta & Actions Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-3 text-[10px] sm:text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} className="sm:hidden" />
                      <Calendar size={12} className="hidden sm:block" />
                      {new Date(item.refund.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                    {item.refund.razorpayRefundId && (
                      <span className="font-mono truncate max-w-[100px] sm:max-w-none">{item.refund.razorpayRefundId}</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {item.refund.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedRefund(item)}
                        disabled={processingId !== null}
                        className="text-xs sm:text-sm flex-1 sm:flex-none"
                      >
                        Review
                      </Button>
                    )}

                    {item.refund.status === 'approved' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAction(item.refund.id, 'process')}
                          isLoading={processingId === item.refund.id}
                          className="text-xs sm:text-sm flex-1 sm:flex-none"
                        >
                          <span className="hidden sm:inline">Process via Razorpay</span>
                          <span className="sm:hidden">Process</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedRefund(item)}
                          disabled={processingId !== null}
                          className="text-xs sm:text-sm flex-1 sm:flex-none"
                        >
                          <span className="hidden sm:inline">Mark Manual</span>
                          <span className="sm:hidden">Manual</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {item.refund.adminNotes && (
                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Admin Notes</p>
                  <p className="text-xs sm:text-sm text-slate-300">{item.refund.adminNotes}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Review Modal - Mobile Optimized */}
      {selectedRefund && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedRefund(null);
              setAdminNotes('');
              setRazorpayRefundId('');
            }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg my-auto shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5">
                <h3 className="text-base sm:text-lg font-bold text-white">Review Refund</h3>
                <button
                  onClick={() => {
                    setSelectedRefund(null);
                    setAdminNotes('');
                    setRazorpayRefundId('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors touch-feedback"
                >
                  <XCircle size={20} />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto space-y-4">
                {/* Summary Card */}
                <div className="p-3 sm:p-4 bg-slate-800/50 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">User</span>
                    <span className="text-white text-sm truncate ml-2 max-w-[180px]">{selectedRefund.user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Amount</span>
                    <span className="text-neon-green font-mono font-bold">₹{parseFloat(selectedRefund.refund.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Type</span>
                    <span className="text-white text-sm">{selectedRefund.refund.subscriptionId ? 'Subscription' : 'Purchase'}</span>
                  </div>
                </div>

                {selectedRefund.refund.reason && (
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400 mb-1.5">Customer Reason</p>
                    <p className="text-white text-sm bg-slate-800/50 p-3 rounded-xl">{selectedRefund.refund.reason}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs sm:text-sm text-slate-400 mb-1.5 block">Admin Notes</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this refund..."
                    className="w-full p-3 bg-slate-800/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 resize-none focus:border-neon-cyan/50 focus:outline-none"
                    rows={3}
                  />
                </div>

                {selectedRefund.refund.status === 'approved' && (
                  <div>
                    <label className="text-xs sm:text-sm text-slate-400 mb-1.5 block">Razorpay Refund ID</label>
                    <input
                      type="text"
                      value={razorpayRefundId}
                      onChange={(e) => setRazorpayRefundId(e.target.value)}
                      placeholder="rfnd_xxxxxxxxxxxxx"
                      className="w-full p-3 bg-slate-800/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 sm:p-6 pt-0 flex flex-col sm:flex-row gap-2 sm:gap-3">
                {selectedRefund.refund.status === 'pending' && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedRefund(null);
                        setAdminNotes('');
                        setRazorpayRefundId('');
                      }}
                      className="flex-1 order-3 sm:order-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleAction(selectedRefund.refund.id, 'reject')}
                      isLoading={processingId === selectedRefund.refund.id}
                      className="flex-1 order-2"
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleAction(selectedRefund.refund.id, 'approve')}
                      isLoading={processingId === selectedRefund.refund.id}
                      className="flex-1 order-1 sm:order-3"
                    >
                      Approve
                    </Button>
                  </>
                )}

                {selectedRefund.refund.status === 'approved' && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedRefund(null);
                        setAdminNotes('');
                        setRazorpayRefundId('');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleAction(selectedRefund.refund.id, 'mark_processed')}
                      isLoading={processingId === selectedRefund.refund.id}
                      className="flex-1"
                    >
                      Mark Processed
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
};
