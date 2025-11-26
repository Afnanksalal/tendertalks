import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Loader2, Download, Wifi, Headphones } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '../stores/authStore';
import { AuthModal } from '../components/auth/AuthModal';
import { initiatePayment, createOrder } from '../lib/razorpay';
import toast from 'react-hot-toast';

export const PricingPage: React.FC = () => {
  const { pricingPlans, fetchPricingPlans, subscription, hasActiveSubscription } = useUserStore();
  const { user } = useAuthStore();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    fetchPricingPlans();
  }, [fetchPricingPlans]);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const plan = pricingPlans.find((p) => p.id === planId);
    if (!plan) return;

    if (parseFloat(plan.price) === 0) {
      toast.success('You already have access to free content!');
      return;
    }

    setLoadingPlan(planId);

    try {
      const { orderId, amount, key } = await createOrder({
        amount: parseFloat(plan.price),
        currency: plan.currency,
        planId,
        type: 'subscription',
        userId: user.id,
      });

      await initiatePayment({
        key,
        amount,
        currency: plan.currency,
        name: 'TenderTalks',
        description: `${plan.name} Subscription`,
        order_id: orderId,
        prefill: {
          name: user.name || '',
          email: user.email,
        },
        theme: { color: '#00F0FF' },
        handler: async (response) => {
          try {
            await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                type: 'subscription',
                planId,
                userId: user.id,
              }),
            });
            toast.success('Subscription activated!');
            window.location.reload();
          } catch {
            toast.error('Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => setLoadingPlan(null),
        },
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate payment');
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = pricingPlans;

  return (
    <div className="min-h-screen bg-[#030014] pt-24 md:pt-32 pb-20 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-whale-900/20 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-neon-purple/10 rounded-full blur-[80px] md:blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-white mb-4 md:mb-6"
          >
            Unlock{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-whale-400">
              Full Access
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-xl mx-auto text-base md:text-lg"
          >
            Join the inner circle. Get exclusive content, higher audio quality, and download for offline listening.
          </motion.p>
        </div>

        {/* Current Subscription Banner */}
        {hasActiveSubscription() && subscription && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 p-4 bg-neon-green/10 border border-neon-green/30 rounded-xl text-center"
          >
            <p className="text-neon-green font-medium">
              You're subscribed to <strong>{subscription.plan?.name}</strong>
              {subscription.currentPeriodEnd && (
                <span className="text-slate-400 ml-2">
                  · Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </p>
          </motion.div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, idx) => {
            const isRecommended = plan.slug === 'pro' || plan.name.toLowerCase() === 'pro';
            const isCurrentPlan = subscription?.planId === plan.id;
            const price = parseFloat(plan.price);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative flex flex-col p-6 md:p-8 rounded-2xl border transition-all duration-300 ${
                  isRecommended 
                    ? 'bg-slate-900/80 border-neon-cyan/50 shadow-[0_0_40px_rgba(0,240,255,0.1)] md:-translate-y-4' 
                    : 'bg-slate-900/40 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Popular Badge */}
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-neon-cyan text-black text-xs font-bold uppercase tracking-wider rounded-full whitespace-nowrap">
                      <Star size={12} fill="currentColor" />
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-neon-green/20 text-neon-green text-xs font-bold rounded">
                      Current
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6 pt-2">
                  <h3 className={`text-xl font-bold mb-3 ${isRecommended ? 'text-neon-cyan' : 'text-white'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl font-display font-bold text-white">
                      {plan.currency === 'INR' ? '₹' : '$'}{price.toFixed(0)}
                    </span>
                    <span className="text-slate-500 text-sm">/{plan.interval}</span>
                  </div>
                  {plan.description && (
                    <p className="text-slate-400 text-sm mt-2">{plan.description}</p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features?.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                      <div className={`mt-0.5 p-1 rounded-full flex-shrink-0 ${
                        isRecommended ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Check size={12} />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Feature Icons */}
                {(plan.allowDownloads || plan.allowOffline) && (
                  <div className="flex items-center gap-4 mb-6 pt-4 border-t border-white/5">
                    {plan.allowDownloads && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Download size={14} className="text-neon-green" />
                        Downloads
                      </div>
                    )}
                    {plan.allowOffline && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Wifi size={14} className="text-neon-cyan" />
                        Offline
                      </div>
                    )}
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrentPlan || loadingPlan !== null}
                  className={`w-full py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRecommended
                      ? 'bg-neon-cyan text-black hover:bg-neon-cyan/90 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                      : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    <Loader2 size={20} className="animate-spin mx-auto" />
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : price === 0 ? (
                    'Start Free'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Subscribe
                      {isRecommended && <Zap size={16} fill="currentColor" />}
                    </span>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* What's Included Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 max-w-4xl mx-auto"
        >
          <h2 className="text-2xl font-display font-bold text-white text-center mb-10">
            What's Included
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Headphones,
                title: 'Premium Audio',
                desc: 'Crystal clear HD audio quality for the best listening experience',
                color: 'text-neon-cyan',
              },
              {
                icon: Download,
                title: 'Offline Access',
                desc: 'Download episodes and listen anywhere, anytime',
                color: 'text-neon-green',
              },
              {
                icon: Star,
                title: 'Exclusive Content',
                desc: 'Access premium episodes and early releases',
                color: 'text-amber-400',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-6 bg-slate-900/30 border border-white/5 rounded-xl text-center hover:border-white/10 transition-colors"
              >
                <item.icon className={`w-10 h-10 ${item.color} mx-auto mb-4`} />
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-slate-500 text-sm">
            Secure payments via Razorpay · Cancel anytime · 7-day money-back guarantee
          </p>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};
