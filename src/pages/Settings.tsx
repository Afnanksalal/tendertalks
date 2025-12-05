import React, { useState, useEffect, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Camera,
  Loader2,
  CreditCard,
  Calendar,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Clock,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cancelSubscription, reactivateSubscription, requestRefund } from '../api/subscriptions';
import { uploadFile, STORAGE_BUCKETS } from '../lib/supabase';
import toast from 'react-hot-toast';
import { SEO } from '../components/SEO';

const IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif';
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const SettingsPage: React.FC = () => {
  const { user, isLoading: authLoading, updateProfile, getAuthHeaders } = useAuthStore();
  const { subscription, fetchSubscription, hasActiveSubscription } = useUserStore();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchSubscription();
      setName(user.name || '');
    }
  }, [user, fetchSubscription]);

  // Handle avatar file selection
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, WebP, GIF)');
      return;
    }

    // Max 2MB for avatars
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setIsUploadingAvatar(true);

    try {
      // Upload to Supabase Storage
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { url, error } = await uploadFile(STORAGE_BUCKETS.AVATARS, path, file, {
        upsert: true,
      });

      if (error) {
        throw error;
      }

      // Update profile with new avatar URL
      await updateProfile({ avatarUrl: url });
      toast.success('Profile picture updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    if (!user) return;

    setIsUploadingAvatar(true);
    try {
      await updateProfile({ avatarUrl: null });
      setAvatarPreview(null);
      toast.success('Profile picture removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove image');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
      const result = await cancelSubscription(getAuthHeaders(), {
        immediate,
        reason: cancelReason,
      });
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
      const result = await reactivateSubscription(getAuthHeaders());
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
      const result = await requestRefund(getAuthHeaders(), {
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
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-36 pb-20 px-4">
      <SEO title="Settings" noIndex />
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400 mb-8">Manage your account and subscription</p>

          {/* Profile Section */}
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-6">Profile</h2>

            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6 pb-6 border-b border-white/5">
              <div className="relative group">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={IMAGE_EXTENSIONS}
                  onChange={handleAvatarSelect}
                  className="hidden"
                />

                {/* Avatar display */}
                <div className="relative">
                  {avatarPreview || user.avatarUrl ? (
                    <img
                      src={avatarPreview || user.avatarUrl || ''}
                      alt=""
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-white/10"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-neon-cyan/20 flex items-center justify-center border-2 border-neon-cyan/30">
                      <User size={40} className="text-neon-cyan" />
                    </div>
                  )}

                  {/* Loading overlay */}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-neon-cyan animate-spin" />
                    </div>
                  )}

                  {/* Camera button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-0 right-0 w-9 h-9 bg-neon-cyan text-black rounded-full flex items-center justify-center hover:bg-neon-cyan/90 transition-colors shadow-lg disabled:opacity-50"
                  >
                    <Camera size={16} />
                  </button>
                </div>
              </div>

              <div className="text-center sm:text-left flex-1">
                <p className="text-white font-medium text-lg">{user.name || 'User'}</p>
                <p className="text-sm text-slate-400 mb-3">{user.email}</p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="px-3 py-1.5 text-xs font-medium bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Change Photo
                  </button>
                  {(user.avatarUrl || avatarPreview) && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">JPG, PNG, WebP or GIF. Max 2MB.</p>
              </div>
            </div>

            {/* Profile Form */}
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
              <div className="pt-2">
                <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
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
                <Link
                  to="/pricing"
                  className="text-sm text-neon-cyan hover:underline flex items-center gap-1"
                >
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
                          ₹{parseFloat(subscription.plan?.price || '0').toLocaleString()}/
                          {subscription.plan?.interval}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        subscription.cancelAtPeriodEnd
                          ? 'bg-amber-500/20 text-amber-400'
                          : subscription.status === 'pending_downgrade'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-neon-green/20 text-neon-green'
                      }`}
                    >
                      {subscription.cancelAtPeriodEnd
                        ? 'Cancelling'
                        : subscription.status === 'pending_downgrade'
                          ? 'Downgrading'
                          : 'Active'}
                    </span>
                  </div>

                  {/* Period Info */}
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                    <Calendar size={14} />
                    <span>
                      {subscription.cancelAtPeriodEnd ? 'Access until' : 'Renews'}:{' '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span>{subscription.daysRemaining} days left</span>
                  </div>

                  {/* Pending Downgrade Info */}
                  {subscription.pendingPlan && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-3">
                      <p className="text-amber-400 text-sm">
                        Switching to <strong>{subscription.pendingPlan.name}</strong> on{' '}
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Refund Eligibility */}
                  {subscription.canRequestRefund && !subscription.hasPendingRefund && (
                    <div className="p-3 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg mb-3">
                      <div className="flex items-center gap-2 text-neon-cyan text-sm">
                        <Clock size={14} />
                        <span>
                          Refund eligible for {subscription.daysUntilRefundExpires} more days
                        </span>
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
              <div className="p-4 bg-slate-800/50 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
                      <CreditCard size={18} className="text-neon-green" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Free Plan</p>
                      <p className="text-slate-400 text-sm">Access to free content</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-neon-green/20 text-neon-green">
                    Active
                  </span>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  Upgrade to unlock premium content, downloads, and more features.
                </p>
                <Link to="/pricing">
                  <Button size="sm">Upgrade Plan</Button>
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
                  <p className="text-sm text-slate-400">
                    {user.role === 'admin' ? 'Administrator' : 'Member'}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    user.role === 'admin'
                      ? 'bg-neon-purple/20 text-neon-purple'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-white font-medium">Billing & Payments</p>
                  <p className="text-sm text-slate-400">View payment history and refund requests</p>
                </div>
                <Link to="/billing">
                  <Button variant="outline" size="sm">
                    View History
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white font-medium">Member Since</p>
                  <p className="text-sm text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Cancel Modal - Mobile Optimized */}
      {showCancelModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCancelModal(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md my-auto shadow-2xl"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={20} className="text-red-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Cancel Subscription</h3>
                </div>

                <p className="text-slate-400 text-sm sm:text-base mb-4">
                  Your subscription will remain active until{' '}
                  {new Date(subscription?.currentPeriodEnd || '').toLocaleDateString()}. After that,
                  you'll lose access to premium content.
                </p>

                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Tell us why you're leaving (optional)"
                  className="w-full p-3 bg-slate-800/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 mb-4 resize-none focus:border-neon-cyan/50 focus:outline-none"
                  rows={3}
                />

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 order-2 sm:order-1"
                  >
                    Keep Subscription
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleCancelSubscription(false)}
                    isLoading={isCancelling}
                    className="flex-1 order-1 sm:order-2"
                  >
                    Cancel Subscription
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {/* Refund Modal - Mobile Optimized */}
      {showRefundModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRefundModal(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md my-auto shadow-2xl"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard size={20} className="text-amber-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Request Refund</h3>
                </div>

                <p className="text-slate-400 text-sm sm:text-base mb-4">
                  You're within the {subscription?.refundWindowDays}-day refund window. Our team
                  will review your request within 2-3 business days.
                </p>

                <div className="p-3 bg-slate-800/50 rounded-xl mb-4">
                  <p className="text-xs sm:text-sm text-slate-400">Refund Amount</p>
                  <p className="text-xl sm:text-2xl font-bold text-neon-green">
                    ₹{parseFloat(subscription?.amount || '0').toLocaleString()}
                  </p>
                </div>

                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Please tell us why you'd like a refund"
                  className="w-full p-3 bg-slate-800/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 mb-4 resize-none focus:border-neon-cyan/50 focus:outline-none"
                  rows={3}
                />

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowRefundModal(false)}
                    className="flex-1 order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRequestRefund}
                    isLoading={isRequestingRefund}
                    className="flex-1 order-1 sm:order-2"
                  >
                    Submit Request
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
};
