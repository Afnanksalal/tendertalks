import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Mic2, User, LogOut, Settings, LayoutDashboard, ChevronRight, ShoppingBag, Wrench } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { AuthModal } from '../auth/AuthModal';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuthStore();
  const { items: cartItems, openCart } = useCartStore();
  const { settings } = useSettingsStore();
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Build nav links based on feature toggles
  const navLinks = [
    { name: 'Browse', path: '/browse', enabled: true },
    { name: 'Blog', path: '/blog', enabled: settings.feature_blog },
    { name: 'Store', path: '/store', enabled: settings.feature_merch },
    { name: 'Pricing', path: '/pricing', enabled: settings.feature_subscriptions },
  ].filter(link => link.enabled);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      {/* Maintenance Mode Banner for Admins */}
      {settings.maintenance_mode && isAdmin && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-black text-center py-1.5 px-4 text-sm font-medium flex items-center justify-center gap-2">
          <Wrench size={14} />
          <span>Maintenance mode is active. Only admins can access the site.</span>
          <Link to="/admin/settings" className="underline hover:no-underline ml-1">Manage</Link>
        </div>
      )}
      
      <nav className={`fixed left-0 right-0 z-50 transition-all duration-300 ${settings.maintenance_mode && isAdmin ? 'top-8' : 'top-0'} ${scrolled ? 'py-2' : 'py-3'}`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className={`
            relative px-4 md:px-6 py-3 rounded-2xl flex items-center justify-between gap-4
            transition-all duration-300
            ${scrolled 
              ? 'bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-lg' 
              : 'bg-slate-900/50 backdrop-blur-md border border-white/5'}
          `}>
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-gradient-to-tr from-slate-800 to-slate-900 border border-white/10 p-1.5 rounded-lg group-hover:border-neon-cyan/50 transition-colors">
                <Mic2 className="h-5 w-5 text-neon-cyan" />
              </div>
              <span className="font-display font-bold text-lg text-white group-hover:text-neon-cyan transition-colors">
                Tender<span className="text-whale-400">Talks</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center bg-slate-950/50 rounded-full px-1.5 py-1 border border-white/5">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-whale-600/30 rounded-full border border-whale-500/30"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <span className="relative z-10">{link.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Cart - only show if merch is enabled */}
              {settings.feature_merch && (
                <button
                  onClick={openCart}
                  className="relative p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  aria-label="Shopping cart"
                >
                  <ShoppingBag size={20} />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-neon-cyan text-black text-xs font-bold rounded-full flex items-center justify-center">
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </span>
                  )}
                </button>
              )}
              
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center border border-neon-cyan/30">
                        <User size={16} className="text-neon-cyan" />
                      </div>
                    )}
                    <span className="text-sm text-white font-medium max-w-[100px] truncate">
                      {user.name || 'User'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden"
                      >
                        {isAdmin && (
                          <Link
                            to="/admin"
                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            <LayoutDashboard size={16} />
                            Admin Dashboard
                          </Link>
                        )}
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          <User size={16} />
                          My Dashboard
                        </Link>
                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          <Settings size={16} />
                          Settings
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-sm font-bold hover:bg-neon-cyan/20 transition-all"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="lg:hidden flex items-center gap-1">
              {settings.feature_merch && (
                <button
                  onClick={openCart}
                  className="relative p-2 text-slate-400 hover:text-white transition-colors"
                  aria-label="Shopping cart"
                >
                  <ShoppingBag size={22} />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-neon-cyan text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-300 hover:text-white transition-colors"
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-slate-900 border-r border-white/10 z-[70] lg:hidden flex flex-col"
            >
              {/* Mobile Header */}
              <div className="flex justify-between items-center p-5 border-b border-white/5">
                <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
                  <div className="bg-gradient-to-tr from-slate-800 to-slate-900 border border-white/10 p-1.5 rounded-lg">
                    <Mic2 className="h-4 w-4 text-neon-cyan" />
                  </div>
                  <span className="font-display font-bold text-lg text-white">
                    Tender<span className="text-whale-400">Talks</span>
                  </span>
                </Link>
                <button onClick={() => setIsOpen(false)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                  <X size={22} />
                </button>
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col space-y-1">
                  {navLinks.map((link) => {
                    const isActive = location.pathname === link.path;
                    return (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                          isActive 
                            ? 'bg-whale-600/20 text-white border border-whale-500/30' 
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="font-medium">{link.name}</span>
                        <ChevronRight size={16} className={isActive ? 'text-neon-cyan' : 'text-slate-600'} />
                      </Link>
                    );
                  })}
                  
                  {user && (
                    <>
                      <div className="h-px bg-white/5 my-3" />
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between p-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all"
                        >
                          <span className="font-medium">Admin Dashboard</span>
                          <LayoutDashboard size={16} className="text-slate-600" />
                        </Link>
                      )}
                      <Link
                        to="/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between p-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all"
                      >
                        <span className="font-medium">My Dashboard</span>
                        <User size={16} className="text-slate-600" />
                      </Link>
                    </>
                  )}
                </div>
              </nav>

              {/* Mobile Footer */}
              <div className="p-5 border-t border-white/5">
                {user ? (
                  <button
                    onClick={() => { handleSignOut(); setIsOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-xl font-medium"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => { setShowAuthModal(true); setIsOpen(false); }}
                    className="w-full py-3 bg-neon-cyan text-black font-bold rounded-xl"
                  >
                    Get Started
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};
