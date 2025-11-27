import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Lock, Clock, Calendar, Tag, ArrowLeft, Loader2, 
  Download, Share2, Volume2, VolumeX, SkipBack, SkipForward,
  Video, Music
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
  const { canAccessPodcast, hasActiveSubscription, fetchPurchases, fetchSubscription, subscription } = useUserStore();
  const { user } = useAuthStore();

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
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
              headers: { 
                'Content-Type': 'application/json',
                'X-User-Id': user.id,
              },
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
      const response = await fetch(`/api/podcasts/${podcast.slug}/download`, {
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

  const [shareText, setShareText] = useState('Share');
  
  const handleShare = async () => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/podcast/${podcast.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${podcast.title} | TenderTalks`,
          text: podcast.description?.slice(0, 100) || 'Check out this podcast on TenderTalks!',
          url,
        });
      } catch (err) {
        // User cancelled - fallback to clipboard
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(url);
        }
      }
    } else {
      await copyToClipboard(url);
    }
  };
  
  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareText('Copied!');
      toast.success('Link copied to clipboard!');
      setTimeout(() => setShareText('Share'), 2000);
    } catch {
      toast.error('Failed to copy link');
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
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-32 pb-20">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Thumbnail / Player */}
            <div className={`relative aspect-video rounded-xl lg:rounded-2xl overflow-hidden mb-4 lg:mb-6 ${
              podcast.mediaType === 'video' ? 'bg-neon-purple/5' : 'bg-neon-cyan/5'
            }`}>
              {/* Video Player - shown when playing video */}
              {hasAccess && podcast.mediaUrl && showPlayer && podcast.mediaType === 'video' ? (
                <video
                  ref={mediaRef as React.RefObject<HTMLVideoElement>}
                  src={podcast.mediaUrl}
                  poster={podcast.thumbnailUrl || undefined}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-contain bg-black"
                  controls={false}
                />
              ) : (
                /* Thumbnail - shown when not playing or for audio */
                <>
                  {podcast.thumbnailUrl ? (
                    <img
                      src={podcast.thumbnailUrl}
                      alt={podcast.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      podcast.mediaType === 'video' ? 'bg-neon-purple/10' : 'bg-neon-cyan/10'
                    }`}>
                      {podcast.mediaType === 'video' ? (
                        <Video size={64} className="text-neon-purple/30" />
                      ) : (
                        <Music size={64} className="text-neon-cyan/30" />
                      )}
                    </div>
                  )}
                </>
              )}
              
              {/* Media Type Badge */}
              <div className="absolute top-4 left-4 z-20">
                {podcast.mediaType === 'video' ? (
                  <span className="px-3 py-1.5 bg-neon-purple/90 backdrop-blur text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <Video size={14} /> VIDEO
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-neon-cyan/90 backdrop-blur text-black text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <Music size={14} /> AUDIO
                  </span>
                )}
              </div>

              {/* Overlay - only show when not playing video or for audio */}
              {!(showPlayer && podcast.mediaType === 'video' && isPlaying) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              )}

              {/* Play Button - show when not playing or paused */}
              {(!showPlayer || !isPlaying || podcast.mediaType === 'audio') && (
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
              )}

              {/* Click to pause for video when playing */}
              {showPlayer && isPlaying && podcast.mediaType === 'video' && (
                <div 
                  className="absolute inset-0 cursor-pointer"
                  onClick={togglePlay}
                />
              )}

              {/* Audio Element - hidden, only for audio playback */}
              {hasAccess && podcast.mediaUrl && showPlayer && podcast.mediaType === 'audio' && (
                <audio
                  ref={mediaRef as React.RefObject<HTMLAudioElement>}
                  src={podcast.mediaUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                />
              )}
            </div>

            {/* Player Controls (when playing) */}
            {showPlayer && hasAccess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl"
              >
                {/* Now Playing Info for Audio */}
                {podcast.mediaType === 'audio' && podcast.thumbnailUrl && (
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
                    <img 
                      src={podcast.thumbnailUrl} 
                      alt={podcast.title}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{podcast.title}</h4>
                      <p className="text-slate-400 text-sm">Now Playing</p>
                    </div>
                  </div>
                )}

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
                      className={`w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 transition-transform ${
                        podcast.mediaType === 'video' ? 'bg-neon-purple text-white' : 'bg-neon-cyan text-black'
                      }`}
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
                    {/* Fullscreen for video */}
                    {podcast.mediaType === 'video' && mediaRef.current && (
                      <button
                        onClick={() => {
                          const video = mediaRef.current as HTMLVideoElement;
                          if (video.requestFullscreen) {
                            video.requestFullscreen();
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Title & Description */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white mb-3 lg:mb-4">
              {podcast.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-sm text-slate-400 mb-4 lg:mb-6">
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
                className={shareText === 'Copied!' ? 'text-neon-green' : ''}
              >
                {shareText}
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
            <div className="lg:sticky lg:top-24 bg-slate-900/50 border border-white/10 rounded-xl lg:rounded-2xl p-5 lg:p-6">
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
