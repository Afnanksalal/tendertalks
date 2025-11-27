import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, ArrowRight, Zap, Globe, Cpu, Mic2, Sparkles, Headphones, Star } from 'lucide-react';
import { PodcastCard } from '../components/podcast/PodcastCard';
import { usePodcastStore } from '../stores/podcastStore';
import { StarField } from '../components/effects/StarField';
import { FloatingOrbs } from '../components/effects/FloatingOrbs';

export const HomePage: React.FC = () => {
  const { podcasts, fetchPodcasts, isLoading } = usePodcastStore();

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  return (
    <div className="min-h-screen bg-[#030014] overflow-x-hidden relative">
      {/* Global Background - spans entire page */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <StarField />
        <FloatingOrbs />
        {/* Subtle grid that fades */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:50px_50px] opacity-40" />
      </div>
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20 pt-28">
        {/* Hero-specific glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Radial glow at center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-neon-cyan/5 via-transparent to-transparent rounded-full" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Badge with glow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan text-xs font-bold tracking-wider uppercase mb-8 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
          >
            <Sparkles className="w-3 h-3" />
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
            Come talk with Afnan & Jenna
          </motion.div>

          {/* Main Heading with enhanced styling */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[1.1] tracking-tight"
          >
            <span className="block text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
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
            <span className="text-neon-cyan font-medium">AI</span>,{' '}
            <span className="text-neon-cyan font-medium">Tech</span>, and{' '}
            <span className="text-whale-400 font-medium">Human Connection</span>.
          </motion.p>

          {/* CTA Buttons with enhanced effects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link 
              to="/browse"
              className="group w-full sm:w-auto px-8 py-4 bg-neon-cyan text-slate-900 rounded-full font-bold transition-all hover:shadow-[0_0_40px_rgba(0,240,255,0.5)] hover:scale-[1.02] flex items-center justify-center gap-2 relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative flex items-center gap-2">
                Start Listening
                <Play size={18} fill="currentColor" />
              </span>
            </Link>
            <Link 
              to="/pricing"
              className="group w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full font-bold hover:bg-white/10 hover:border-neon-purple/50 hover:shadow-[0_0_30px_rgba(112,0,255,0.2)] transition-all flex items-center justify-center gap-2"
            >
              View Plans
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-8 mt-16 pt-8 border-t border-white/5"
          >
            {[
              { value: '50+', label: 'Episodes', icon: Headphones },
              { value: '10K+', label: 'Listeners', icon: Globe },
              { value: '4.9', label: 'Rating', icon: Star },
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center gap-3 text-center">
                <stat.icon className="w-5 h-5 text-neon-cyan" />
                <div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}
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
              className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.8)]"
            />
          </div>
        </motion.div>
      </section>

      {/* Featured Podcasts */}
      <section className="py-16 md:py-24 px-4 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 text-neon-cyan text-sm font-bold tracking-wider uppercase mb-2"
              >
                <span className="w-8 h-[2px] bg-neon-cyan" />
                Latest Episodes
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-display font-bold text-white"
              >
                Fresh Content
              </motion.h2>
            </div>
            <Link 
              to="/browse" 
              className="group flex items-center gap-2 text-slate-400 hover:text-neon-cyan transition-colors font-medium"
            >
              View All Episodes 
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
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
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-center py-16 bg-slate-900/30 rounded-2xl border border-white/5 backdrop-blur-sm"
            >
              <div className="w-20 h-20 rounded-2xl bg-slate-800/50 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <Mic2 className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-slate-400 mb-2 text-lg">No podcasts available yet</p>
              <p className="text-slate-500 text-sm">Check back soon for new content!</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {podcasts.slice(0, 6).map((podcast, idx) => (
                <motion.div
                  key={podcast.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                >
                  <PodcastCard podcast={podcast} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 text-neon-purple text-sm font-bold tracking-wider uppercase mb-4">
              <span className="w-8 h-[2px] bg-neon-purple" />
              Features
              <span className="w-8 h-[2px] bg-neon-purple" />
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
              Why TenderTalks?
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-cyan mx-auto rounded-full" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                icon: Zap, 
                title: "Premium Content", 
                desc: "Access exclusive audio and video content from industry experts and thought leaders.",
                color: "neon-cyan",
                gradient: "from-neon-cyan/20 to-neon-cyan/5",
              },
              { 
                icon: Cpu, 
                title: "Deep Dives", 
                desc: "Unpacking complex algorithms, hardware breakthroughs, and what they mean for you.",
                color: "neon-purple",
                gradient: "from-neon-purple/20 to-neon-purple/5",
              },
              { 
                icon: Globe, 
                title: "Global Community", 
                desc: "Connect with like-minded futurists and builders from around the world.",
                color: "neon-green",
                gradient: "from-neon-green/20 to-neon-green/5",
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.5 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className={`group relative p-6 md:p-8 rounded-2xl bg-gradient-to-b ${feature.gradient} border border-white/5 hover:border-${feature.color}/30 transition-all duration-300 backdrop-blur-sm overflow-hidden`}
              >
                {/* Hover glow effect */}
                <div className={`absolute inset-0 bg-${feature.color}/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                {/* Icon with glow */}
                <motion.div 
                  className={`relative w-14 h-14 rounded-xl bg-${feature.color}/10 border border-${feature.color}/20 flex items-center justify-center text-${feature.color} mb-5`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <feature.icon size={24} />
                  <div className={`absolute inset-0 rounded-xl bg-${feature.color}/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                </motion.div>
                
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-neon-cyan transition-colors">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                
                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-${feature.color}/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 relative">
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative p-8 md:p-12 rounded-3xl bg-slate-900/60 border border-white/10 text-center overflow-hidden backdrop-blur-sm"
          >
            {/* Subtle glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-neon-cyan/10 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative z-10">
              <motion.div 
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30 border border-neon-cyan/30 flex items-center justify-center mx-auto mb-6"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Mic2 className="w-10 h-10 text-neon-cyan" />
              </motion.div>
              
              <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-4">
                Ready to Start Learning?
              </h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto text-lg">
                Join thousands of learners accessing premium content. Start with free episodes or subscribe for full access.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to="/browse" 
                  className="group relative px-8 py-4 bg-neon-cyan text-slate-900 font-bold rounded-xl hover:shadow-[0_0_40px_rgba(0,240,255,0.4)] transition-all overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative">Browse Free Content</span>
                </Link>
                <Link 
                  to="/pricing" 
                  className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 hover:border-neon-purple/30 hover:shadow-[0_0_30px_rgba(112,0,255,0.2)] transition-all"
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
