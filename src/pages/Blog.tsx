import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Clock, Calendar, User, Star, FileText, Loader2 } from 'lucide-react';
import { useBlogStore } from '../stores/blogStore';
import { usePodcastStore } from '../stores/podcastStore';
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
                    <Link
                      key={blog.id}
                      to={`/blog/${blog.slug}`}
                      className="group"
                    >
                      <motion.article
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-neon-cyan/30 transition-all"
                      >
                        <div className="aspect-[16/9] relative overflow-hidden">
                          {blog.bannerUrl ? (
                            <img
                              src={blog.bannerUrl}
                              alt={blog.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 flex items-center justify-center">
                              <FileText size={48} className="text-white/20" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 bg-amber-400/90 text-black text-xs font-bold rounded-lg flex items-center gap-1">
                              <Star size={10} fill="currentColor" /> Featured
                            </span>
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-neon-cyan transition-colors line-clamp-2">
                            {blog.title}
                          </h3>
                          {blog.excerpt && (
                            <p className="text-slate-400 text-sm mb-4 line-clamp-2">{blog.excerpt}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            {blog.creator && (
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {blog.creator.name || 'Author'}
                              </span>
                            )}
                            {blog.readTime && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {blog.readTime} min read
                              </span>
                            )}
                            {blog.publishedAt && (
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(blog.publishedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.article>
                    </Link>
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
                  <Link
                    key={blog.id}
                    to={`/blog/${blog.slug}`}
                    className="group"
                  >
                    <motion.article
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                      className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden hover:border-neon-cyan/30 transition-all h-full flex flex-col"
                    >
                      <div className="aspect-[16/10] relative overflow-hidden">
                        {blog.bannerUrl ? (
                          <img
                            src={blog.bannerUrl}
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-neon-purple/10 to-neon-cyan/10 flex items-center justify-center">
                            <FileText size={32} className="text-white/20" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="text-base font-bold text-white mb-2 group-hover:text-neon-cyan transition-colors line-clamp-2">
                          {blog.title}
                        </h3>
                        {blog.excerpt && (
                          <p className="text-slate-400 text-sm mb-3 line-clamp-2 flex-1">{blog.excerpt}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-auto">
                          {blog.readTime && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {blog.readTime} min
                            </span>
                          )}
                          {blog.publishedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(blog.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {blog.tags && blog.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {blog.tags.slice(0, 3).map((tag: any) => (
                              <span key={tag.id} className="px-2 py-0.5 bg-white/5 rounded text-xs text-slate-500">
                                #{tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.article>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};
