import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Clock, Lock, Share2, AlertCircle, Loader2, Check, Music } from 'lucide-react';
import { getPlaylist, type PlaylistWithDetails } from '../api/playlists';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { createOrder, verifyPayment } from '../api/payments';
import { Button } from '../components/ui/Button';
import { SEO } from '../components/SEO';
import toast from 'react-hot-toast';

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { hasPurchased, fetchPurchases } = useUserStore();

  const [playlist, setPlaylist] = useState<PlaylistWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    const loadPlaylist = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await getPlaylist(id);
        setPlaylist(data);
      } catch (error) {
        console.error('Failed to load playlist:', error);
        toast.error('Failed to load playlist');
        navigate('/playlists');
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylist();
  }, [id, navigate]);

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      navigate('/auth');
      return;
    }

    if (!playlist) return;

    try {
      setIsPurchasing(true);

      // 1. Create Order
      const order = await createOrder({
        type: 'playlist',
        playlistId: playlist.id,
        userId: user.id,
        currency: 'INR',
      });

      // 2. Initialize Razorpay
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'Tender Talks',
        description: `Purchase: ${playlist.title}`,
        order_id: order.orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            // 3. Verify Payment
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              playlistId: playlist.id,
              type: 'playlist',
              userId: user.id,
            });

            toast.success('Purchase successful!');
            await fetchPurchases(); // Refresh purchases
          } catch (error) {
            console.error('Verification failed:', error);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#00f2ea',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error('Failed to initiate purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  if (!playlist) return null;

  const isOwned = hasPurchased(playlist.id);
  const isFree = !playlist.price || parseFloat(playlist.price) === 0;

  return (
    <div className="min-h-screen bg-[#030014] pt-24 pb-20 px-4">
      <SEO title={playlist.title} description={playlist.description} />

      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          {/* Cover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full md:w-80 aspect-square rounded-2xl overflow-hidden bg-slate-800 shadow-2xl flex-shrink-0"
          >
            {playlist.coverUrl ? (
              <img
                src={playlist.coverUrl}
                alt={playlist.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Music size={64} />
              </div>
            )}
          </motion.div>

          {/* Info */}
          <div className="flex-1 flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-neon-cyan/20 text-neon-cyan text-xs font-bold uppercase tracking-wider">
                  Playlist
                </span>
                {isOwned && (
                  <span className="px-3 py-1 rounded-full bg-neon-green/20 text-neon-green text-xs font-bold flex items-center gap-1">
                    <Check size={12} /> Owned
                  </span>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4 leading-tight">
                {playlist.title}
              </h1>

              <p className="text-slate-400 text-lg mb-6 max-w-2xl">{playlist.description}</p>

              <div className="flex items-center gap-6 text-sm text-slate-500 mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold">
                    {playlist.creator?.name?.[0] || 'T'}
                  </div>
                  <span>{playlist.creator?.name || 'Tender Talks'}</span>
                </div>
                <span>•</span>
                <span>{playlist.podcasts?.length || 0} tracks</span>
                <span>•</span>
                <span>Updated {new Date(playlist.updatedAt).toLocaleDateString()}</span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {isOwned || isFree ? (
                  <Button size="lg" className="px-8">
                    <Play size={20} className="mr-2" fill="currentColor" />
                    Play All
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handlePurchase}
                    isLoading={isPurchasing}
                    className="px-8"
                  >
                    Buy for ₹{playlist.price}
                  </Button>
                )}

                <Button variant="outline" size="lg" leftIcon={<Share2 size={20} />}>
                  Share
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Track List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6">Tracks</h2>

          {playlist.podcasts && playlist.podcasts.length > 0 ? (
            <div className="space-y-2">
              {playlist.podcasts.map((podcast, index: number) => {
                return (
                  <motion.div
                    key={podcast.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                  >
                    <div className="w-8 text-center text-slate-500 font-medium group-hover:text-white">
                      {index + 1}
                    </div>

                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                      {podcast.thumbnailUrl ? (
                        <img
                          src={podcast.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music size={16} className="text-slate-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate group-hover:text-neon-cyan transition-colors">
                        {podcast.title}
                      </h3>
                      <p className="text-sm text-slate-500 truncate">{podcast.description}</p>
                    </div>

                    <div className="text-sm text-slate-500 flex items-center gap-4">
                      {podcast.duration && (
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {Math.floor(podcast.duration / 60)}:
                          {String(podcast.duration % 60).padStart(2, '0')}
                        </span>
                      )}

                      {!(isOwned || isFree) && <Lock size={16} className="text-slate-600" />}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No tracks in this playlist yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
