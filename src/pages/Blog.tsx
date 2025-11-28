import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Star, FileText, Loader2 } from 'lucide-react';
import { useBlogStore } from '../stores/blogStore';
import { usePodcastStore } from '../stores/podcastStore';
import { BlogCard } from '../components/blog/BlogCard';
import { Input } from '../components/ui/Input';
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

  return (
    <div className="min-h-screen bg-[#030014] pt-24 sm:pt-28 md:pt-32 pb-20">
      <SEO
        title="Blog"
        description="Read the latest articles, insights, and stories from TenderTalks"
        url="/blog"
        keywords="blog, articles, TenderTalks, AI, technology, insights, stories"
      />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-neon-cyan/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white mb-4"
          >
            Blog
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto"
          >
            Insights, stories, and updates from our team
          </motion.p>
        </div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={18} />}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedTag
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                  : 'bg-slate-800/50 text-slate-400 border border-white/10 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(tag.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedTag === tag.id
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                    : 'bg-slate-800/50 text-slate-400 border border-white/10 hover:bg-slate-700'
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No articles found</p>
          </div>
        ) : (
          <>
            {/* Featured Posts */}
            {featuredBlogs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-12"
              >
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Star size={20} className="text-amber-400" fill="currentColor" />
                  Featured
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredBlogs.slice(0, 2).map((blog, idx) => (
                    <motion.div
                      key={blog.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                    >
                      <BlogCard blog={blog} featured />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* All Posts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {featuredBlogs.length > 0 && regularBlogs.length > 0 && (
                <h2 className="text-xl font-bold text-white mb-4">All Articles</h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularBlogs.map((blog, idx) => (
                  <motion.div
                    key={blog.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
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
