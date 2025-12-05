import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Calendar,
  User,
  Share2,
  Tag,
  Loader2,
  FileText,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronUp,
  BookOpen,
} from 'lucide-react';
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showToc, setShowToc] = useState(true);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string>('');

  useEffect(() => {
    if (slug) fetchBlogBySlug(slug);
    window.scrollTo(0, 0);
  }, [slug, fetchBlogBySlug]);

  // Reading progress and scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
      setShowScrollTop(scrollTop > 500);

      // Track active heading for TOC
      const headings = document.querySelectorAll('h1[id], h2[id], h3[id]');
      let current = '';
      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 100) current = heading.id;
      });
      if (current) setActiveHeading(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const tableOfContents = useMemo(() => {
    if (!currentBlog?.content) return [];
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const toc: { level: number; text: string; id: string }[] = [];
    let match: RegExpExecArray | null;
    while ((match = headingRegex.exec(currentBlog.content)) !== null) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`[\]]/g, '').trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w]+/g, '-')
        .replace(/^-|-$/g, '');
      toc.push({ level, text, id });
    }
    return toc;
  }, [currentBlog?.content]);

  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Code copied!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const handleShare = async () => {
    const url = `${window.location.origin}/blog/${currentBlog?.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: currentBlog?.title, text: currentBlog?.excerpt || '', url });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') await copyToClipboard(url);
      }
    } else {
      await copyToClipboard(url);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareText('Copied!');
      toast.success('Link copied to clipboard!');
      setTimeout(() => setShareText('Share'), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-neon-cyan animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!currentBlog) {
    return (
      <div className="min-h-screen bg-[#030014] pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <FileText size={64} className="mx-auto text-slate-600 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Article Not Found</h1>
          <p className="text-slate-400 mb-6">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/blog">
            <Button>Browse All Articles</Button>
          </Link>
        </div>
      </div>
    );
  }

  const blog = currentBlog;

  return (
    <div className="min-h-screen bg-[#030014]">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-800/50">
        <motion.div
          className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple"
          style={{ width: `${readingProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

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
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-neon-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-neon-purple/5 rounded-full blur-[100px]" />
      </div>

      <div className="pt-24 sm:pt-28 md:pt-32 pb-20">
        <article className="max-w-4xl mx-auto px-4 relative z-10">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </motion.button>

          {/* Banner */}
          {blog.bannerUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="aspect-[2/1] rounded-2xl overflow-hidden mb-8 shadow-2xl"
            >
              <img
                src={blog.bannerUrl}
                alt={blog.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
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

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-6">
              {blog.creator && (
                <div className="flex items-center gap-2">
                  {blog.creator.avatarUrl ? (
                    <img
                      src={blog.creator.avatarUrl}
                      alt={blog.creator.name || ''}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-white/10"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center ring-2 ring-white/10">
                      <User size={16} className="text-neon-cyan" />
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
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-slate-400 hover:text-neon-cyan hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all flex items-center gap-1.5"
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
              className="text-lg sm:text-xl text-slate-400 leading-relaxed mb-10 pb-10 border-b border-white/10 italic"
            >
              {blog.excerpt}
            </motion.p>
          )}

          {/* Table of Contents */}
          {tableOfContents.length > 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-10 bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setShowToc(!showToc)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-neon-cyan" />
                  <span className="font-bold text-white">Table of Contents</span>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                    {tableOfContents.length} sections
                  </span>
                </div>
                <ChevronRight
                  size={18}
                  className={`text-slate-400 transition-transform duration-200 ${showToc ? 'rotate-90' : ''}`}
                />
              </button>
              <AnimatePresence>
                {showToc && (
                  <motion.nav
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pb-4 space-y-1 overflow-hidden"
                  >
                    {tableOfContents.map((item, idx) => (
                      <a
                        key={idx}
                        href={`#${item.id}`}
                        onClick={() => setShowToc(false)}
                        className={`block py-1.5 text-sm transition-all rounded-lg px-3 ${
                          item.level === 2 ? 'pl-6' : item.level === 3 ? 'pl-9' : ''
                        } ${
                          activeHeading === item.id
                            ? 'text-neon-cyan bg-neon-cyan/10'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {item.text}
                      </a>
                    ))}
                  </motion.nav>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="blog-content prose prose-sm sm:prose-base lg:prose-lg prose-invert max-w-none"
          >
            {blog.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkEmoji]}
                rehypePlugins={[rehypeRaw, rehypeSlug]}
                components={{
                  img: ({ src, alt, ...props }) => (
                    <figure className="my-8">
                      <img
                        src={src}
                        alt={alt || ''}
                        loading="lazy"
                        className="rounded-xl shadow-xl max-w-full mx-auto"
                        {...props}
                      />
                      {alt && alt !== 'image' && (
                        <figcaption className="text-center text-sm text-slate-500 mt-3 italic">
                          {alt}
                        </figcaption>
                      )}
                    </figure>
                  ),
                  a: ({ href, children, ...props }) => {
                    const isExternal = href?.startsWith('http');
                    const isAnchor = href?.startsWith('#');
                    return (
                      <a
                        href={href}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className={`${isAnchor ? 'text-neon-cyan/80 hover:text-neon-cyan' : 'text-neon-cyan hover:underline decoration-neon-cyan/50'} transition-colors ${isExternal ? 'inline-flex items-center gap-1' : ''}`}
                        {...props}
                      >
                        {children}
                        {isExternal && (
                          <ExternalLink size={12} className="inline flex-shrink-0 opacity-70" />
                        )}
                      </a>
                    );
                  },
                  table: ({ children, ...props }) => (
                    <div className="overflow-x-auto my-8 rounded-xl border border-white/10 shadow-lg -mx-4 sm:mx-0">
                      <table className="w-full min-w-[400px]" {...props}>
                        {children}
                      </table>
                    </div>
                  ),
                  thead: (props) => <thead className="bg-slate-800/80" {...props} />,
                  th: (props) => (
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-white/10"
                      {...props}
                    />
                  ),
                  td: (props) => (
                    <td
                      className="px-4 py-3 text-sm text-slate-300 border-b border-white/5"
                      {...props}
                    />
                  ),
                  tr: (props) => <tr className="hover:bg-white/5 transition-colors" {...props} />,
                  pre: ({ children, ...props }) => {
                    const codeContent = String((children as any)?.props?.children || '').trim();
                    const language =
                      (children as any)?.props?.className?.replace('language-', '') || '';
                    return (
                      <div className="relative group my-8 -mx-4 sm:mx-0">
                        {language && (
                          <div className="absolute top-0 left-0 px-3 py-1 bg-slate-700/80 text-xs text-slate-400 rounded-tl-xl rounded-br-lg font-mono">
                            {language}
                          </div>
                        )}
                        <pre
                          className="bg-slate-800/80 border border-white/5 rounded-none sm:rounded-xl p-4 pt-8 overflow-x-auto text-sm"
                          {...props}
                        >
                          {children}
                        </pre>
                        <button
                          onClick={() => copyCode(codeContent)}
                          title="Copy code"
                          className="absolute top-2 right-2 p-2 bg-slate-700/80 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          {copiedCode === codeContent ? (
                            <Check size={14} className="text-neon-green" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    );
                  },
                  code: ({ inline, className, children, ...props }: any) => {
                    if (inline) {
                      return (
                        <code
                          className="text-neon-cyan bg-slate-800/80 px-1.5 py-0.5 rounded text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code
                        className={`block text-slate-300 text-sm font-mono leading-relaxed ${className || ''}`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  blockquote: ({ children, ...props }) => {
                    // Check for GitHub-style alerts
                    const text = String(children);
                    const isNote = text.includes('[!NOTE]');
                    const isTip = text.includes('[!TIP]');
                    const isImportant = text.includes('[!IMPORTANT]');
                    const isWarning = text.includes('[!WARNING]');
                    const isCaution = text.includes('[!CAUTION]');

                    let borderColor = 'border-neon-cyan/50';
                    let bgColor = 'bg-neon-cyan/5';

                    if (isNote) {
                      borderColor = 'border-blue-400/50';
                      bgColor = 'bg-blue-400/5';
                    } else if (isTip) {
                      borderColor = 'border-green-400/50';
                      bgColor = 'bg-green-400/5';
                    } else if (isImportant) {
                      borderColor = 'border-purple-400/50';
                      bgColor = 'bg-purple-400/5';
                    } else if (isWarning) {
                      borderColor = 'border-amber-400/50';
                      bgColor = 'bg-amber-400/5';
                    } else if (isCaution) {
                      borderColor = 'border-red-400/50';
                      bgColor = 'bg-red-400/5';
                    }

                    return (
                      <blockquote
                        className={`border-l-4 ${borderColor} ${bgColor} pl-4 pr-4 py-3 my-6 rounded-r-xl text-slate-400`}
                        {...props}
                      >
                        {children}
                      </blockquote>
                    );
                  },
                  input: ({ type, checked, ...props }: any) => {
                    if (type === 'checkbox') {
                      return (
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 mr-2 rounded border flex-shrink-0 ${checked ? 'bg-neon-green/20 border-neon-green/50' : 'border-white/20 bg-slate-800/50'}`}
                        >
                          {checked && <Check size={12} className="text-neon-green" />}
                        </span>
                      );
                    }
                    return <input type={type} {...props} />;
                  },
                  li: ({ children, ...props }: any) => {
                    const hasCheckbox =
                      Array.isArray(children) &&
                      children.some((child: any) => child?.props?.type === 'checkbox');
                    return (
                      <li
                        className={hasCheckbox ? 'list-none flex items-start gap-1' : ''}
                        {...props}
                      >
                        {children}
                      </li>
                    );
                  },
                  h1: ({ children, id, ...props }) => (
                    <h1
                      id={id}
                      className="group text-2xl sm:text-3xl font-display font-bold text-white mt-12 mb-6 scroll-mt-24 flex items-center gap-2"
                      {...props}
                    >
                      {children}
                      {id && (
                        <a
                          href={`#${id}`}
                          className="opacity-0 group-hover:opacity-50 text-neon-cyan transition-opacity"
                        >
                          #
                        </a>
                      )}
                    </h1>
                  ),
                  h2: ({ children, id, ...props }) => (
                    <h2
                      id={id}
                      className="group text-xl sm:text-2xl font-display font-bold text-white mt-10 mb-5 scroll-mt-24 flex items-center gap-2"
                      {...props}
                    >
                      {children}
                      {id && (
                        <a
                          href={`#${id}`}
                          className="opacity-0 group-hover:opacity-50 text-neon-cyan transition-opacity"
                        >
                          #
                        </a>
                      )}
                    </h2>
                  ),
                  h3: ({ children, id, ...props }) => (
                    <h3
                      id={id}
                      className="group text-lg sm:text-xl font-display font-bold text-white mt-8 mb-4 scroll-mt-24 flex items-center gap-2"
                      {...props}
                    >
                      {children}
                      {id && (
                        <a
                          href={`#${id}`}
                          className="opacity-0 group-hover:opacity-50 text-neon-cyan transition-opacity"
                        >
                          #
                        </a>
                      )}
                    </h3>
                  ),
                  h4: ({ children, id, ...props }) => (
                    <h4
                      id={id}
                      className="group text-base sm:text-lg font-display font-bold text-white mt-6 mb-3 scroll-mt-24 flex items-center gap-2"
                      {...props}
                    >
                      {children}
                      {id && (
                        <a
                          href={`#${id}`}
                          className="opacity-0 group-hover:opacity-50 text-neon-cyan transition-opacity"
                        >
                          #
                        </a>
                      )}
                    </h4>
                  ),
                  p: (props) => <p className="text-slate-300 leading-relaxed mb-6" {...props} />,
                  hr: (props) => <hr className="border-white/10 my-10" {...props} />,
                  strong: (props) => <strong className="text-white font-semibold" {...props} />,
                  em: (props) => <em className="text-slate-300 italic" {...props} />,
                  ul: (props) => (
                    <ul
                      className="text-slate-300 my-5 pl-6 space-y-2 list-disc marker:text-neon-cyan"
                      {...props}
                    />
                  ),
                  ol: (props) => (
                    <ol
                      className="text-slate-300 my-5 pl-6 space-y-2 list-decimal marker:text-neon-cyan"
                      {...props}
                    />
                  ),
                  del: (props) => <del className="text-slate-500 line-through" {...props} />,
                }}
              >
                {blog.content}
              </ReactMarkdown>
            ) : (
              <p className="text-slate-500 italic text-center py-10">No content available.</p>
            )}
          </motion.div>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16 pt-8 border-t border-white/10"
          >
            {/* Author Card */}
            {blog.creator && (
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 mb-8">
                <div className="flex items-start gap-4">
                  {blog.creator.avatarUrl ? (
                    <img
                      src={blog.creator.avatarUrl}
                      alt={blog.creator.name || ''}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-white/10"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center ring-2 ring-white/10">
                      <User size={24} className="text-neon-cyan" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Written by
                    </p>
                    <h4 className="text-lg font-bold text-white mb-1">
                      {blog.creator.name || 'Author'}
                    </h4>
                    <p className="text-sm text-slate-400">
                      Thanks for reading! If you enjoyed this article, consider sharing it with
                      others.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  leftIcon={<Share2 size={16} />}
                  className={
                    shareText === 'Copied!'
                      ? 'text-neon-green border-neon-green/30 bg-neon-green/10'
                      : ''
                  }
                >
                  {shareText === 'Copied!' ? 'Link Copied!' : 'Share Article'}
                </Button>
              </div>
              <Link to="/blog">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} />}>
                  Browse More Articles
                </Button>
              </Link>
            </div>
          </motion.footer>
        </article>
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-40 p-3 bg-slate-800/90 hover:bg-slate-700 border border-white/10 rounded-full shadow-xl text-white transition-colors"
            title="Scroll to top"
          >
            <ChevronUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reading Progress Indicator (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-slate-900/95 border-t border-white/10 px-4 py-2 safe-area-inset">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{Math.round(readingProgress)}% read</span>
          <span>
            {blog.readTime || Math.ceil((blog.content?.split(/\s+/).length || 0) / 200)} min read
          </span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple transition-all duration-150"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
