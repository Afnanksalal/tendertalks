import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Music, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlaylistCardProps {
  playlist: {
    id: string;
    title: string;
    slug: string;
    description?: string | null;
    coverUrl?: string | null;
    price?: string | null;
    podcastCount?: number;
    isPurchased?: boolean;
  };
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist }) => {
  const isFree = !playlist.price || parseFloat(playlist.price) === 0;

  return (
    <Link to={`/playlists/${playlist.id}`} className="group">
      <motion.div
        whileHover={{ y: -5 }}
        className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden hover:border-neon-cyan/50 transition-colors"
      >
        {/* Cover Image */}
        <div className="aspect-square relative overflow-hidden bg-slate-800">
          {playlist.coverUrl ? (
            <img
              src={playlist.coverUrl}
              alt={playlist.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <Music size={48} />
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
            <div className="w-12 h-12 rounded-full bg-neon-cyan text-black flex items-center justify-center transform scale-50 group-hover:scale-100 transition-transform duration-300">
              <Play size={24} fill="currentColor" />
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            {playlist.isPurchased ? (
              <span className="px-2 py-1 rounded-md bg-neon-green/90 text-black text-xs font-bold shadow-lg backdrop-blur-sm">
                Owned
              </span>
            ) : isFree ? (
              <span className="px-2 py-1 rounded-md bg-slate-900/80 text-white text-xs font-bold border border-white/20 backdrop-blur-sm">
                Free
              </span>
            ) : (
              <span className="px-2 py-1 rounded-md bg-neon-purple/90 text-white text-xs font-bold shadow-lg backdrop-blur-sm flex items-center gap-1">
                <Lock size={10} />₹{playlist.price}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-white font-bold truncate mb-1 group-hover:text-neon-cyan transition-colors">
            {playlist.title}
          </h3>
          <p className="text-slate-400 text-sm line-clamp-2 mb-3 h-10">
            {playlist.description || 'No description available'}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Music size={12} />
              {playlist.podcastCount || 0} tracks
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
