import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ShoppingBag, CreditCard, ChevronRight, Plus, Minus, Loader2 } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { initiatePayment } from '../../lib/razorpay';
import toast from 'react-hot-toast';

export const CartDrawer: React.FC = () => {
  const { items, isOpen, closeCart, removeFromCart, updateQuantity, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const total = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to checkout');
      return;
    }

    if (items.length === 0) return;

    setIsCheckingOut(true);

    try {
      // Create order
      const response = await fetch('/api/merch/create-order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          userId: user.id,
          items: items.map((item) => ({
            merchItemId: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
          total,
        }),
      });

      if (!response.ok) throw new Error('Failed to create order');

      const { orderId, amount, key } = await response.json();

      await initiatePayment({
        key,
        amount,
        currency: 'INR',
        name: 'TenderTalks Store',
        description: `Order: ${itemCount} items`,
        order_id: orderId,
        prefill: {
          name: user.name || '',
          email: user.email,
        },
        theme: { color: '#00F0FF' },
        handler: async (paymentResponse) => {
          try {
            await fetch('/api/merch/verify-payment', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'X-User-Id': user.id,
              },
              body: JSON.stringify({
                ...paymentResponse,
                orderId,
              }),
            });
            toast.success('Order placed successfully!');
            clearCart();
            closeCart();
          } catch {
            toast.error('Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => setIsCheckingOut(false),
        },
      });
    } catch (error: any) {
      toast.error(error.message || 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-[#050B14]/98 border-l border-white/10 shadow-2xl z-[90] flex flex-col backdrop-blur-xl safe-top safe-bottom"
          >
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h2 className="text-lg md:text-xl font-display font-bold text-white flex items-center gap-3">
                <ShoppingBag className="text-neon-cyan" size={22} />
                <span>Your Cart</span>
                {itemCount > 0 && (
                  <span className="text-sm font-normal text-slate-400">({itemCount})</span>
                )}
              </h2>
              <button
                onClick={closeCart}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <X size={22} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-6 border border-slate-800">
                    <ShoppingBag size={32} className="opacity-50" />
                  </div>
                  <p className="font-medium mb-1">Your cart is empty</p>
                  <p className="text-sm text-slate-600">Add some merch to get started</p>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    key={item.id}
                    className="flex gap-3 md:gap-4 bg-slate-900/50 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h3 className="text-white font-bold text-sm mb-1 truncate">{item.name}</h3>
                        <p className="text-neon-cyan font-mono text-xs">₹{parseFloat(item.price).toFixed(0)}</p>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-1 bg-slate-950 rounded-lg border border-white/5">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 text-slate-400 hover:text-white transition-colors touch-feedback"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-xs font-bold text-white w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 text-slate-400 hover:text-white transition-colors touch-feedback"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors touch-feedback"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-4 md:p-6 bg-slate-950/80 border-t border-white/5 backdrop-blur-md">
                <div className="flex justify-between items-end mb-4 md:mb-6">
                  <div>
                    <span className="text-slate-400 text-xs font-mono uppercase block mb-1">Total</span>
                    <span className="text-[10px] text-slate-500">Tax included</span>
                  </div>
                  <span className="text-2xl md:text-3xl font-display font-bold text-white">
                    ₹{total.toFixed(0)}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="group w-full bg-white text-black font-bold py-3.5 md:py-4 rounded-xl transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 overflow-hidden relative touch-feedback disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan via-white to-neon-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative z-10 flex items-center gap-2">
                    {isCheckingOut ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>Checkout <ChevronRight size={18} /></>
                    )}
                  </span>
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono">
                  <CreditCard size={12} />
                  <span>SECURE PAYMENT VIA RAZORPAY</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
