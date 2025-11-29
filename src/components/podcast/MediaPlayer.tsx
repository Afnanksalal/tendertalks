import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  X,
  Loader2,
  RotateCcw,
} from 'lucide-react';

interface MediaPlayerProps {
  src: string;
  type: 'audio' | 'video';
  title: string;
  thumbnail?: string;
  artist?: string;
  album?: string;
  onClose?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  src,
  type,
  title,
  thumbnail,
  artist = 'TenderTalks',
  album = 'Podcast',
  onClose,
  onNext,
  onPrevious,
}) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Media Session API - Notification bar & lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Set metadata for notification/lock screen
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: artist,
      album: album,
      artwork: thumbnail
        ? [
            { src: thumbnail, sizes: '96x96', type: 'image/jpeg' },
            { src: thumbnail, sizes: '128x128', type: 'image/jpeg' },
            { src: thumbnail, sizes: '192x192', type: 'image/jpeg' },
            { src: thumbnail, sizes: '256x256', type: 'image/jpeg' },
            { src: thumbnail, sizes: '384x384', type: 'image/jpeg' },
            { src: thumbnail, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [],
    });

    // Set up action handlers
    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ['play', () => {
        if (mediaRef.current) {
          mediaRef.current.play();
          setIsPlaying(true);
        }
      }],
      ['pause', () => {
        if (mediaRef.current) {
          mediaRef.current.pause();
          setIsPlaying(false);
        }
      }],
      ['stop', () => {
        if (mediaRef.current) {
          mediaRef.current.pause();
          mediaRef.current.currentTime = 0;
          setIsPlaying(false);
          setCurrentTime(0);
        }
      }],
      ['seekbackward', (details) => {
        if (mediaRef.current) {
          const skipTime = details?.seekOffset || 10;
          mediaRef.current.currentTime = Math.max(0, mediaRef.current.currentTime - skipTime);
          setCurrentTime(mediaRef.current.currentTime);
        }
      }],
      ['seekforward', (details) => {
        if (mediaRef.current) {
          const skipTime = details?.seekOffset || 10;
          mediaRef.current.currentTime = Math.min(duration, mediaRef.current.currentTime + skipTime);
          setCurrentTime(mediaRef.current.currentTime);
        }
      }],
      ['seekto', (details) => {
        if (mediaRef.current && details?.seekTime !== undefined) {
          mediaRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      }],
      ['previoustrack', onPrevious || null],
      ['nexttrack', onNext || null],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action not supported
      }
    }

    return () => {
      // Clean up action handlers
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Action not supported
        }
      }
    };
  }, [title, artist, album, thumbnail, duration, onNext, onPrevious]);

  // Update Media Session position state
  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: playbackRate,
        position: currentTime,
      });
    } catch {
      // Position state not supported
    }
  }, [currentTime, duration, playbackRate]);

  // Update Media Session playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Auto-hide controls (but not on mobile when paused)
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);

    if (isPlaying && !isSeeking) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSpeedMenu) {
          setShowControls(false);
        }
      }, 3000);
    }
  }, [isPlaying, isSeeking, showSpeedMenu]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetControlsTimeout]);

  // Handle fullscreen change events
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
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange
      );
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Update buffered progress
  const updateBuffered = useCallback(() => {
    if (mediaRef.current && mediaRef.current.buffered.length > 0) {
      const bufferedEnd = mediaRef.current.buffered.end(
        mediaRef.current.buffered.length - 1
      );
      setBuffered((bufferedEnd / duration) * 100);
    }
  }, [duration]);

  const togglePlay = useCallback(() => {
    if (!mediaRef.current) return;

    if (hasEnded) {
      mediaRef.current.currentTime = 0;
      setHasEnded(false);
    }

    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play().catch(() => {
        // Autoplay blocked - user needs to interact
      });
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, hasEnded]);

  const handleTimeUpdate = useCallback(() => {
    if (mediaRef.current && !isSeeking) {
      setCurrentTime(mediaRef.current.currentTime);
      updateBuffered();
    }
  }, [isSeeking, updateBuffered]);

  const handleLoadedMetadata = useCallback(() => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
      setIsLoading(false);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setHasEnded(true);
    setShowControls(true);
  }, []);

  // Seek handling with touch support
  const getSeekPosition = useCallback(
    (clientX: number) => {
      if (!progressRef.current) return 0;
      const rect = progressRef.current.getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      return percent * duration;
    },
    [duration]
  );

  const handleSeekStart = useCallback(
    (clientX: number) => {
      setIsSeeking(true);
      const time = getSeekPosition(clientX);
      setCurrentTime(time);
    },
    [getSeekPosition]
  );

  const handleSeekMove = useCallback(
    (clientX: number) => {
      if (!isSeeking) return;
      const time = getSeekPosition(clientX);
      setCurrentTime(time);
    },
    [isSeeking, getSeekPosition]
  );

  const handleSeekEnd = useCallback(
    (clientX: number) => {
      if (!mediaRef.current) return;
      const time = getSeekPosition(clientX);
      mediaRef.current.currentTime = time;
      setCurrentTime(time);
      setIsSeeking(false);
      setHasEnded(false);
    },
    [getSeekPosition]
  );

  // Mouse events for progress bar
  const handleProgressMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSeekStart(e.clientX);

    const handleMouseMove = (e: MouseEvent) => handleSeekMove(e.clientX);
    const handleMouseUp = (e: MouseEvent) => {
      handleSeekEnd(e.clientX);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Touch events for progress bar
  const handleProgressTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    handleSeekStart(touch.clientX);
  };

  const handleProgressTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    handleSeekMove(touch.clientX);
  };

  const handleProgressTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    handleSeekEnd(touch.clientX);
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
      const newTime = Math.max(
        0,
        Math.min(duration, mediaRef.current.currentTime + seconds)
      );
      mediaRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setHasEnded(false);
      resetControlsTimeout();
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        const elem = containerRef.current as any;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.webkitEnterFullscreen) {
          // iOS Safari video element fullscreen
          await elem.webkitEnterFullscreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch {
      // Fullscreen not supported or denied
    }
  };

  const setSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const hrs = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  // Handle container click/touch to toggle controls
  const handleContainerInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't toggle if clicking on controls
    if ((e.target as HTMLElement).closest('.player-controls')) return;
    
    if (type === 'video') {
      if (isMobile) {
        // On mobile, tap toggles controls visibility
        setShowControls((prev) => !prev);
        if (!showControls) {
          resetControlsTimeout();
        }
      } else {
        // On desktop, click toggles play/pause
        togglePlay();
      }
    }
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-2xl overflow-hidden select-none ${
        type === 'video' ? 'aspect-video' : 'h-24'
      } ${isFullscreen ? 'rounded-none' : ''}`}
      onClick={handleContainerInteraction}
      onTouchEnd={(e) => {
        if (!(e.target as HTMLElement).closest('.player-controls')) {
          handleContainerInteraction(e);
        }
      }}
      onMouseMove={resetControlsTimeout}
    >
      {/* Video Element */}
      {type === 'video' && (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full h-full object-contain"
          poster={thumbnail}
          playsInline
          preload="metadata"
          // Disable native controls - we use custom ones
          controls={false}
        />
      )}

      {/* Audio Element */}
      {type === 'audio' && (
        <>
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={src}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onWaiting={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-slate-900 to-slate-800">
            {thumbnail && (
              <img
                src={thumbnail}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xl"
              />
            )}
            <div className="relative z-10 flex items-center gap-4 px-6">
              {thumbnail && (
                <img
                  src={thumbnail}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div>
                <h4 className="text-white font-medium">{title}</h4>
                <p className="text-slate-400 text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <Loader2 className="w-10 h-10 text-neon-cyan animate-spin" />
        </div>
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {(showControls || !isPlaying || type === 'audio') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="player-controls absolute inset-0 z-10"
          >
            {/* Gradient Background */}
            {type === 'video' && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
            )}

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex items-center justify-between">
              <h3 className="text-white font-medium truncate max-w-[70%] text-sm sm:text-base drop-shadow-lg">
                {title}
              </h3>
              {onClose && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Center Play Button (Video only) */}
            {type === 'video' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/30 active:scale-95 transition-all"
              >
                {hasEnded ? (
                  <RotateCcw size={28} className="sm:w-8 sm:h-8" />
                ) : isPlaying ? (
                  <Pause size={28} fill="currentColor" className="sm:w-8 sm:h-8" />
                ) : (
                  <Play
                    size={28}
                    fill="currentColor"
                    className="ml-1 sm:w-8 sm:h-8"
                  />
                )}
              </button>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 space-y-2 sm:space-y-3">
              {/* Progress Bar */}
              <div
                ref={progressRef}
                className="relative h-1.5 sm:h-2 bg-white/20 rounded-full cursor-pointer group"
                onMouseDown={handleProgressMouseDown}
                onTouchStart={handleProgressTouchStart}
                onTouchMove={handleProgressTouchMove}
                onTouchEnd={handleProgressTouchEnd}
              >
                {/* Buffered */}
                <div
                  className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                  style={{ width: `${buffered}%` }}
                />
                {/* Progress */}
                <div
                  className="absolute inset-y-0 left-0 bg-neon-cyan rounded-full"
                  style={{ width: `${progressPercent}%` }}
                >
                  {/* Thumb */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between gap-2">
                {/* Left Controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Play/Pause */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="p-2 sm:p-2.5 text-white hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                  >
                    {hasEnded ? (
                      <RotateCcw size={20} className="sm:w-6 sm:h-6" />
                    ) : isPlaying ? (
                      <Pause size={20} className="sm:w-6 sm:h-6" />
                    ) : (
                      <Play size={20} className="sm:w-6 sm:h-6" />
                    )}
                  </button>

                  {/* Skip Back */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      skip(-10);
                    }}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                  >
                    <SkipBack size={18} className="sm:w-5 sm:h-5" />
                  </button>

                  {/* Skip Forward */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      skip(10);
                    }}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                  >
                    <SkipForward size={18} className="sm:w-5 sm:h-5" />
                  </button>

                  {/* Time Display */}
                  <span className="text-white/80 text-xs sm:text-sm ml-1 whitespace-nowrap font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Volume (Desktop) */}
                  <div className="hidden sm:flex items-center gap-1 group">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                      }}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX size={20} />
                      ) : (
                        <Volume2 size={20} />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      onClick={(e) => e.stopPropagation()}
                      className="w-0 group-hover:w-20 transition-all duration-200 opacity-0 group-hover:opacity-100 accent-neon-cyan"
                    />
                  </div>

                  {/* Mute (Mobile) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="sm:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={18} />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </button>

                  {/* Playback Speed */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSpeedMenu(!showSpeedMenu);
                      }}
                      className="px-2 py-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs sm:text-sm font-mono active:scale-95"
                    >
                      {playbackRate}x
                    </button>

                    {/* Speed Menu */}
                    <AnimatePresence>
                      {showSpeedMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {speedOptions.map((speed) => (
                            <button
                              key={speed}
                              onClick={() => setSpeed(speed)}
                              className={`block w-full px-4 py-2 text-sm text-left transition-colors ${
                                playbackRate === speed
                                  ? 'bg-neon-cyan/20 text-neon-cyan'
                                  : 'text-white hover:bg-white/10'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Fullscreen (Video only) */}
                  {type === 'video' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFullscreen();
                      }}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                    >
                      {isFullscreen ? (
                        <Minimize size={18} className="sm:w-5 sm:h-5" />
                      ) : (
                        <Maximize size={18} className="sm:w-5 sm:h-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close speed menu */}
      {showSpeedMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowSpeedMenu(false)}
        />
      )}
    </div>
  );
};
