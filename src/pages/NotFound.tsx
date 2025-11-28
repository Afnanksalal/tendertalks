import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { SEO } from '../components/SEO';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center px-4">
      <SEO title="Page Not Found" noIndex />
      
      <div className="text-center max-w-md">
        {/* 404 Text */}
        <div className="relative mb-8">
          <span className="text-[120px] sm:text-[180px] font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-slate-700 to-slate-900 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl sm:text-5xl font-display font-bold text-white">
              Oops!
            </span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-3">
          Page Not Found
        </h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neon-cyan text-slate-900 font-bold rounded-xl hover:bg-neon-cyan/90 transition-colors touch-feedback"
          >
            <Home size={18} />
            Go Home
          </Link>
          <Link
            to="/browse"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-colors touch-feedback"
          >
            <Search size={18} />
            Browse Podcasts
          </Link>
        </div>

        <button
          onClick={() => window.history.back()}
          className="mt-6 inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Go back
        </button>
      </div>
    </div>
  );
};
