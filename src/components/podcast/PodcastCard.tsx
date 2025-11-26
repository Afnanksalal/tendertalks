import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Clock, Lock, Video, Headphones } from 'lucide-react';
import type { Podcast, Category } from '../../db/schema';

interface PodcastCardProps {
  podcast: Podcast & { category?: Category | null };
  canAccess?: boolean;
  onPlay?: () => void;
}

export const PodcastCard: React.FC<PodcastCardProps> = ({
  podcast,
  canAccess = false,
  onPlay,
}) => {
  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPrice = (price: string | null, isFree: boolean) => {
    if (isFree) return 'Free';
    if (!price || parseFloat(price) === 0) return 'Free';
    return `₹${parseFloat(price).toFixed(0)}`;
  };

  return (
    <div className="group relative bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-xl md:rounded-2xl overflow-hidden hover:border-neon-cyan/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,240,255,0.1)] md:hover:-translate-y-1 card-hover">
      {/* Thumbnail */}
      <Link to={`/podcast/${podcast.slug}`} className="block relative aspect-video overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
        {podcast.thumbnailUrl ? (
          <img
            src={podcast.thumbnailUrl}
            alt={podcast.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            {podcast.mediaType === 'video' ? (
              <Video className="w-12 h-12 text-slate-600" />
            ) : (
              <Headphones className="w-12 h-12 text-slate-600" />
            )}
          </div>
        )}

        {/* Play Button Overlay */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-[2px]">
          <button
            onClick={(e) => {
              e.preventDefault();
              onPlay?.();
            }}
            className="w-14 h-14 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-neon-cyan hover:border-neon-cyan hover:text-black hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] touch-feedback"
            aria-label={`Play ${podcast.title}`}
          >
            <Play size={24} fill="currentColor" className="ml-1" />
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 z-20 flex gap-2">
          {podcast.mediaType === 'video' && (
            <span className="px-2 py-1 bg-neon-purple/80 backdrop-blur text-white text-[10px] font-bold rounded uppercase tracking-wide">
              Video
            </span>
          )}
          {!podcast.isFree && !canAccess && (
            <span className="px-2 py-1 bg-amber-500/80 backdrop-blur text-white text-[10px] font-bold rounded flex items-center gap-1">
              <Lock size={10} /> Premium
            </span>
          )}
        </div>

        {/* Duration Badge */}
        <div className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-white flex items-center gap-1">
          <Clock size={10} /> {formatDuration(podcast.duration)}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 md:p-5">
        {/* Category */}
        {podcast.category && (
          <span className="text-xs font-medium text-neon-cyan mb-2 block">
            {podcast.category.name}
          </span>
        )}

        {/* Title */}
        <Link to={`/podcast/${podcast.slug}`}>
          <h3 className="text-base md:text-lg font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-neon-cyan transition-colors">
            {podcast.title}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-slate-400 text-sm line-clamp-2 mb-4 font-light leading-relaxed">
          {podcast.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className={`text-sm font-bold ${podcast.isFree ? 'text-neon-green' : 'text-white'}`}>
            {formatPrice(podcast.price, podcast.isFree)}
          </span>

          {podcast.publishedAt && (
            <span className="text-xs text-slate-500">
              {new Date(podcast.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          )}
        </div>
      </div>

      {/* Mobile Play Button */}
      <button 
        onClick={onPlay}
        className="md:hidden absolute bottom-4 right-4 w-10 h-10 rounded-full bg-neon-cyan text-black flex items-center justify-center shadow-lg shadow-neon-cyan/30 touch-feedback z-30"
        aria-label={`Play ${podcast.title}`}
      >
        <Play size={18} fill="currentColor" className="ml-0.5" />
      </button>
    </div>
  );
};
