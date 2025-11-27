import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import { PodcastCard } from '../components/podcast/PodcastCard';
import { usePodcastStore } from '../stores/podcastStore';
import { useUserStore } from '../stores/userStore';
import { useAuthStore } from '../stores/authStore';

export const BrowsePage: React.FC = () => {
  const { podcasts, categories, fetchPodcasts, fetchCategories, isLoading, filters, setFilters, clearFilters } = usePodcastStore();
  const { canAccessPodcast, fetchPurchases, fetchSubscription } = useUserStore();
  const { user } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchPodcasts();
    fetchCategories();
    if (user) {
      fetchPurchases();
      fetchSubscription();
    }
  }, [fetchPodcasts, fetchCategories, fetchPurchases, fetchSubscription, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ search: searchQuery });
  };

  const handleCategoryFilter = (categoryId: string | undefined) => {
    setFilters({ categoryId });
  };

  const handlePriceFilter = (isFree: boolean | undefined) => {
    setFilters({ isFree });
  };

  return (
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-36 pb-20 px-4 relative">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-neon-purple/10 rounded-full blur-[80px] md:blur-[100px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-neon-cyan/5 rounded-full blur-[60px] md:blur-[80px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-10 md:mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white mb-3 md:mb-4 tracking-tight"
          >
            Archive
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-lg text-base md:text-lg"
          >
            Decoding the signal from the noise. Browse our collection of future-focused dialogues.
          </motion.p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search podcasts..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-10 text-white focus:outline-none focus:border-neon-cyan/50 focus:bg-white/10 focus:ring-1 focus:ring-neon-cyan/30 transition-all placeholder:text-slate-600"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => { setSearchQuery(''); clearFilters(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                >
                  <X size={16} />
                </button>
              )}
            </form>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium transition-all touch-feedback ${
                showFilters 
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' 
                  : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
              }`}
            >
              <Filter size={18} />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>

          {/* Filter Tags */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
            <button
              onClick={() => handlePriceFilter(undefined)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all touch-feedback ${
                filters.isFree === undefined
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handlePriceFilter(true)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all touch-feedback ${
                filters.isFree === true
                  ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              Free
            </button>
            <button
              onClick={() => handlePriceFilter(false)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all touch-feedback ${
                filters.isFree === false
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              Premium
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-5 md:p-6 bg-slate-900/50 border border-white/10 rounded-2xl"
          >
            <h4 className="text-sm font-medium text-slate-300 mb-3">Categories</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryFilter(undefined)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  !filters.categoryId
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filters.categoryId === cat.id
                      ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {(filters.categoryId || filters.isFree !== undefined || filters.search) && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm text-slate-400 hover:text-neon-cyan transition-colors"
              >
                Clear all filters
              </button>
            )}
          </motion.div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-800 rounded-full" />
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-neon-cyan border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : podcasts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg mb-4">No podcasts found</p>
            <button 
              onClick={clearFilters}
              className="text-neon-cyan hover:underline font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8"
          >
            {podcasts.map((podcast, idx) => (
              <motion.div
                key={podcast.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <PodcastCard
                  podcast={podcast}
                  canAccess={canAccessPodcast(podcast.id, podcast.isFree)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};
