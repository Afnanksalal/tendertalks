import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Star, FileText, X } from 'lucide-react';
import { useBlogStore } from '../stores/blogStore';
import { usePodcastStore } from '../stores/podcastStore';
import { BlogCard } from '../components/blog/BlogCard';
import { SEO } from '../components/SEO';

export const BlogPage: React.FC = () => {
  const { blogs, fetchBlogs, isLoading } = useBlogStore();
  const { tags, fetchTags } = usePodcastStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Handle URL tag parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tagParam = urlParams.get('tag');
    if (tagParam) {
      setSelectedTag(tagParam);
    }
  }, []);

  useEffect(() => {
    fetchBlogs();
    fetchTags();
  }, [fetchBlogs, fetchTags]);

  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || blog.tags?.some((t: any) => t.id === selectedTag);
    return matchesSearch && matchesTag;
  });

  const featuredBlogs = filteredBlogs.filter(b => b.isFeatured);
  const regularBlogs = filteredBlogs.filter(b => !b.isFeatured);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag(null);
  };

  return (
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-36 pb-20 px-4 relative">
      <SEO
        title="Blog"
        description="Read the latest articles, insights, and stories from TenderTalks"
        url="/blog"
        keywords="blog, articles, TenderTalks, AI, technology, insights, stories"
      />

      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-neon-cyan/10 rounded-full blur-[80px] md:blur-[100px]" />
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
            Blog
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-lg text-base md:text-lg"
          >
            Insights, stories, and deep dives into AI, tech, and human connection.
          </motion.p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={(e) => e.preventDefault()} className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search articles..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-10 text-white focus:outline-none focus:border-neon-cyan/50 focus:bg-white/10 focus:ring-1 focus:ring-neon-cyan/30 transition-all placeholder:text-slate-600"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                >
                  <X size={16} />
                </button>
              )}
            </form>
          </div>

          {/* Tags */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
            <button
              onClick={() => setSelectedTag(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all touch-feedback ${
                !selectedTag
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(tag.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all touch-feedback ${
                  selectedTag === tag.id
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-800 rounded-full" />
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-neon-cyan border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg mb-4">No articles found</p>
            <button 
              onClick={clearFilters}
              className="text-neon-cyan hover:underline font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Featured Posts */}
            {featuredBlogs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-12"
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Star size={20} className="text-amber-400" fill="currentColor" />
                  Featured
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {featuredBlogs.slice(0, 2).map((blog, idx) => (
                    <motion.div
                      key={blog.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                    >
                      <BlogCard blog={blog} featured />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* All Posts */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {featuredBlogs.length > 0 && regularBlogs.length > 0 && (
                <h2 className="text-xl font-bold text-white mb-4">All Articles</h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                {regularBlogs.map((blog, idx) => (
                  <motion.div
                    key={blog.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <BlogCard blog={blog} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};
