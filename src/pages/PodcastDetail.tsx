import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Lock, Clock, Calendar, Tag, ArrowLeft, Loader2,
  Download, Share2, Volume2, VolumeX, SkipBack, SkipForward,
  Video, Music, Maximize, Minimize, RotateCcw, RotateCw
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { usePodcastStore } from '../stores/podcastStore';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { AuthModal } from '../components/auth/AuthModal';
import { initiatePayment, createOrder } from '../lib/razorpay';
import toast from 'react-hot-toast';
import { SEO } from '../components/SEO';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Double tap seek indicator component
const SeekIndicator: React.FC<{ direction: 'left' | 'right'; seconds: number }> = ({ direction, seconds }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className={`absolute top-1/2 -translate-y-1/2 ${direction === 'left' ? 'left-8' : 'right-8'} flex flex-col items-center`}
  >
    <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
      {direction === 'left' ? <RotateCcw size={24} className="text-white" /> : <RotateCw size={24} className="text-white" />}
    </div>
    <span className="text-white text-sm font-medium mt-1">{seconds}s</span>
  </motion.div>
);

export const PodcastDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentPodcast, fetchPodcastBySlug, isLoading } = usePodcastStore();
  const { canAccessPodcast, hasActiveSubscription, fetchPurchases, fetchSubscription, subscription } = useUserStore();
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Restore playback state from sessionStorage
  const getStoredState = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(`playback-${slug}`);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }, [slug]);

  const storedState = getStoredState();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(storedState?.currentTime || 0);
  const [duration, setDuration] = useState(storedState?.duration || 0);
  const [volume, setVolume] = useState(storedState?.volume ?? 1);
  const [isMuted, setIsMuted] = useState(storedState?.isMuted || false);
  const [showPlayer, setShowPlayer] = useState(storedState?.showPlayer || false);
  const [playbackSpeed, setPlaybackSpeed] = useState(storedState?.playbackSpeed || 1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [shareText, setShareText] = useState('Share');
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [doubleTapSide, setDoubleTapSide] = useState<'left' | 'right' | null>(null);
  const [seekAmount, setSeekAmount] = useState(10);

  // Refs for tracking
  const hasFetchedRef = useRef<string | null>(null);
  const userFetchedRef = useRef(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  // Fetch podcast data
  useEffect(() => {
    if (slug && hasFetchedRef.current !== slug) {
      hasFetchedRef.current = slug;
      fetchPodcastBySlug(slug);
    }
  }, [slug, fetchPodcastBySlug]);

  // Fetch user data
  useEffect(() => {
    if (user && !userFetchedRef.current) {
      userFetchedRef.current = true;
      fetchPurchases();
      fetchSubscription();
    }
  }, [user, fetchPurchases, fetchSubscription]);

  // Save playback state
  useEffect(() => {
    if (!slug) return;

    const saveState = () => {
      try {
        sessionStorage.setItem(`playback-${slug}`, JSON.stringify({
          currentTime, duration, volume, isMuted, showPlayer, playbackSpeed,
        }));
      } catch { /* ignore */ }
    };

    const interval = isPlaying ? setInterval(saveState, 5000) : null;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveState();
      } else if (document.visibilityState === 'visible' && mediaRef.current) {
        setIsPlaying(!mediaRef.current.paused);
        setCurrentTime(mediaRef.current.currentTime);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', saveState);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', saveState);
      saveState();
    };
  }, [slug, currentTime, duration, volume, isMuted, showPlayer, playbackSpeed, isPlaying]);

  // Restore position when media loads
  useEffect(() => {
    if (mediaRef.current && storedState?.currentTime && showPlayer) {
      mediaRef.current.currentTime = storedState.currentTime;
      mediaRef.current.playbackRate = playbackSpeed;
      mediaRef.current.volume = volume;
      mediaRef.current.muted = isMuted;
    }
  }, [showPlayer]);

  // Media Session API for lock screen controls
  useEffect(() => {
    if (!showPlayer || !currentPodcast || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentPodcast.title,
      artist: 'TenderTalks',
      album: 'Podcast',
      artwork: currentPodcast.thumbnailUrl ? [
        { src: currentPodcast.thumbnailUrl, sizes: '512x512', type: 'image/jpeg' }
      ] : [],
    });

    navigator.mediaSession.setActionHandler('play', () => mediaRef.current?.play());
    navigator.mediaSession.setActionHandler('pause', () => mediaRef.current?.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => skip(-10));
    navigator.mediaSession.setActionHandler('seekforward', () => skip(10));
    navigator.mediaSession.setActionHandler('previoustrack', () => skip(-30));
    navigator.mediaSession.setActionHandler('nexttrack', () => skip(30));

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    };
  }, [showPlayer, currentPodcast]);

  // Update Media Session position state for notification bar progress
  useEffect(() => {
    if (!showPlayer || !('mediaSession' in navigator) || !duration) return;
    
    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: playbackSpeed,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // Position state not supported
    }
  }, [showPlayer, currentTime, duration, playbackSpeed]);

  // Update Media Session playback state
  useEffect(() => {
    if (!showPlayer || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [showPlayer, isPlaying]);

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (showSpeedMenu || showVolumeSlider) {
        const target = e.target as HTMLElement;
        if (!target.closest('.speed-menu') && !target.closest('.volume-control')) {
          setShowSpeedMenu(false);
          setShowVolumeSlider(false);
        }
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showSpeedMenu, showVolumeSlider]);

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    
    if (isPlaying && showPlayer && podcast?.mediaType === 'video') {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSpeedMenu && !showVolumeSlider) {
          setShowControls(false);
        }
      }, 3500);
    }
  }, [isPlaying, showPlayer, showSpeedMenu, showVolumeSlider]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetControlsTimeout]);

  // Handle double tap to seek (mobile gesture)
  const handleDoubleTap = useCallback((clientX: number, containerWidth: number) => {
    const isLeftSide = clientX < containerWidth / 2;
    const seekSeconds = isLeftSide ? -10 : 10;
    
    if (mediaRef.current) {
      mediaRef.current.currentTime = Math.max(0, Math.min(duration, mediaRef.current.currentTime + seekSeconds));
      setCurrentTime(mediaRef.current.currentTime);
    }
    
    setDoubleTapSide(isLeftSide ? 'left' : 'right');
    setSeekAmount(10);
    
    // Clear indicator after animation
    if (doubleTapTimeoutRef.current) {
      clearTimeout(doubleTapTimeoutRef.current);
    }
    doubleTapTimeoutRef.current = setTimeout(() => {
      setDoubleTapSide(null);
    }, 600);
  }, [duration]);

  // Video tap handler - separate mouse and touch to prevent double firing
  const lastTouchTimeRef = useRef(0);
  
  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    // Ignore click if it was triggered by a recent touch (prevents double firing)
    if (Date.now() - lastTouchTimeRef.current < 500) return;
    if (!showPlayer) return;
    
    // Desktop: click toggles play/pause
    if (mediaRef.current) {
      if (mediaRef.current.paused) {
        mediaRef.current.play();
      } else {
        mediaRef.current.pause();
      }
    }
  }, [showPlayer]);

  const handleVideoTouch = useCallback((e: React.TouchEvent) => {
    if (!showPlayer) return;
    lastTouchTimeRef.current = Date.now();
    
    const now = Date.now();
    const touch = e.changedTouches[0];
    if (!touch) return;
    
    const container = playerContainerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const relativeX = touch.clientX - rect.left;
    
    // Check for double tap (within 300ms and similar position)
    if (now - lastTapRef.current.time < 300 && Math.abs(relativeX - lastTapRef.current.x) < 80) {
      // Double tap - seek
      e.preventDefault();
      handleDoubleTap(relativeX, rect.width);
      lastTapRef.current = { time: 0, x: 0 }; // Reset to prevent triple tap
    } else {
      // Single tap - toggle controls visibility
      lastTapRef.current = { time: now, x: relativeX };
      
      if (showControls) {
        setShowControls(false);
      } else {
        resetControlsTimeout();
      }
    }
  }, [showPlayer, handleDoubleTap, showControls, resetControlsTimeout]);

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
  const canDownload = settings.feature_downloads && hasAccess && (podcast.isDownloadable || subscription?.plan?.allowDownloads);

  const formatTime = (seconds?: number | null) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!hasAccess) {
      toast.error('Purchase or subscribe to play this content');
      return;
    }
    if (!showPlayer) setShowPlayer(true);
    if (mediaRef.current) {
      if (isPlaying) mediaRef.current.pause();
      else mediaRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current && !isSeeking) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
      mediaRef.current.playbackRate = playbackSpeed;
      mediaRef.current.volume = volume;
    }
  };

  // Progress bar seeking - handles both mouse and touch
  const handleSeek = (e: React.MouseEvent | React.TouchEvent) => {
    if (!progressRef.current || !mediaRef.current) return;
    e.stopPropagation();
    
    const rect = progressRef.current.getBoundingClientRect();
    let clientX: number;
    
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
    } else if ('clientX' in e) {
      clientX = e.clientX;
    } else {
      return;
    }
    
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = percent * duration;
    mediaRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleSeekStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    setIsSeeking(true);
    handleSeek(e);
  };
  
  const handleSeekEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    handleSeek(e);
    setIsSeeking(false);
  };

  const skip = (seconds: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = Math.max(0, Math.min(duration, mediaRef.current.currentTime + seconds));
    }
  };

  const handleVolumeChange = (e: React.MouseEvent | React.TouchEvent) => {
    if (!volumeRef.current || !mediaRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const newVolume = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setVolume(newVolume);
    mediaRef.current.volume = newVolume;
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      mediaRef.current.muted = false;
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      const newMuted = !isMuted;
      mediaRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (mediaRef.current) mediaRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
  };

  const handleFullscreen = async () => {
    const container = playerContainerRef.current;
    if (!container) return;
    
    try {
      if (!isFullscreen) {
        // Enter fullscreen on the container (includes custom controls)
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch { /* ignore */ }
  };


  const handlePurchase = async () => {
    if (!user) { setShowAuthModal(true); return; }
    setIsPurchasing(true);
    try {
      const { orderId, amount, key } = await createOrder({
        amount: price, podcastId: podcast.id, type: 'purchase', userId: user.id,
      });
      await initiatePayment({
        key, amount, currency: 'INR', name: 'TenderTalks', description: podcast.title, order_id: orderId,
        prefill: { name: user.name || '', email: user.email },
        theme: { color: '#00F0FF' },
        handler: async (response) => {
          try {
            await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
              body: JSON.stringify({ ...response, type: 'purchase', podcastId: podcast.id, userId: user.id }),
            });
            toast.success('Purchase successful!');
            // Refresh user data to update access
            await fetchPurchases();
            await fetchSubscription();
          } catch { toast.error('Payment verification failed'); }
        },
        modal: { ondismiss: () => setIsPurchasing(false) },
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate payment');
    } finally { setIsPurchasing(false); }
  };

  const handleDownload = async () => {
    if (!user) { setShowAuthModal(true); return; }
    if (!canDownload) { toast.error('Upgrade your plan to download'); return; }
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/podcasts/${podcast.slug}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Download failed');
      const { url } = await response.json();
      const link = document.createElement('a');
      link.href = url;
      link.download = `${podcast.title}.${podcast.mediaType === 'video' ? 'mp4' : 'mp3'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download');
    } finally { setIsDownloading(false); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/podcast/${podcast.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${podcast.title} | TenderTalks`, text: podcast.description?.slice(0, 100) || '', url });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') await copyToClipboard(url);
      }
    } else await copyToClipboard(url);
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareText('Copied!');
      toast.success('Link copied!');
      setTimeout(() => setShareText('Share'), 2000);
    } catch { toast.error('Failed to copy'); }
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#030014] pt-24 sm:pt-28 md:pt-32 pb-20 safe-area-inset">
      <SEO
        title={podcast.title}
        description={podcast.description?.slice(0, 160) || `Listen to ${podcast.title} on TenderTalks`}
        image={podcast.thumbnailUrl || `/api/og-image?title=${encodeURIComponent(podcast.title)}`}
        url={`/podcast/${podcast.slug}`}
        type="article"
        publishedTime={podcast.publishedAt ? new Date(podcast.publishedAt).toISOString() : undefined}
        keywords={`podcast, ${podcast.title}, TenderTalks`}
      />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors touch-feedback">
          <ArrowLeft size={20} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            {/* Media Container - This goes fullscreen */}
            <div 
              ref={playerContainerRef}
              className={`relative rounded-xl overflow-hidden select-none ${isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-black flex flex-col' : 'aspect-video mb-4'} ${podcast.mediaType === 'video' ? 'bg-black' : 'bg-neon-cyan/5'}`}
              onMouseMove={resetControlsTimeout}
              style={{ cursor: isFullscreen ? (showControls ? 'default' : 'none') : 'default' }}
            >
              {hasAccess && podcast.mediaUrl && showPlayer && podcast.mediaType === 'video' ? (
                <video
                  ref={mediaRef as React.RefObject<HTMLVideoElement>}
                  src={podcast.mediaUrl}
                  poster={podcast.thumbnailUrl || undefined}
                  controls={false}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => { setIsPlaying(true); resetControlsTimeout(); }}
                  onPause={() => { setIsPlaying(false); setShowControls(true); }}
                  onEnded={() => { setIsPlaying(false); setShowControls(true); }}
                  onWaiting={() => setIsBuffering(true)}
                  onCanPlay={() => setIsBuffering(false)}
                  className={`w-full object-contain ${isFullscreen ? 'h-full' : 'h-full'}`}
                  playsInline
                  preload="metadata"
                  webkit-playsinline="true"
                />
              ) : (
                <>
                  {podcast.thumbnailUrl ? (
                    <img src={podcast.thumbnailUrl} alt={podcast.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${podcast.mediaType === 'video' ? 'bg-neon-purple/10' : 'bg-neon-cyan/10'}`}>
                      {podcast.mediaType === 'video' ? <Video size={64} className="text-neon-purple/30" /> : <Music size={64} className="text-neon-cyan/30" />}
                    </div>
                  )}
                </>
              )}

              {/* Double tap seek indicators */}
              <AnimatePresence>
                {doubleTapSide && (
                  <SeekIndicator direction={doubleTapSide} seconds={seekAmount} />
                )}
              </AnimatePresence>

              {/* Media Type Badge - Hidden in fullscreen */}
              {!isFullscreen && (
                <div className="absolute top-3 left-3 z-20">
                  <span className={`px-2.5 py-1 backdrop-blur text-xs font-bold rounded-lg flex items-center gap-1.5 ${
                    podcast.mediaType === 'video' ? 'bg-neon-purple/90 text-white' : 'bg-neon-cyan/90 text-black'
                  }`}>
                    {podcast.mediaType === 'video' ? <Video size={12} /> : <Music size={12} />}
                    {podcast.mediaType.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Gradient overlay for controls visibility */}
              <AnimatePresence>
                {(showControls || !isPlaying || !showPlayer || podcast.mediaType === 'audio') && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" 
                  />
                )}
              </AnimatePresence>

              {/* Tap area for video controls toggle / double tap seek */}
              {showPlayer && podcast.mediaType === 'video' && hasAccess && (
                <div 
                  className="absolute inset-0 z-10 cursor-pointer" 
                  onClick={handleVideoClick}
                  onTouchEnd={handleVideoTouch}
                />
              )}

              {/* Center Play Button - Shows when paused or controls visible */}
              <AnimatePresence>
                {((!showPlayer || !isPlaying || podcast.mediaType === 'audio') || (showControls && showPlayer && podcast.mediaType === 'video')) && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                  >
                    {hasAccess ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:bg-neon-cyan hover:text-black active:scale-90 transition-all pointer-events-auto touch-manipulation"
                      >
                        {isBuffering ? (
                          <Loader2 size={28} className="animate-spin sm:w-8 sm:h-8" />
                        ) : isPlaying ? (
                          <Pause size={28} fill="currentColor" className="sm:w-8 sm:h-8" />
                        ) : (
                          <Play size={28} fill="currentColor" className="ml-1 sm:w-8 sm:h-8" />
                        )}
                      </button>
                    ) : (
                      <div className="text-center pointer-events-auto">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-3 mx-auto">
                          <Lock size={28} />
                        </div>
                        <p className="text-white font-medium text-sm">Premium Content</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Audio element */}
              {hasAccess && podcast.mediaUrl && showPlayer && podcast.mediaType === 'audio' && (
                <audio
                  ref={mediaRef as React.RefObject<HTMLAudioElement>}
                  src={podcast.mediaUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onWaiting={() => setIsBuffering(true)}
                  onCanPlay={() => setIsBuffering(false)}
                  preload="metadata"
                />
              )}

              {/* Fullscreen Controls - Inside container */}
              <AnimatePresence>
                {showPlayer && hasAccess && isFullscreen && showControls && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-30"
                    style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Progress Bar - Touch optimized with larger hit area */}
                    <div className="mb-4">
                      <div className="py-3 -my-3"> {/* Larger touch target */}
                        <div
                          className="h-2 bg-white/20 rounded-full cursor-pointer group relative touch-none"
                          onMouseDown={handleSeekStart}
                          onTouchStart={handleSeekStart}
                          onTouchMove={handleSeek}
                          onTouchEnd={handleSeekEnd}
                        >
                          <div className="h-full bg-neon-cyan rounded-full relative transition-all" style={{ width: `${progressPercent}%` }}>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-100 sm:scale-0 sm:group-hover:scale-100 sm:group-active:scale-100 transition-transform" />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm text-white/80 mt-2 font-mono">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Controls Row - Mobile optimized layout */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Left: Skip & Play */}
                      <div className="flex items-center gap-1 sm:gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); skip(-10); }} 
                          className="p-3 text-white/80 hover:text-white active:scale-90 transition-all rounded-full hover:bg-white/10 touch-manipulation"
                          aria-label="Rewind 10 seconds"
                        >
                          <SkipBack size={20} className="sm:w-6 sm:h-6" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center text-black active:scale-90 transition-transform shadow-lg touch-manipulation"
                          aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isBuffering ? (
                            <Loader2 size={22} className="animate-spin sm:w-6 sm:h-6" />
                          ) : isPlaying ? (
                            <Pause size={22} fill="currentColor" className="sm:w-6 sm:h-6" />
                          ) : (
                            <Play size={22} fill="currentColor" className="ml-0.5 sm:w-6 sm:h-6" />
                          )}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); skip(10); }} 
                          className="p-3 text-white/80 hover:text-white active:scale-90 transition-all rounded-full hover:bg-white/10 touch-manipulation"
                          aria-label="Forward 10 seconds"
                        >
                          <SkipForward size={20} className="sm:w-6 sm:h-6" />
                        </button>
                      </div>

                      {/* Right: Volume, Speed, Exit Fullscreen */}
                      <div className="flex items-center gap-0.5 sm:gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleMute(); }} 
                          className="p-2.5 sm:p-2 text-white/80 hover:text-white active:scale-90 transition-all rounded-full hover:bg-white/10 touch-manipulation"
                          aria-label={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? <VolumeX size={20} className="sm:w-5 sm:h-5" /> : <Volume2 size={20} className="sm:w-5 sm:h-5" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); changeSpeed(PLAYBACK_SPEEDS[(PLAYBACK_SPEEDS.indexOf(playbackSpeed) + 1) % PLAYBACK_SPEEDS.length]); }}
                          className="px-2.5 py-2 text-white/80 hover:text-white active:scale-95 text-xs sm:text-sm font-mono rounded-lg hover:bg-white/10 min-w-[44px] text-center touch-manipulation"
                          aria-label="Change playback speed"
                        >
                          {playbackSpeed}x
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleFullscreen(); }} 
                          className="p-2.5 sm:p-2 text-white/80 hover:text-white active:scale-90 transition-all rounded-full hover:bg-white/10 touch-manipulation"
                          aria-label="Exit fullscreen"
                        >
                          <Minimize size={20} className="sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile hint */}
                    <p className="text-white/40 text-[10px] text-center mt-3 sm:hidden">Double tap sides to seek • Tap to hide controls</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Fullscreen title bar */}
              <AnimatePresence>
                {isFullscreen && showControls && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent z-30"
                    style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-white font-medium text-sm sm:text-lg truncate pr-4">{podcast.title}</h3>
                    <p className="text-white/60 text-xs mt-0.5">TenderTalks</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Enhanced Player Controls - Outside container (non-fullscreen) */}
            {showPlayer && hasAccess && !isFullscreen && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-3 sm:p-4 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl">
                {/* Audio Now Playing */}
                {podcast.mediaType === 'audio' && podcast.thumbnailUrl && (
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                    <img src={podcast.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate text-sm">{podcast.title}</h4>
                      <p className="text-slate-400 text-xs">Now Playing • {playbackSpeed}x</p>
                    </div>
                  </div>
                )}

                {/* Progress Bar - Touch optimized with larger hit area */}
                <div className="mb-3">
                  <div className="py-3 -my-3"> {/* Larger touch target */}
                    <div
                      ref={progressRef}
                      className="h-2 bg-white/10 rounded-full cursor-pointer group relative touch-none"
                      onMouseDown={handleSeekStart}
                      onTouchStart={handleSeekStart}
                      onTouchMove={handleSeek}
                      onTouchEnd={handleSeekEnd}
                    >
                      <div className="h-full bg-neon-cyan rounded-full relative transition-all" style={{ width: `${progressPercent}%` }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-100 sm:scale-0 sm:group-hover:scale-100 sm:group-active:scale-100 transition-transform" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>-{formatTime(duration - currentTime)}</span>
                  </div>
                </div>

                {/* Controls Row - Mobile optimized */}
                <div className="flex items-center justify-between">
                  {/* Left: Skip & Play */}
                  <div className="flex items-center gap-0.5 sm:gap-2">
                    <button 
                      onClick={() => skip(-10)} 
                      className="p-2.5 sm:p-2 text-slate-400 hover:text-white active:scale-90 transition-all rounded-full hover:bg-white/5 touch-manipulation" 
                      aria-label="Rewind 10s"
                    >
                      <SkipBack size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform touch-manipulation shadow-lg ${
                        podcast.mediaType === 'video' ? 'bg-neon-purple text-white shadow-neon-purple/20' : 'bg-neon-cyan text-black shadow-neon-cyan/20'
                      }`}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isBuffering ? (
                        <Loader2 size={20} className="animate-spin sm:w-6 sm:h-6" />
                      ) : isPlaying ? (
                        <Pause size={20} fill="currentColor" className="sm:w-6 sm:h-6" />
                      ) : (
                        <Play size={20} fill="currentColor" className="ml-0.5 sm:w-6 sm:h-6" />
                      )}
                    </button>
                    <button 
                      onClick={() => skip(10)} 
                      className="p-2.5 sm:p-2 text-slate-400 hover:text-white active:scale-90 transition-all rounded-full hover:bg-white/5 touch-manipulation" 
                      aria-label="Forward 10s"
                    >
                      <SkipForward size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  {/* Right: Volume, Speed, Fullscreen */}
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {/* Volume Control - Desktop slider, mobile mute toggle */}
                    <div className="relative volume-control">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (window.innerWidth < 640) {
                            toggleMute();
                          } else {
                            setShowVolumeSlider(!showVolumeSlider); 
                            setShowSpeedMenu(false); 
                          }
                        }} 
                        className="p-2.5 sm:p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5 touch-manipulation"
                      >
                        {isMuted || volume === 0 ? <VolumeX size={18} className="sm:w-5 sm:h-5" /> : <Volume2 size={18} className="sm:w-5 sm:h-5" />}
                      </button>
                      <AnimatePresence>
                        {showVolumeSlider && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl z-50"
                          >
                            <div
                              ref={volumeRef}
                              className="w-24 h-2 bg-white/10 rounded-full cursor-pointer"
                              onClick={handleVolumeChange}
                              onTouchMove={handleVolumeChange}
                            >
                              <div className="h-full bg-neon-cyan rounded-full transition-all" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
                            </div>
                            <button onClick={toggleMute} className="mt-2 text-xs text-slate-400 hover:text-white w-full text-center">
                              {isMuted ? 'Unmute' : 'Mute'}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Speed Control */}
                    <div className="relative speed-menu">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); setShowVolumeSlider(false); }} 
                        className="p-2 sm:px-2.5 sm:py-1.5 text-slate-400 hover:text-white transition-colors flex items-center gap-1 rounded-lg hover:bg-white/5 touch-manipulation"
                      >
                        <span className="text-xs font-mono">{playbackSpeed}x</span>
                      </button>
                      <AnimatePresence>
                        {showSpeedMenu && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full right-0 mb-2 p-2 bg-slate-800/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl z-50 min-w-[100px]"
                          >
                            <p className="text-[10px] text-slate-500 px-2 mb-1 uppercase tracking-wider">Speed</p>
                            {PLAYBACK_SPEEDS.map((speed) => (
                              <button
                                key={speed}
                                onClick={() => changeSpeed(speed)}
                                className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors touch-manipulation ${
                                  playbackSpeed === speed ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-slate-300 hover:bg-white/5 active:bg-white/10'
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Fullscreen (video only) */}
                    {podcast.mediaType === 'video' && (
                      <button 
                        onClick={handleFullscreen} 
                        className="p-2.5 sm:p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5 touch-manipulation" 
                        aria-label="Fullscreen"
                      >
                        <Maximize size={18} className="sm:w-5 sm:h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile hint for video */}
                {podcast.mediaType === 'video' && (
                  <p className="text-slate-500 text-[10px] text-center mt-3 sm:hidden">Double tap video sides to seek 10s</p>
                )}
              </motion.div>
            )}

            {/* Title & Meta */}
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white mb-3">{podcast.title}</h1>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400 mb-4">
              {podcast.duration && (
                <span className="flex items-center gap-1"><Clock size={14} />{formatTime(podcast.duration)}</span>
              )}
              {podcast.publishedAt && (
                <span className="flex items-center gap-1"><Calendar size={14} />{new Date(podcast.publishedAt).toLocaleDateString()}</span>
              )}
              {(podcast as any).category && (
                <span className="flex items-center gap-1"><Tag size={14} />{(podcast as any).category.name}</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mb-6">
              {canDownload && (
                <Button variant="outline" size="sm" onClick={handleDownload} isLoading={isDownloading} leftIcon={<Download size={16} />}>
                  Download
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleShare} leftIcon={<Share2 size={16} />} className={shareText === 'Copied!' ? 'text-neon-green' : ''}>
                {shareText}
              </Button>
            </div>

            <div className="prose prose-invert max-w-none">
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">{podcast.description}</p>
            </div>

            {(podcast as any).tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {(podcast as any).tags.map((tag: any) => (
                  <span key={tag.id} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400">#{tag.name}</span>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 bg-slate-900/50 border border-white/10 rounded-xl p-5">
              {hasAccess ? (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-3">
                    <Play size={22} className="text-neon-green ml-1" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">You have access!</h3>
                  <p className="text-slate-400 text-sm mb-5">
                    {podcast.isFree ? 'Free content' : hasActiveSubscription() ? 'Included in subscription' : 'Purchased'}
                  </p>
                  <Button className="w-full" onClick={togglePlay}>
                    <Play size={18} fill="currentColor" className="mr-2" />
                    {isPlaying ? 'Pause' : 'Play Now'}
                  </Button>
                  {canDownload && (
                    <Button variant="outline" className="w-full mt-3" onClick={handleDownload} isLoading={isDownloading}>
                      <Download size={18} className="mr-2" />Download
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-center mb-5">
                    <span className="text-3xl font-display font-bold text-white">₹{price.toFixed(0)}</span>
                    <span className="text-slate-500 ml-1">one-time</span>
                  </div>
                  <Button className="w-full mb-3" onClick={handlePurchase} isLoading={isPurchasing}>Purchase Now</Button>
                  <div className="text-center">
                    <p className="text-slate-500 text-sm mb-2">or</p>
                    <Link to="/pricing"><Button variant="outline" className="w-full">Subscribe for Unlimited</Button></Link>
                  </div>
                  <p className="text-xs text-slate-500 text-center mt-4">Secure payment via Razorpay</p>
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
