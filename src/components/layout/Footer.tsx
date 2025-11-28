import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Instagram, Linkedin, Youtube, Send, Loader2, Check, Mic2, Mail, Rss, MapPin } from 'lucide-react';

// TikTok icon (not in lucide)
const TikTokIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    
    setStatus('loading');
    
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
    
    setTimeout(() => setStatus('idle'), 3000);
  };

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com/tendertalks_', label: 'Twitter / X' },
    { icon: Instagram, href: 'https://instagram.com/tendertalks.live', label: 'Instagram' },
    { icon: Youtube, href: 'https://youtube.com/@tendertalks.live', label: 'YouTube' },
    { icon: TikTokIcon, href: 'https://tiktok.com/@tendertalks.live', label: 'TikTok' },
    { icon: Linkedin, href: 'https://linkedin.com/company/tendertalks', label: 'LinkedIn' },
  ];

  return (
    <footer className="bg-[#030014] border-t border-white/5 pt-12 md:pt-16 pb-6 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10">
          
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
              <div className="bg-gradient-to-tr from-slate-800 to-slate-900 border border-white/10 p-1.5 rounded-lg group-hover:border-neon-cyan/50 transition-colors">
                <Mic2 className="h-4 w-4 text-neon-cyan" />
              </div>
              <span className="font-display font-bold text-xl text-white">
                Tender<span className="text-whale-400">Talks</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Exploring AI, Tech, and Human Connection. Future, unfiltered.
            </p>
            {/* Social Links */}
            <div className="flex flex-wrap gap-2">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a 
                  key={label}
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white hover:bg-whale-600 border border-white/5 hover:border-whale-500 transition-all touch-feedback"
                  aria-label={label}
                  title={label}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-4 text-xs">Platform</h4>
            <ul className="space-y-2.5">
              {[
                { name: 'Browse', path: '/browse' },
                { name: 'Store', path: '/store' },
                { name: 'Pricing', path: '/pricing' },
                { name: 'Dashboard', path: '/dashboard' },
              ].map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-slate-400 hover:text-neon-cyan transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-4 text-xs">Resources</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-neon-cyan transition-colors text-sm flex items-center gap-1.5">
                  <MapPin size={12} /> Sitemap
                </a>
              </li>
              <li>
                <a href="/api/rss" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-neon-cyan transition-colors text-sm flex items-center gap-1.5">
                  <Rss size={12} /> RSS Feed
                </a>
              </li>
              <li>
                <a href="mailto:sales@tendertalks.live" className="text-slate-400 hover:text-neon-cyan transition-colors text-sm flex items-center gap-1.5">
                  <Mail size={12} /> Collaborations
                </a>
              </li>
              <li>
                <a href="mailto:support@tendertalks.live" className="text-slate-400 hover:text-neon-cyan transition-colors text-sm flex items-center gap-1.5">
                  <Mail size={12} /> Support
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider mb-4 text-xs">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { name: 'Terms of Service', path: '/terms' },
                { name: 'Privacy Policy', path: '/privacy' },
                { name: 'Refund Policy', path: '/refund-policy' },
              ].map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-slate-400 hover:text-neon-cyan transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-white font-bold uppercase tracking-wider mb-4 text-xs">Stay Updated</h4>
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full bg-slate-900/80 border border-white/10 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30 transition-all text-sm disabled:opacity-50 placeholder:text-slate-500"
                />
                <button 
                  type="submit"
                  disabled={status === 'loading' || status === 'success' || !email}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-whale-500 hover:text-neon-cyan transition-colors disabled:opacity-50 p-1"
                >
                  {status === 'loading' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : status === 'success' ? (
                    <Check size={18} className="text-neon-green" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {status === 'success' ? 'Thanks for subscribing!' : 'No spam, just tech.'}
              </p>
            </form>

            {/* Contact Emails */}
            <div className="mt-4 space-y-1.5">
              <a href="mailto:sales@tendertalks.live" className="text-xs text-slate-500 hover:text-neon-cyan transition-colors block">
                sales@tendertalks.live
              </a>
              <a href="mailto:support@tendertalks.live" className="text-xs text-slate-500 hover:text-neon-cyan transition-colors block">
                support@tendertalks.live
              </a>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="mt-10 md:mt-12 pt-6 md:pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-500 text-xs md:text-sm">
          <p>&copy; {new Date().getFullYear()} TenderTalks. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="/sitemap.xml" className="hover:text-neon-cyan transition-colors">Sitemap</a>
            <a href="/api/rss" className="hover:text-neon-cyan transition-colors flex items-center gap-1">
              <Rss size={12} /> RSS
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
