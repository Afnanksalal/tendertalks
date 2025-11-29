import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play, Pause, Lock, Clock, Calendar, Tag, ArrowLeft, Loader2,
  Download, Share2, Volume2, VolumeX, SkipBack, SkipForward,
  Video, Music, Maximize, Settings
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

  // Refs for tracking
  const hasFetchedRef = useRef<string | null>(null);
  const userFetchedRef = useRef(false);


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
    };
  }, [showPlayer, currentPodcast]);

  // Close menus on outside click
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

  const handleSeek = (e: React.MouseEvent | React.TouchEvent) => {
    if (!progressRef.current || !mediaRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = percent * duration;
    mediaRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleSeekStart = () => setIsSeeking(true);
  const handleSeekEnd = () => setIsSeeking(false);

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
    const video = mediaRef.current as HTMLVideoElement;
    if (!video) return;
    try {
      if (video.requestFullscreen) await video.requestFullscreen();
      else if ((video as any).webkitEnterFullscreen) (video as any).webkitEnterFullscreen();
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
            {/* Media Container */}
            <div className={`relative aspect-video rounded-xl overflow-hidden mb-4 ${podcast.mediaType === 'video' ? 'bg-black' : 'bg-neon-cyan/5'}`}>
              {hasAccess && podcast.mediaUrl && showPlayer && podcast.mediaType === 'video' ? (
                <video
                  ref={mediaRef as React.RefObject<HTMLVideoElement>}
                  src={podcast.mediaUrl}
                  poster={podcast.thumbnailUrl || undefined}
                  controls={isFullscreen}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onWaiting={() => setIsBuffering(true)}
                  onCanPlay={() => setIsBuffering(false)}
                  className="w-full h-full object-contain"
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

              {/* Media Type Badge */}
              <div className="absolute top-3 left-3 z-20">
                <span className={`px-2.5 py-1 backdrop-blur text-xs font-bold rounded-lg flex items-center gap-1.5 ${
                  podcast.mediaType === 'video' ? 'bg-neon-purple/90 text-white' : 'bg-neon-cyan/90 text-black'
                }`}>
                  {podcast.mediaType === 'video' ? <Video size={12} /> : <Music size={12} />}
                  {podcast.mediaType.toUpperCase()}
                </span>
              </div>

              {/* Overlay */}
              {!(showPlayer && podcast.mediaType === 'video' && isPlaying) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              )}

              {/* Center Play Button */}
              {(!showPlayer || !isPlaying || podcast.mediaType === 'audio') && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {hasAccess ? (
                    <button onClick={togglePlay} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-neon-cyan hover:text-black active:scale-95 transition-all">
                      {isBuffering ? <Loader2 size={28} className="animate-spin" /> : isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                    </button>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-3 mx-auto">
                        <Lock size={28} />
                      </div>
                      <p className="text-white font-medium text-sm">Premium Content</p>
                    </div>
                  )}
                </div>
              )}

              {/* Video tap to pause */}
              {showPlayer && isPlaying && podcast.mediaType === 'video' && (
                <div className="absolute inset-0 cursor-pointer" onClick={togglePlay} />
              )}

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
            </div>


            {/* Enhanced Player Controls */}
            {showPlayer && hasAccess && (
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

                {/* Progress Bar - Touch optimized */}
                <div className="mb-3">
                  <div
                    ref={progressRef}
                    className="h-2 sm:h-1.5 bg-white/10 rounded-full cursor-pointer group touch-none"
                    onClick={handleSeek}
                    onTouchStart={handleSeekStart}
                    onTouchMove={handleSeek}
                    onTouchEnd={handleSeekEnd}
                  >
                    <div className="h-full bg-neon-cyan rounded-full relative" style={{ width: `${progressPercent}%` }}>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 group-active:scale-100 transition-transform" />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>-{formatTime(duration - currentTime)}</span>
                  </div>
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between">
                  {/* Left: Skip & Play */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={() => skip(-10)} className="p-2 text-slate-400 hover:text-white active:scale-90 transition-all" aria-label="Rewind 10s">
                      <SkipBack size={20} />
                    </button>
                    <button
                      onClick={togglePlay}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center active:scale-95 transition-transform ${
                        podcast.mediaType === 'video' ? 'bg-neon-purple text-white' : 'bg-neon-cyan text-black'
                      }`}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isBuffering ? <Loader2 size={22} className="animate-spin" /> : isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button onClick={() => skip(10)} className="p-2 text-slate-400 hover:text-white active:scale-90 transition-all" aria-label="Forward 10s">
                      <SkipForward size={20} />
                    </button>
                  </div>

                  {/* Right: Volume, Speed, Fullscreen */}
                  <div className="flex items-center gap-1">
                    {/* Volume Control */}
                    <div className="relative volume-control">
                      <button onClick={(e) => { e.stopPropagation(); setShowVolumeSlider(!showVolumeSlider); setShowSpeedMenu(false); }} className="p-2 text-slate-400 hover:text-white transition-colors">
                        {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                      </button>
                      {showVolumeSlider && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50">
                          <div
                            ref={volumeRef}
                            className="w-24 h-2 bg-white/10 rounded-full cursor-pointer"
                            onClick={handleVolumeChange}
                            onTouchMove={handleVolumeChange}
                          >
                            <div className="h-full bg-neon-cyan rounded-full" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
                          </div>
                          <button onClick={toggleMute} className="mt-2 text-xs text-slate-400 hover:text-white w-full text-center">
                            {isMuted ? 'Unmute' : 'Mute'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Speed Control */}
                    <div className="relative speed-menu">
                      <button onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); setShowVolumeSlider(false); }} className="p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                        <Settings size={18} />
                        <span className="text-xs hidden sm:inline">{playbackSpeed}x</span>
                      </button>
                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-2 p-2 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 min-w-[100px]">
                          <p className="text-xs text-slate-500 px-2 mb-1">Speed</p>
                          {PLAYBACK_SPEEDS.map((speed) => (
                            <button
                              key={speed}
                              onClick={() => changeSpeed(speed)}
                              className={`w-full px-3 py-1.5 text-left text-sm rounded transition-colors ${
                                playbackSpeed === speed ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-slate-300 hover:bg-white/5'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen (video only) */}
                    {podcast.mediaType === 'video' && (
                      <button onClick={handleFullscreen} className="p-2 text-slate-400 hover:text-white transition-colors" aria-label="Fullscreen">
                        <Maximize size={18} />
                      </button>
                    )}
                  </div>
                </div>
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
