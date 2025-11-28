import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar, User, FileText, Star, ArrowRight } from 'lucide-react';
import type { Blog, Tag } from '../../db/schema';

interface BlogWithMeta extends Blog {
  creator?: { id: string; name: string | null; avatarUrl: string | null };
  tags?: Tag[];
}

interface BlogCardProps {
  blog: BlogWithMeta;
  featured?: boolean;
}

export const BlogCard: React.FC<BlogCardProps> = ({
  blog,
  featured = false,
}) => {
  return (
    <div className="group relative bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-xl md:rounded-2xl overflow-hidden hover:border-neon-cyan/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,240,255,0.1)] md:hover:-translate-y-1 card-hover h-full flex flex-col">
      {/* Thumbnail */}
      <Link to={`/blog/${blog.slug}`} className="block relative aspect-[16/10] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
        {blog.bannerUrl ? (
          <img
            src={blog.bannerUrl}
            alt={blog.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neon-cyan/10">
            <FileText className="w-12 h-12 text-neon-cyan/40" />
          </div>
        )}

        {/* Read More Overlay */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-[2px]">
          <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-neon-cyan hover:border-neon-cyan hover:text-black hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)]">
            <ArrowRight size={24} />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 z-20 flex gap-2">
          <span className="px-2 py-1 bg-neon-cyan/90 backdrop-blur text-black text-[10px] font-bold rounded flex items-center gap-1">
            <FileText size={10} /> ARTICLE
          </span>
          {featured && (
            <span className="px-2 py-1 bg-amber-500/90 backdrop-blur text-white text-[10px] font-bold rounded flex items-center gap-1">
              <Star size={10} fill="currentColor" /> Featured
            </span>
          )}
        </div>

        {/* Read Time Badge */}
        {blog.readTime && (
          <div className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-white flex items-center gap-1">
            <Clock size={10} /> {blog.readTime} min
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 md:p-5 flex-1 flex flex-col">
        {/* Author */}
        {blog.creator && (
          <span className="text-xs font-medium text-neon-cyan mb-2 block flex items-center gap-1">
            <User size={12} />
            {blog.creator.name || 'Author'}
          </span>
        )}

        {/* Title */}
        <Link to={`/blog/${blog.slug}`}>
          <h3 className="text-base md:text-lg font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-neon-cyan transition-colors">
            {blog.title}
          </h3>
        </Link>

        {/* Excerpt */}
        {blog.excerpt && (
          <p className="text-slate-400 text-sm line-clamp-2 mb-4 font-light leading-relaxed flex-1">
            {blog.excerpt}
          </p>
        )}

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {blog.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="px-2 py-0.5 bg-white/5 rounded text-xs text-slate-500">
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
          <span className="text-sm font-bold text-neon-cyan flex items-center gap-1">
            <Clock size={14} />
            {blog.readTime ? `${blog.readTime} min read` : 'Quick read'}
          </span>

          {blog.publishedAt && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar size={12} />
              {new Date(blog.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          )}
        </div>
      </div>

      {/* Mobile Read Button */}
      <Link 
        to={`/blog/${blog.slug}`}
        className="md:hidden absolute bottom-4 right-4 w-10 h-10 rounded-full bg-neon-cyan text-black flex items-center justify-center shadow-lg shadow-neon-cyan/30 touch-feedback z-30"
        aria-label={`Read ${blog.title}`}
      >
        <ArrowRight size={18} />
      </Link>
    </div>
  );
};
