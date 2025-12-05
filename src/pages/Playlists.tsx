import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Music, Loader2 } from 'lucide-react';
import { PlaylistCard } from '../components/playlists/PlaylistCard';
import { SEO } from '../components/SEO';
import { getPlaylists } from '../api/playlists';
import { useUserStore } from '../stores/userStore';
import type { Playlist } from '../db/schema';

export const PlaylistsPage: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { hasPurchased } = useUserStore();

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        setIsLoading(true);
        const data = await getPlaylists({ search: searchQuery });
        setPlaylists(data);
      } catch (error) {
        console.error('Failed to load playlists:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(loadPlaylists, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#030014] pt-24 pb-20 px-4">
      <SEO title="Playlists" description="Curated collections of our best podcasts and episodes." />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
              Playlists
            </h1>
            <p className="text-slate-400">Curated collections for every mood and topic</p>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
          </div>
        ) : playlists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {playlists.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PlaylistCard
                  playlist={{
                    ...playlist,
                    isPurchased: hasPurchased(playlist.id), // Assuming hasPurchased checks playlists too or we update it
                  }}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No playlists found</h3>
            <p className="text-slate-400">Try adjusting your search terms</p>
          </div>
        )}
      </div>
    </div>
  );
};
