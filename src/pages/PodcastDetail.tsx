import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Lock, Clock, Calendar, Tag, ArrowLeft, Loader2, 
  Download, Share2, Heart, Volume2, VolumeX, SkipBack, SkipForward,
  Maximize, Minimize
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { usePodcastStore } from '../stores/podcastStore';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '../stores/authStore';
import { AuthModal } from '../components/auth/AuthModal';
import { initiatePayment, createOrder } from '../lib/razorpay';
import toast from 'react-hot-toast';

export const PodcastDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentPodcast, fetchPodcastBySlug, isLoading } = usePodcastStore();
  const { canAccessPodcast, hasPurchased, hasActiveSubscription, fetchPurchases, fetchSubscription, subscription } = useUserStore();
  const { user } = useAuthStore();

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPodcastBySlug(slug);
    }
    if (user) {
      fetchPurchases();
      fetchSubscription();
    }
  }, [slug, fetchPodcastBySlug, user, fetchPurchases, fetchSubscription]);

  if (isLoading || !currentPodcast) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  const podcast = currentPodcast;
  const hasAccess = canAccessPodcast(podcast.id, podcast.isFree);
  const price = parseFloat(podcast.price || '0');
  const canDownload = hasAccess && (podcast.isDownloadable || subscription?.plan?.allowDownloads);

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePurchase = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsPurchasing(true);

    try {
      const { orderId, amount, key } = await createOrder({
        amount: price,
        podcastId: podcast.id,
        type: 'purchase',
        userId: user.id,
      });

      await initiatePayment({
        key,
        amount,
        currency: 'INR',
        name: 'TenderTalks',
        description: podcast.title,
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
                type: 'purchase',
                podcastId: podcast.id,
                userId: user.id,
              }),
            });
            toast.success('Purchase successful! Enjoy the content.');
            window.location.reload();
          } catch {
            toast.error('Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => setIsPurchasing(false),
        },
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate payment');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!canDownload) {
      toast.error('Upgrade your plan to download content');
      return;
    }

    setIsDownloading(true);

    try {
      const response = await fetch(`/api/podcasts/${podcast.id}/download`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Download failed');
      }

      const { url } = await response.json();
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${podcast.title}.${podcast.mediaType === 'video' ? 'mp4' : 'mp3'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: podcast.title,
          text: podcast.description,
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const togglePlay = () => {
    if (!hasAccess) {
      toast.error('Purchase or subscribe to play this content');
      return;
    }

    if (!showPlayer) {
      setShowPlayer(true);
    }

    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent) => {
    if (!progressRef.current || !mediaRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = percent * duration;
    mediaRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const skip = (seconds: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = Math.max(0, Math.min(duration, mediaRef.current.currentTime + seconds));
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#030014] pt-20 pb-20">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors touch-feedback"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Thumbnail / Player */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 mb-6">
              {podcast.thumbnailUrl ? (
                <img
                  src={podcast.thumbnailUrl}
                  alt={podcast.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-800" />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                {hasAccess ? (
                  <button
                    onClick={togglePlay}
                    className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-neon-cyan hover:text-black hover:scale-110 transition-all touch-feedback"
                  >
                    {isPlaying ? (
                      <Pause size={32} fill="currentColor" />
                    ) : (
                      <Play size={32} fill="currentColor" className="ml-1" />
                    )}
                  </button>
                ) : (
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-4 mx-auto">
                      <Lock size={32} />
                    </div>
                    <p className="text-white font-medium">Premium Content</p>
                  </div>
                )}
              </div>

              {/* Hidden Media Element */}
              {hasAccess && podcast.mediaUrl && showPlayer && (
                podcast.mediaType === 'video' ? (
                  <video
                    ref={mediaRef as React.RefObject<HTMLVideoElement>}
                    src={podcast.mediaUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                ) : (
                  <audio
                    ref={mediaRef as React.RefObject<HTMLAudioElement>}
                    src={podcast.mediaUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                  />
                )
              )}
            </div>

            {/* Player Controls (when playing) */}
            {showPlayer && hasAccess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl"
              >
                {/* Progress Bar */}
                <div
                  ref={progressRef}
                  className="h-2 bg-white/10 rounded-full cursor-pointer mb-4 group"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-neon-cyan rounded-full relative transition-all"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => skip(-10)}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <SkipBack size={20} />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-full bg-neon-cyan text-black flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button
                      onClick={() => skip(10)}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <SkipForward size={20} />
                    </button>
                    <span className="text-sm text-slate-400 ml-2">
                      {formatDuration(currentTime)} / {formatDuration(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Title & Description */}
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              {podcast.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-6">
              {podcast.duration && (
                <span className="flex items-center gap-1">
                  <Clock size={16} />
                  {formatDuration(podcast.duration)}
                </span>
              )}
              {podcast.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar size={16} />
                  {new Date(podcast.publishedAt).toLocaleDateString()}
                </span>
              )}
              {(podcast as any).category && (
                <span className="flex items-center gap-1">
                  <Tag size={16} />
                  {(podcast as any).category.name}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              {canDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  isLoading={isDownloading}
                  leftIcon={<Download size={16} />}
                >
                  Download
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                leftIcon={<Share2 size={16} />}
              >
                Share
              </Button>
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {podcast.description}
              </p>
            </div>

            {/* Tags */}
            {(podcast as any).tags && (podcast as any).tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {(podcast as any).tags.map((tag: any) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-slate-900/50 border border-white/10 rounded-2xl p-6">
              {hasAccess ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-4">
                    <Play size={24} className="text-neon-green ml-1" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">You have access!</h3>
                  <p className="text-slate-400 text-sm mb-6">
                    {podcast.isFree
                      ? 'This is free content'
                      : hasActiveSubscription()
                      ? 'Included in your subscription'
                      : 'You purchased this content'}
                  </p>
                  <Button className="w-full" onClick={togglePlay}>
                    <Play size={18} fill="currentColor" className="mr-2" />
                    {isPlaying ? 'Pause' : 'Play Now'}
                  </Button>
                  
                  {canDownload && (
                    <Button
                      variant="outline"
                      className="w-full mt-3"
                      onClick={handleDownload}
                      isLoading={isDownloading}
                    >
                      <Download size={18} className="mr-2" />
                      Download
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-center mb-6">
                    <span className="text-3xl font-display font-bold text-white">
                      ₹{price.toFixed(0)}
                    </span>
                    <span className="text-slate-500 ml-1">one-time</span>
                  </div>

                  <Button
                    className="w-full mb-4"
                    onClick={handlePurchase}
                    isLoading={isPurchasing}
                  >
                    Purchase Now
                  </Button>

                  <div className="text-center">
                    <p className="text-slate-500 text-sm mb-2">or</p>
                    <Link to="/pricing">
                      <Button variant="outline" className="w-full">
                        Subscribe for Unlimited Access
                      </Button>
                    </Link>
                  </div>

                  <p className="text-xs text-slate-500 text-center mt-4">
                    Secure payment via Razorpay
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};
