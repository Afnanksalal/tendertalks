import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, ArrowRight, Zap, Globe, Cpu, Mic2, Sparkles, Headphones, Star } from 'lucide-react';
import { PodcastCard } from '../components/podcast/PodcastCard';
import { BlogCard } from '../components/blog/BlogCard';
import { usePodcastStore } from '../stores/podcastStore';
import { useBlogStore } from '../stores/blogStore';
import { StarField } from '../components/effects/StarField';
import { FloatingOrbs } from '../components/effects/FloatingOrbs';
import { SEO } from '../components/SEO';

// Simple fade animation - no complex transforms on mobile
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.4 }
};

export const HomePage: React.FC = () => {
  const { podcasts, fetchPodcasts, isLoading } = usePodcastStore();
  const { blogs, fetchBlogs } = useBlogStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchPodcasts();
    fetchBlogs({ limit: 3 });
  }, [fetchPodcasts, fetchBlogs]);

  return (
    <div className="min-h-screen bg-[#030014] overflow-x-hidden relative">
      <SEO 
        url="/"
        keywords="podcast, technology, AI, artificial intelligence, tech talks, TenderTalks, Afnan, Jenna"
      />
      {/* Background Effects Layer - Orbs and grid behind content */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <FloatingOrbs />
        {/* Grid - hidden on mobile */}
        {!isMobile && (
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:50px_50px] opacity-30" />
        )}
      </div>
      
      {/* StarField Layer - Renders ABOVE content but pointer-events-none so it doesn't block clicks */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[100]">
        <StarField />
      </div>
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] sm:min-h-screen flex items-center justify-center px-4 py-16 pt-24 sm:pt-28">
        {/* Hero glow - simplified on mobile */}
        {!isMobile && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-neon-cyan/5 via-transparent to-transparent rounded-full" />
          </div>
        )}

        <div className="relative z-[2] max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            {...fadeIn}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan text-[10px] sm:text-xs font-bold tracking-wider uppercase mb-6 sm:mb-8"
          >
            <Sparkles className="w-3 h-3" />
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-neon-cyan animate-pulse" />
            Come talk with Afnan & Jenna
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            {...fadeIn}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-[1.1] tracking-tight"
          >
            <span className="block text-white">
              FUTURE
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan via-whale-400 to-neon-purple">
              UNFILTERED
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            {...fadeIn}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-base sm:text-lg md:text-xl text-slate-400 max-w-xl sm:max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2"
          >
            Exploring the cutting edge of{' '}
            <span className="text-neon-cyan font-medium">AI</span>,{' '}
            <span className="text-neon-cyan font-medium">Tech</span>, and{' '}
            <span className="text-whale-400 font-medium">Human Connection</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4"
          >
            <Link 
              to="/browse"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-neon-cyan text-slate-900 rounded-full font-bold transition-all hover:shadow-glow-cyan flex items-center justify-center gap-2 touch-feedback"
            >
              Start Listening
              <Play size={18} fill="currentColor" />
            </Link>
            <Link 
              to="/pricing"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 border border-white/10 text-white rounded-full font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 touch-feedback"
            >
              View Plans
              <ArrowRight size={18} />
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6 sm:gap-8 mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-white/5"
          >
            {[
              { value: '50+', label: 'Episodes', icon: Headphones },
              { value: '10K+', label: 'Listeners', icon: Globe },
              { value: '4.9', label: 'Rating', icon: Star },
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center gap-2 sm:gap-3 text-center">
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-neon-cyan" />
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll Indicator - Desktop only */}
        {!isMobile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
          >
            <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
              <motion.div 
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-neon-cyan"
              />
            </div>
          </motion.div>
        )}
      </section>

      {/* Featured Podcasts */}
      <section className="py-12 sm:py-16 md:py-24 px-4 relative">
        <div className="max-w-7xl mx-auto relative z-[2]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-8 sm:mb-12">
            <div>
              <span className="inline-flex items-center gap-2 text-neon-cyan text-xs sm:text-sm font-bold tracking-wider uppercase mb-1 sm:mb-2">
                <span className="w-6 sm:w-8 h-[2px] bg-neon-cyan" />
                Latest Episodes
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white">
                Fresh Content
              </h2>
            </div>
            <Link 
              to="/browse" 
              className="flex items-center gap-2 text-slate-400 hover:text-neon-cyan transition-colors font-medium text-sm sm:text-base touch-feedback"
            >
              View All
              <ArrowRight size={16} />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-900/40 rounded-2xl overflow-hidden border border-white/5">
                  <div className="aspect-video skeleton" />
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="h-4 w-20 skeleton rounded" />
                    <div className="h-5 sm:h-6 w-full skeleton rounded" />
                    <div className="h-4 w-3/4 skeleton rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : podcasts.length === 0 ? (
            <div className="text-center py-12 sm:py-16 bg-slate-900/30 rounded-2xl border border-white/5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800/50 border border-white/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Mic2 className="w-8 h-8 sm:w-10 sm:h-10 text-slate-600" />
              </div>
              <p className="text-slate-400 mb-2 text-base sm:text-lg">No podcasts available yet</p>
              <p className="text-slate-500 text-sm">Check back soon for new content!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {podcasts.slice(0, 6).map((podcast, idx) => (
                <motion.div
                  key={podcast.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: isMobile ? 0 : idx * 0.1, duration: 0.4 }}
                >
                  <PodcastCard podcast={podcast} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest Blog Posts */}
      {blogs.length > 0 && (
        <section className="py-12 sm:py-16 md:py-24 px-4 relative">
          <div className="max-w-7xl mx-auto relative z-[2]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-8 sm:mb-12">
              <div>
                <span className="inline-flex items-center gap-2 text-neon-cyan text-xs sm:text-sm font-bold tracking-wider uppercase mb-1 sm:mb-2">
                  <span className="w-6 sm:w-8 h-[2px] bg-neon-cyan" />
                  From the Blog
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white">
                  Latest Articles
                </h2>
              </div>
              <Link 
                to="/blog" 
                className="flex items-center gap-2 text-slate-400 hover:text-neon-cyan transition-colors font-medium text-sm sm:text-base touch-feedback"
              >
                View All
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {blogs.slice(0, 3).map((blog, idx) => (
                <motion.div
                  key={blog.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: isMobile ? 0 : idx * 0.1, duration: 0.4 }}
                >
                  <BlogCard blog={blog} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 relative">
        <div className="max-w-7xl mx-auto relative z-[2]">
          <div className="text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 text-neon-purple text-xs sm:text-sm font-bold tracking-wider uppercase mb-3 sm:mb-4">
              <span className="w-6 sm:w-8 h-[2px] bg-neon-purple" />
              Features
              <span className="w-6 sm:w-8 h-[2px] bg-neon-purple" />
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white mb-3 sm:mb-4">
              Why TenderTalks?
            </h2>
            <div className="h-1 w-20 sm:w-24 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-cyan mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { 
                icon: Zap, 
                title: "Exclusive Content", 
                desc: "Access audio and video content you won't find anywhere else.",
                color: "neon-cyan",
              },
              { 
                icon: Cpu, 
                title: "Deep Dives", 
                desc: "Unpacking complex topics in AI, tech, and what they mean for you.",
                color: "neon-purple",
              },
              { 
                icon: Globe, 
                title: "Global Community", 
                desc: "Connect with like-minded futurists and builders worldwide.",
                color: "neon-green",
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: isMobile ? 0 : idx * 0.1, duration: 0.4 }}
                className={`p-5 sm:p-6 md:p-8 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-${feature.color}/30 transition-all touch-feedback`}
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-${feature.color}/10 border border-${feature.color}/20 flex items-center justify-center text-${feature.color} mb-4 sm:mb-5`}>
                  <feature.icon size={22} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 relative">
        <div className="max-w-3xl mx-auto relative z-[2]">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="relative p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-white/10 text-center overflow-hidden"
          >
            <div className="relative z-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30 border border-neon-cyan/30 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Mic2 className="w-8 h-8 sm:w-10 sm:h-10 text-neon-cyan" />
              </div>
              
              <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white mb-3 sm:mb-4">
                Ready to Start Listening?
              </h2>
              <p className="text-slate-400 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base">
                Join thousands of listeners. Start with free episodes or subscribe for full access.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Link 
                  to="/browse" 
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-neon-cyan text-slate-900 font-bold rounded-xl hover:shadow-glow-cyan transition-all touch-feedback"
                >
                  Browse Free Content
                </Link>
                <Link 
                  to="/pricing" 
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all touch-feedback"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
