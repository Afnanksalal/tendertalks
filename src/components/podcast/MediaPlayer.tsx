import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  SkipBack, SkipForward, Settings, X, Loader2 
} from 'lucide-react';

interface MediaPlayerProps {
  src: string;
  type: 'audio' | 'video';
  title: string;
  thumbnail?: string;
  onClose?: () => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  src,
  type,
  title,
  thumbnail,
  onClose,
}) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Hide controls after inactivity
  useEffect(() => {
    if (!isPlaying) return;

    let timeout: NodeJS.Timeout;
    const hideControls = () => {
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    hideControls();

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      hideControls();
    };

    containerRef.current?.addEventListener('mousemove', handleMouseMove);
    return () => {
      clearTimeout(timeout);
      containerRef.current?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isPlaying]);

  // Handle fullscreen change events (including ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
      setIsLoading(false);
    }
  }, []);

  const handleSeek = useCallback((clientX: number) => {
    if (!progressRef.current || !mediaRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = percent * duration;
    mediaRef.current.currentTime = time;
    setCurrentTime(time);
  }, [duration]);

  const handleProgressClick = (e: React.MouseEvent) => {
    handleSeek(e.clientX);
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (mediaRef.current) {
      mediaRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const skip = (seconds: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = Math.max(0, Math.min(duration, mediaRef.current.currentTime + seconds));
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    try {
      if (!isFullscreen) {
        // Safari uses webkitRequestFullscreen
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  const MediaElement = type === 'video' ? 'video' : 'audio';

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-2xl overflow-hidden ${
        type === 'video' ? 'aspect-video' : 'h-24'
      }`}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Media Element */}
      <MediaElement
        ref={mediaRef as any}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        className={type === 'video' ? 'w-full h-full object-contain' : 'hidden'}
        poster={thumbnail}
        playsInline // Required for iOS Safari inline playback
        webkit-playsinline="" // Legacy iOS support
        preload="metadata"
      />

      {/* Audio Visualization (for audio type) */}
      {type === 'audio' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-slate-900 to-slate-800">
          {thumbnail && (
            <img src={thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xl" />
          )}
          <div className="relative z-10 flex items-center gap-4 px-6">
            {thumbnail && (
              <img src={thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div>
              <h4 className="text-white font-medium">{title}</h4>
              <p className="text-slate-400 text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-10 h-10 text-neon-cyan animate-spin" />
        </div>
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {(showControls || !isPlaying) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"
          >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
              <h3 className="text-white font-medium truncate max-w-[70%]">{title}</h3>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Center Play Button */}
            {type === 'video' && (
              <button
                onClick={togglePlay}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
              </button>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              {/* Progress Bar */}
              <div
                ref={progressRef}
                className="h-1 bg-white/20 rounded-full cursor-pointer group"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-neon-cyan rounded-full relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors touch-feedback"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button
                    onClick={() => skip(-10)}
                    className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors touch-feedback"
                  >
                    <SkipBack size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button
                    onClick={() => skip(10)}
                    className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors touch-feedback"
                  >
                    <SkipForward size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <span className="text-white/70 text-xs sm:text-sm ml-1 sm:ml-2 whitespace-nowrap">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Volume - hidden on mobile */}
                  <div className="hidden sm:flex items-center gap-1 group">
                    <button
                      onClick={toggleMute}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover:w-20 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    />
                  </div>

                  {/* Mute button on mobile */}
                  <button
                    onClick={toggleMute}
                    className="sm:hidden p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors touch-feedback"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>

                  {/* Playback Speed */}
                  <button
                    onClick={changePlaybackRate}
                    className="px-1.5 sm:px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs sm:text-sm font-mono touch-feedback"
                  >
                    {playbackRate}x
                  </button>

                  {/* Fullscreen (video only) */}
                  {type === 'video' && (
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors touch-feedback"
                    >
                      {isFullscreen ? <Minimize size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Maximize size={16} className="sm:w-[18px] sm:h-[18px]" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
