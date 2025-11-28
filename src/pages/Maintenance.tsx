import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Clock, Mail, Twitter, Instagram } from 'lucide-react';
import { SEO } from '../components/SEO';

export const MaintenancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center px-4 relative overflow-hidden">
      <SEO 
        title="Under Maintenance" 
        description="TenderTalks is currently undergoing scheduled maintenance. We'll be back shortly."
        noIndex 
      />
      
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-neon-purple/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 text-center max-w-lg">
        {/* Animated Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="relative inline-flex">
            <div className="w-24 h-24 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Wrench size={40} className="text-amber-400" />
              </motion.div>
            </div>
            {/* Pulsing ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-amber-500/30"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white mb-4"
        >
          We'll Be Right Back
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-slate-400 text-base sm:text-lg mb-8 leading-relaxed"
        >
          TenderTalks is currently undergoing scheduled maintenance to improve your experience. 
          We apologize for any inconvenience.
        </motion.p>

        {/* Status Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center justify-center gap-2 text-amber-400 mb-3">
            <Clock size={18} />
            <span className="font-medium">Maintenance in Progress</span>
          </div>
          <p className="text-slate-500 text-sm">
            Our team is working hard to bring you new features and improvements. 
            Please check back soon.
          </p>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <p className="text-slate-500 text-sm">
            Need urgent assistance?
          </p>
          <a 
            href="mailto:support@tendertalks.live"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors"
          >
            <Mail size={16} />
            support@tendertalks.live
          </a>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <a 
              href="https://twitter.com/tendertalks_" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2.5 bg-slate-900 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:border-white/20 transition-colors"
            >
              <Twitter size={18} />
            </a>
            <a 
              href="https://instagram.com/tendertalks.live" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2.5 bg-slate-900 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:border-white/20 transition-colors"
            >
              <Instagram size={18} />
            </a>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-slate-600 text-xs"
        >
          &copy; {new Date().getFullYear()} TenderTalks. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
};
