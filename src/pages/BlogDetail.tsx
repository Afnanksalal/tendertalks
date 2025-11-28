import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Calendar, User, Share2, Tag, Loader2, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { useBlogStore } from '../stores/blogStore';
import { Button } from '../components/ui/Button';
import { SEO } from '../components/SEO';
import toast from 'react-hot-toast';

export const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentBlog, fetchBlogBySlug, isLoading } = useBlogStore();
  const [shareText, setShareText] = useState('Share');

  useEffect(() => {
    if (slug) {
      fetchBlogBySlug(slug);
    }
  }, [slug, fetchBlogBySlug]);

  const handleShare = async () => {
    const url = `${window.location.origin}/blog/${currentBlog?.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentBlog?.title,
          text: currentBlog?.excerpt || '',
          url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(url);
        }
      }
    } else {
      await copyToClipboard(url);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareText('Copied!');
      toast.success('Link copied!');
      setTimeout(() => setShareText('Share'), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  if (!currentBlog) {
    return (
      <div className="min-h-screen bg-[#030014] pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <FileText size={64} className="mx-auto text-slate-600 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Blog not found</h1>
          <p className="text-slate-400 mb-6">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const blog = currentBlog;

  return (
    <div className="min-h-screen bg-[#030014] pt-24 sm:pt-28 md:pt-32 pb-20">
      <SEO
        title={blog.title}
        description={blog.excerpt || blog.title}
        image={blog.bannerUrl || `/api/og-image?title=${encodeURIComponent(blog.title)}`}
        url={`/blog/${blog.slug}`}
        type="article"
        publishedTime={blog.publishedAt ? new Date(blog.publishedAt).toISOString() : undefined}
        keywords={blog.tags?.map((t: any) => t.name).join(', ')}
      />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[100px]" />
      </div>

      <article className="max-w-4xl mx-auto px-4 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors touch-feedback"
        >
          <ArrowLeft size={20} /> Back
        </button>

        {/* Banner */}
        {blog.bannerUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="aspect-[2/1] rounded-2xl overflow-hidden mb-8"
          >
            <img src={blog.bannerUrl} alt={blog.title} className="w-full h-full object-cover" />
          </motion.div>
        )}

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white mb-6 leading-tight">
            {blog.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-6">
            {blog.creator && (
              <div className="flex items-center gap-2">
                {blog.creator.avatarUrl ? (
                  <img
                    src={blog.creator.avatarUrl}
                    alt={blog.creator.name || ''}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                    <User size={14} className="text-neon-cyan" />
                  </div>
                )}
                <span className="text-white font-medium">{blog.creator.name || 'Author'}</span>
              </div>
            )}
            {blog.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(blog.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
            {blog.readTime && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {blog.readTime} min read
              </span>
            )}
          </div>

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {blog.tags.map((tag: any) => (
                <Link
                  key={tag.id}
                  to={`/blog?tag=${tag.id}`}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm text-slate-400 hover:text-neon-cyan hover:border-neon-cyan/30 transition-colors flex items-center gap-1"
                >
                  <Tag size={12} />
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Share */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            leftIcon={<Share2 size={16} />}
            className={shareText === 'Copied!' ? 'text-neon-green border-neon-green/30' : ''}
          >
            {shareText}
          </Button>
        </motion.header>

        {/* Excerpt */}
        {blog.excerpt && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-400 leading-relaxed mb-10 pb-10 border-b border-white/10"
          >
            {blog.excerpt}
          </motion.p>
        )}

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="prose prose-lg prose-invert max-w-none
            prose-headings:font-display prose-headings:font-bold prose-headings:text-white
            prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
            prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-6
            prose-a:text-neon-cyan prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white prose-strong:font-bold
            prose-em:text-slate-300 prose-em:italic
            prose-code:text-neon-cyan prose-code:bg-slate-800/80 prose-code:px-2 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-slate-800/80 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-xl
            prose-blockquote:border-l-4 prose-blockquote:border-neon-cyan/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-400
            prose-ul:text-slate-300 prose-ol:text-slate-300
            prose-li:marker:text-neon-cyan
            prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
            prose-hr:border-white/10"
        >
          {blog.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
              components={{
                img: ({ node, ...props }) => (
                  <img {...props} loading="lazy" className="rounded-xl shadow-lg my-8 max-w-full" />
                ),
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {blog.content}
            </ReactMarkdown>
          ) : (
            <p className="text-slate-500 italic">No content available.</p>
          )}
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 pt-8 border-t border-white/10"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                leftIcon={<Share2 size={16} />}
              >
                Share Article
              </Button>
            </div>
            <Link to="/blog">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />}>
                More Articles
              </Button>
            </Link>
          </div>
        </motion.footer>
      </article>
    </div>
  );
};
