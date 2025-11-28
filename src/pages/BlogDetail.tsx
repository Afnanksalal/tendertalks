import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Calendar, User, Share2, Tag, Loader2, FileText, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkEmoji from 'remark-emoji';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
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
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neon-cyan/10 rounded-full blur-[100px]" />
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
            <div className="flex flex-wrap gap-2">
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
          className="blog-content prose prose-lg prose-invert max-w-none"
        >
          {blog.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkEmoji]}
              rehypePlugins={[rehypeRaw, rehypeSlug]}
              components={{
                // Images with lazy loading and styling
                img: ({ node, src, alt, ...props }) => (
                  <figure className="my-8">
                    <img 
                      src={src} 
                      alt={alt || ''} 
                      loading="lazy" 
                      className="rounded-xl shadow-lg max-w-full mx-auto" 
                      {...props}
                    />
                    {alt && <figcaption className="text-center text-sm text-slate-500 mt-3">{alt}</figcaption>}
                  </figure>
                ),
                // External links open in new tab
                a: ({ node, href, children, ...props }) => {
                  const isExternal = href?.startsWith('http');
                  const isAnchor = href?.startsWith('#');
                  return (
                    <a 
                      href={href} 
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      className={isAnchor ? 'anchor-link' : ''}
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
                // Tables with GitHub-style
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-8 rounded-xl border border-white/10">
                    <table className="w-full" {...props} />
                  </div>
                ),
                thead: ({ node, ...props }) => (
                  <thead className="bg-slate-800/80" {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-white/10" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="px-4 py-3 text-sm text-slate-300 border-b border-white/5" {...props} />
                ),
                tr: ({ node, ...props }) => (
                  <tr className="hover:bg-white/5 transition-colors" {...props} />
                ),
                // Code blocks with syntax highlighting placeholder
                pre: ({ node, children, ...props }) => (
                  <pre className="bg-slate-800/80 border border-white/5 rounded-xl p-4 overflow-x-auto my-6" {...props}>
                    {children}
                  </pre>
                ),
                code: ({ node, inline, className, children, ...props }: any) => {
                  if (inline) {
                    return (
                      <code className="text-neon-cyan bg-slate-800/80 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="block text-slate-300 text-sm font-mono leading-relaxed" {...props}>
                      {children}
                    </code>
                  );
                },
                // Blockquotes with callout style
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-neon-cyan/50 bg-neon-cyan/5 pl-4 pr-4 py-3 my-6 rounded-r-lg italic text-slate-400" {...props} />
                ),
                // Task lists (checkboxes)
                input: ({ node, type, checked, ...props }: any) => {
                  if (type === 'checkbox') {
                    return (
                      <span className="inline-flex items-center justify-center w-5 h-5 mr-2 rounded border border-white/20 bg-slate-800/50">
                        {checked ? (
                          <Check size={14} className="text-neon-green" />
                        ) : (
                          <span className="w-3 h-3" />
                        )}
                      </span>
                    );
                  }
                  return <input type={type} {...props} />;
                },
                // List items
                li: ({ node, children, ...props }: any) => {
                  // Check if this is a task list item
                  const hasCheckbox = Array.isArray(children) && 
                    children.some((child: any) => 
                      child?.props?.type === 'checkbox' || 
                      (typeof child === 'object' && child?.type === 'input')
                    );
                  return (
                    <li className={hasCheckbox ? 'list-none flex items-start gap-1' : ''} {...props}>
                      {children}
                    </li>
                  );
                },
                // Headings with anchor links
                h1: ({ node, children, id, ...props }) => (
                  <h1 id={id} className="group text-3xl font-display font-bold text-white mt-12 mb-6 scroll-mt-24" {...props}>
                    {children}
                    {id && <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-50 text-neon-cyan">#</a>}
                  </h1>
                ),
                h2: ({ node, children, id, ...props }) => (
                  <h2 id={id} className="group text-2xl font-display font-bold text-white mt-10 mb-5 scroll-mt-24" {...props}>
                    {children}
                    {id && <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-50 text-neon-cyan">#</a>}
                  </h2>
                ),
                h3: ({ node, children, id, ...props }) => (
                  <h3 id={id} className="group text-xl font-display font-bold text-white mt-8 mb-4 scroll-mt-24" {...props}>
                    {children}
                    {id && <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-50 text-neon-cyan">#</a>}
                  </h3>
                ),
                h4: ({ node, children, id, ...props }) => (
                  <h4 id={id} className="group text-lg font-display font-bold text-white mt-6 mb-3 scroll-mt-24" {...props}>
                    {children}
                    {id && <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-50 text-neon-cyan">#</a>}
                  </h4>
                ),
                // Paragraphs
                p: ({ node, ...props }) => (
                  <p className="text-slate-300 leading-relaxed mb-6" {...props} />
                ),
                // Horizontal rule
                hr: ({ node, ...props }) => (
                  <hr className="border-white/10 my-10" {...props} />
                ),
                // Strong/bold
                strong: ({ node, ...props }) => (
                  <strong className="text-white font-bold" {...props} />
                ),
                // Emphasis/italic
                em: ({ node, ...props }) => (
                  <em className="text-slate-300 italic" {...props} />
                ),
                // Unordered list
                ul: ({ node, ...props }) => (
                  <ul className="text-slate-300 my-4 pl-6 space-y-2 list-disc marker:text-neon-cyan" {...props} />
                ),
                // Ordered list
                ol: ({ node, ...props }) => (
                  <ol className="text-slate-300 my-4 pl-6 space-y-2 list-decimal marker:text-neon-cyan" {...props} />
                ),
                // Delete/strikethrough
                del: ({ node, ...props }) => (
                  <del className="text-slate-500 line-through" {...props} />
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              leftIcon={<Share2 size={16} />}
              className={shareText === 'Copied!' ? 'text-neon-green border-neon-green/30' : ''}
            >
              {shareText === 'Copied!' ? 'Copied!' : 'Share Article'}
            </Button>
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
