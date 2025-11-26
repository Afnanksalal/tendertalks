import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, ArrowRight, Zap, Globe, Cpu, Mic2 } from 'lucide-react';
import { PodcastCard } from '../components/podcast/PodcastCard';
import { usePodcastStore } from '../stores/podcastStore';

export const HomePage: React.FC = () => {
  const { podcasts, fetchPodcasts, isLoading } = usePodcastStore();

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  return (
    <div className="min-h-screen bg-[#030014] overflow-x-hidden">
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] md:w-[800px] h-[500px] md:h-[800px] bg-neon-purple/15 rounded-full blur-[100px]" />
          <div className="absolute top-0 right-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-neon-cyan/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-whale-600/15 rounded-full blur-[80px]" />
          
          {/* Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center mt-16 md:mt-20">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan text-xs font-bold tracking-wider uppercase mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
            Premium Podcast Platform
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[1.1] tracking-tight"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Exploring the cutting edge of{' '}
            <span className="text-white font-medium">AI</span>,{' '}
            <span className="text-white font-medium">Tech</span>, and{' '}
            <span className="text-white font-medium">Human Connection</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link 
              to="/browse"
              className="w-full sm:w-auto px-8 py-4 bg-neon-cyan text-slate-900 rounded-full font-bold transition-all hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              Start Listening
              <Play size={18} fill="currentColor" />
            </Link>
            <Link 
              to="/pricing"
              className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full font-bold hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
              View Plans
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
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
      </section>

      {/* Featured Podcasts */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-neon-cyan text-sm font-bold tracking-wider uppercase mb-2 block">
                Latest Episodes
              </span>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white">
                Fresh Content
              </h2>
            </div>
            <Link 
              to="/browse" 
              className="flex items-center gap-2 text-slate-400 hover:text-neon-cyan transition-colors font-medium"
            >
              View All Episodes 
              <ArrowRight size={18} />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-900/40 rounded-2xl overflow-hidden border border-white/5">
                  <div className="aspect-video skeleton" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-20 skeleton rounded" />
                    <div className="h-6 w-full skeleton rounded" />
                    <div className="h-4 w-3/4 skeleton rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : podcasts.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-white/5">
              <Mic2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No podcasts available yet</p>
              <p className="text-slate-500 text-sm">Check back soon for new content!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {podcasts.slice(0, 6).map((podcast, idx) => (
                <motion.div
                  key={podcast.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <PodcastCard podcast={podcast} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-whale-900/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Why TenderTalks?
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-neon-cyan to-neon-purple mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                icon: Zap, 
                title: "Premium Content", 
                desc: "Access exclusive audio and video content from industry experts and thought leaders.",
                color: "text-neon-cyan",
              },
              { 
                icon: Cpu, 
                title: "Deep Dives", 
                desc: "Unpacking complex algorithms, hardware breakthroughs, and what they mean for you.",
                color: "text-neon-purple",
              },
              { 
                icon: Globe, 
                title: "Global Community", 
                desc: "Connect with like-minded futurists and builders from around the world.",
                color: "text-neon-green",
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group p-6 md:p-8 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className={`w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${feature.color} mb-5`}>
                  <feature.icon size={24} />
                </div>
                
                <h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative p-8 md:p-12 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-900/40 border border-white/10 text-center overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-neon-cyan/20 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-neon-cyan/20 border border-neon-cyan/30 flex items-center justify-center mx-auto mb-6">
                <Mic2 className="w-8 h-8 text-neon-cyan" />
              </div>
              
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
                Ready to Start Learning?
              </h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Join thousands of learners accessing premium content. Start with free episodes or subscribe for full access.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to="/browse" 
                  className="px-6 py-3 bg-neon-cyan text-slate-900 font-bold rounded-xl hover:bg-neon-cyan/90 transition-all"
                >
                  Browse Free Content
                </Link>
                <Link 
                  to="/pricing" 
                  className="px-6 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
                >
                  View Subscription Plans
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
