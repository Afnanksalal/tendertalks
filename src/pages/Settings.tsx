import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Mail, Camera, Loader2, CreditCard, Calendar, 
  AlertTriangle, RefreshCw, XCircle, ArrowRight, Clock
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cancelSubscription, reactivateSubscription, requestRefund } from '../api/subscriptions';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { user, isLoading: authLoading, updateProfile } = useAuthStore();
  const { subscription, fetchSubscription, hasActiveSubscription } = useUserStore();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user, fetchSubscription]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({ name });
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSubscription = async (immediate: boolean = false) => {
    if (!subscription) return;
    setIsCancelling(true);
    try {
      const result = await cancelSubscription(user.id, { immediate, reason: cancelReason });
      toast.success(result.message);
      setShowCancelModal(false);
      setCancelReason('');
      await fetchSubscription();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivate = async () => {
    if (!subscription) return;
    setIsReactivating(true);
    try {
      const result = await reactivateSubscription(user.id);
      toast.success(result.message);
      await fetchSubscription();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reactivate subscription');
    } finally {
      setIsReactivating(false);
    }
  };

  const handleRequestRefund = async () => {
    if (!subscription) return;
    setIsRequestingRefund(true);
    try {
      const result = await requestRefund(user.id, {
        subscriptionId: subscription.id,
        reason: refundReason,
      });
      toast.success(result.message);
      setShowRefundModal(false);
      setRefundReason('');
      await fetchSubscription();
    } catch (error: any) {
      toast.error(error.message || 'Failed to request refund');
    } finally {
      setIsRequestingRefund(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030014] pt-24 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400 mb-8">Manage your account and subscription</p>

          {/* Profile Section */}
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-6">Profile</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-white/10" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-neon-cyan/20 flex items-center justify-center border-2 border-neon-cyan/30">
                    <User size={32} className="text-neon-cyan" />
                  </div>
                )}
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                  <Camera size={14} />
                </button>
              </div>
              <div>
                <p className="text-white font-medium">{user.name || 'User'}</p>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Display Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                leftIcon={<User size={18} />}
              />
              <Input
                label="Email"
                type="email"
                value={user.email}
                disabled
                leftIcon={<Mail size={18} />}
                helperText="Email cannot be changed"
              />
              <div className="pt-4">
                <Button type="submit" isLoading={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>

          {/* Subscription Section */}
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Subscription</h2>
              {!hasActiveSubscription() && (
                <Link to="/pricing" className="text-sm text-neon-cyan hover:underline flex items-center gap-1">
                  View Plans <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {subscription && hasActiveSubscription() ? (
              <div className="space-y-6">
                {/* Current Plan */}
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                        <CreditCard size={18} className="text-neon-cyan" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{subscription.plan?.name}</p>
                        <p className="text-slate-400 text-sm">
                          ₹{parseFloat(subscription.plan?.price || '0').toLocaleString()}/{subscription.plan?.interval}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      subscription.cancelAtPeriodEnd 
                        ? 'bg-amber-500/20 text-amber-400'
                        : subscription.status === 'pending_downgrade'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-neon-green/20 text-neon-green'
                    }`}>
                      {subscription.cancelAtPeriodEnd ? 'Cancelling' : subscription.status === 'pending_downgrade' ? 'Downgrading' : 'Active'}
                    </span>
                  </div>

                  {/* Period Info */}
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                    <Calendar size={14} />
                    <span>
                      {subscription.cancelAtPeriodEnd ? 'Access until' : 'Renews'}: {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span>{subscription.daysRemaining} days left</span>
                  </div>

                  {/* Pending Downgrade Info */}
                  {subscription.pendingPlan && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-3">
                      <p className="text-amber-400 text-sm">
                        Switching to <strong>{subscription.pendingPlan.name}</strong> on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Refund Eligibility */}
                  {subscription.canRequestRefund && !subscription.hasPendingRefund && (
                    <div className="p-3 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg mb-3">
                      <div className="flex items-center gap-2 text-neon-cyan text-sm">
                        <Clock size={14} />
                        <span>Refund eligible for {subscription.daysUntilRefundExpires} more days</span>
                      </div>
                    </div>
                  )}

                  {subscription.hasPendingRefund && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-3">
                      <p className="text-amber-400 text-sm">Refund request pending review</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Link to="/pricing">
                    <Button variant="secondary" size="sm">
                      Change Plan
                    </Button>
                  </Link>

                  {subscription.cancelAtPeriodEnd ? (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={handleReactivate}
                      isLoading={isReactivating}
                    >
                      <RefreshCw size={14} className="mr-1" />
                      Reactivate
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowCancelModal(true)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      Cancel Subscription
                    </Button>
                  )}

                  {subscription.canRequestRefund && !subscription.hasPendingRefund && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowRefundModal(true)}
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    >
                      Request Refund
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">No active subscription</p>
                <Link to="/pricing">
                  <Button>View Plans</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Account</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-white font-medium">Account Type</p>
                  <p className="text-sm text-slate-400">{user.role === 'admin' ? 'Administrator' : 'Member'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  user.role === 'admin' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-slate-800 text-slate-400'
                }`}>
                  {user.role}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white font-medium">Member Since</p>
                  <p className="text-sm text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Cancel Subscription</h3>
            </div>
            
            <p className="text-slate-400 mb-4">
              Your subscription will remain active until {new Date(subscription?.currentPeriodEnd || '').toLocaleDateString()}. 
              After that, you'll lose access to premium content.
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Tell us why you're leaving (optional)"
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 mb-4 resize-none"
              rows={3}
            />

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowCancelModal(false)} className="flex-1">
                Keep Subscription
              </Button>
              <Button 
                variant="secondary"
                onClick={() => handleCancelSubscription(false)}
                isLoading={isCancelling}
                className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                Cancel at Period End
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <CreditCard size={20} className="text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Request Refund</h3>
            </div>
            
            <p className="text-slate-400 mb-4">
              You're within the {subscription?.refundWindowDays}-day refund window. 
              Our team will review your request within 2-3 business days.
            </p>

            <div className="p-3 bg-slate-800 rounded-lg mb-4">
              <p className="text-sm text-slate-400">Refund Amount</p>
              <p className="text-xl font-bold text-white">
                ₹{parseFloat(subscription?.amount || '0').toLocaleString()}
              </p>
            </div>

            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Please tell us why you'd like a refund"
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 mb-4 resize-none"
              rows={3}
            />

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowRefundModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleRequestRefund}
                isLoading={isRequestingRefund}
                className="flex-1"
              >
                Submit Request
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
