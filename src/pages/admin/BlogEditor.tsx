import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  Image,
  X,
  Star,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  CheckSquare,
  EyeOff,
  Maximize2,
  Minimize2,
  Table,
  Strikethrough,
  Smile,
  FileCode,
  MoreHorizontal,
  Undo2,
  Redo2,
  AtSign,
  Hash,
  AlertCircle,
  Lightbulb,
  Info,
  AlertTriangle,
  Type,
  Subscript,
  Superscript,
  Keyboard,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkEmoji from 'remark-emoji';
import rehypeRaw from 'rehype-raw';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useBlogStore } from '../../stores/blogStore';
import { usePodcastStore } from '../../stores/podcastStore';
import { useAuthStore } from '../../stores/authStore';
import { uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';
import type { Blog } from '../../db/schema';
import toast from 'react-hot-toast';

const IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif';
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const EMOJI_CATEGORIES = {
  Smileys: [
    '😀',
    '😂',
    '🤣',
    '😊',
    '😍',
    '🥰',
    '😎',
    '🤔',
    '😅',
    '🙌',
    '😢',
    '😤',
    '🥳',
    '😴',
    '🤯',
  ],
  Gestures: [
    '👍',
    '👎',
    '👏',
    '🙏',
    '💪',
    '🤝',
    '✌️',
    '🤞',
    '👋',
    '🖐️',
    '✋',
    '👊',
    '🤙',
    '👆',
    '👇',
  ],
  Symbols: [
    '❤️',
    '🔥',
    '⭐',
    '✨',
    '🎉',
    '🚀',
    '💡',
    '⚡',
    '✅',
    '❌',
    '⚠️',
    '📌',
    '🎯',
    '💯',
    '🏆',
  ],
  Objects: [
    '💻',
    '🔧',
    '📝',
    '📚',
    '🎨',
    '📊',
    '🔗',
    '💬',
    '📱',
    '⌨️',
    '🖥️',
    '📷',
    '🎵',
    '🎬',
    '📦',
  ],
};

interface BlogFormData {
  title: string;
  excerpt: string;
  content: string;
  bannerUrl: string;
  isFeatured: boolean;
  tagIds: string[];
}

interface HistoryState {
  content: string;
  cursor: number;
}

const ToolbarBtn: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}> = ({ icon, onClick, title, active, disabled, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0 ${active ? 'bg-neon-cyan/20 text-neon-cyan' : disabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-white/10'} ${className}`}
  >
    {icon}
  </button>
);

const Divider = () => <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block flex-shrink-0" />;

const CODE_LANGUAGES = [
  { label: 'Plain Text', value: '' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'JSON', value: 'json' },
  { label: 'Bash', value: 'bash' },
  { label: 'SQL', value: 'sql' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Swift', value: 'swift' },
  { label: 'Kotlin', value: 'kotlin' },
];

export const BlogEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthStore();
  const { tags, fetchTags } = usePodcastStore();
  const { createBlog, updateBlog } = useBlogStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!id;

  const [formData, setFormData] = useState<BlogFormData>({
    title: '',
    excerpt: '',
    content: '',
    bannerUrl: '',
    isFeatured: false,
    tagIds: [],
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showCodeLang, setShowCodeLang] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys');
  const emojiRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const codeLangRef = useRef<HTMLDivElement>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (!isAdmin) navigate('/');
    else fetchTags();
  }, [fetchTags, isAdmin, navigate]);

  useEffect(() => {
    if (isEditing && id && user) {
      setIsLoading(true);
      fetch(`/api/admin/blogs/${id}`, { headers: { 'X-User-Id': user.id } })
        .then((r) => r.json())
        .then((d) => {
          if (d.error) {
            toast.error(d.error);
            navigate('/admin/blogs');
            return;
          }
          setFormData({
            title: d.title || '',
            excerpt: d.excerpt || '',
            content: d.content || '',
            bannerUrl: d.bannerUrl || '',
            isFeatured: d.isFeatured || false,
            tagIds: d.tagIds || [],
          });
          if (d.bannerUrl) setBannerPreview(d.bannerUrl);
          // Initialize history with loaded content
          setHistory([{ content: d.content || '', cursor: 0 }]);
          setHistoryIndex(0);
        })
        .catch(() => {
          toast.error('Failed to load');
          navigate('/admin/blogs');
        })
        .finally(() => setIsLoading(false));
    }
  }, [isEditing, id, user, navigate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false);
      if (codeLangRef.current && !codeLangRef.current.contains(e.target as Node))
        setShowCodeLang(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!formData.content || isEditing) return;
    const timer = setInterval(() => {
      localStorage.setItem('blog_draft', JSON.stringify(formData));
      setLastSaved(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, [formData, isEditing]);

  // Load draft on mount
  useEffect(() => {
    if (!isEditing) {
      const draft = localStorage.getItem('blog_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.content) {
            setFormData(parsed);
            toast.success('Draft restored');
          }
        } catch {
          // Ignore invalid JSON
        }
      }
    }
  }, [isEditing]);

  const handleChange = useCallback(
    (field: keyof BlogFormData, value: string | boolean | string[]) => {
      setFormData((p) => ({ ...p, [field]: value }));
      if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
    },
    [errors]
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      handleChange('content', newContent);
      // Add to history for undo/redo
      const cursor = textareaRef.current?.selectionStart || 0;
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({ content: newContent, cursor });
        if (newHistory.length > 50) newHistory.shift(); // Limit history
        return newHistory;
      });
      setHistoryIndex((prev) => (prev < 50 ? prev + 1 : 50));
    },
    [historyIndex, handleChange]
  );

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setFormData((p) => ({ ...p, content: history[newIndex].content }));
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(history[newIndex].cursor, history[newIndex].cursor);
      }, 0);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setFormData((p) => ({ ...p, content: history[newIndex].content }));
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(history[newIndex].cursor, history[newIndex].cursor);
      }, 0);
    }
  };

  const insertText = useCallback(
    (before: string, after = '', placeholder = '') => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart,
        end = ta.selectionEnd;
      const selected = formData.content.substring(start, end);
      const text = selected || placeholder;
      const newContent =
        formData.content.substring(0, start) +
        before +
        text +
        after +
        formData.content.substring(end);
      handleContentChange(newContent);
      setTimeout(() => {
        ta.focus();
        const pos = start + before.length + text.length;
        ta.setSelectionRange(
          selected ? pos + after.length : start + before.length,
          selected ? pos + after.length : pos
        );
      }, 0);
    },
    [formData.content, handleContentChange]
  );

  const insertAtCursor = useCallback(
    (text: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const newContent =
        formData.content.substring(0, start) + text + formData.content.substring(start);
      handleContentChange(newContent);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    },
    [formData.content, handleContentChange]
  );

  const actions = {
    bold: () => insertText('**', '**', 'bold text'),
    italic: () => insertText('_', '_', 'italic text'),
    strike: () => insertText('~~', '~~', 'strikethrough'),
    h1: () => insertText('\n# ', '\n', 'Heading 1'),
    h2: () => insertText('\n## ', '\n', 'Heading 2'),
    h3: () => insertText('\n### ', '\n', 'Heading 3'),
    ul: () => insertText('\n- ', '\n', 'List item'),
    ol: () => insertText('\n1. ', '\n', 'List item'),
    task: () => insertText('\n- [ ] ', '\n', 'Task item'),
    quote: () => insertText('\n> ', '\n', 'Quote text'),
    code: () => insertText('`', '`', 'code'),
    codeBlock: (lang = '') => insertText(`\n\`\`\`${lang}\n`, '\n```\n', 'code here'),
    link: () => insertText('[', '](https://)', 'link text'),
    hr: () => insertText('\n\n---\n\n', ''),
    table: () =>
      insertText(
        '\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n\n',
        ''
      ),
    mention: () => insertText('@', '', 'username'),
    hashtag: () => insertText('#', ' ', 'tag'),
    // GitHub-style alerts
    noteAlert: () => insertText('\n> [!NOTE]\n> ', '\n', 'Useful information'),
    tipAlert: () => insertText('\n> [!TIP]\n> ', '\n', 'Helpful advice'),
    importantAlert: () => insertText('\n> [!IMPORTANT]\n> ', '\n', 'Key information'),
    warningAlert: () => insertText('\n> [!WARNING]\n> ', '\n', 'Urgent info'),
    cautionAlert: () => insertText('\n> [!CAUTION]\n> ', '\n', 'Negative consequences'),
    // HTML elements
    details: () =>
      insertText(
        '\n<details>\n<summary>Click to expand</summary>\n\n',
        '\n\n</details>\n',
        'Hidden content'
      ),
    kbd: () => insertText('<kbd>', '</kbd>', 'Key'),
    sup: () => insertText('<sup>', '</sup>', 'superscript'),
    sub: () => insertText('<sub>', '</sub>', 'subscript'),
    mark: () => insertText('<mark>', '</mark>', 'highlighted'),
    footnote: () => insertText('[^', ']: ', '1'),
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    if (!IMAGE_MIME_TYPES.includes(file.type)) throw new Error('Invalid type');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `content/${user.id}/${Date.now()}.${ext}`;
    const { url, error } = await uploadFile(STORAGE_BUCKETS.BLOGS, path, file, { upsert: true });
    if (error) throw error;
    return url;
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      toast.error('Invalid image format');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max file size is 5MB');
      return;
    }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleContentImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.loading('Uploading image...', { id: 'img' });
      const url = await handleImageUpload(file);
      insertText(`\n![${file.name.replace(/\.[^/.]+$/, '')}](${url})\n`, '');
      toast.success('Image uploaded!', { id: 'img' });
    } catch {
      toast.error('Upload failed', { id: 'img' });
    }
    e.target.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          try {
            toast.loading('Uploading pasted image...', { id: 'paste' });
            const url = await handleImageUpload(file);
            insertAtCursor(`\n![Pasted image](${url})\n`);
            toast.success('Image uploaded!', { id: 'paste' });
          } catch {
            toast.error('Upload failed', { id: 'paste' });
          }
        }
        break;
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && IMAGE_MIME_TYPES.includes(file.type)) {
      try {
        toast.loading('Uploading dropped image...', { id: 'drop' });
        const url = await handleImageUpload(file);
        insertAtCursor(`\n![${file.name.replace(/\.[^/.]+$/, '')}](${url})\n`);
        toast.success('Image uploaded!', { id: 'drop' });
      } catch {
        toast.error('Upload failed', { id: 'drop' });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          actions.bold();
          break;
        case 'i':
          e.preventDefault();
          actions.italic();
          break;
        case 'k':
          e.preventDefault();
          actions.link();
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          break;
        case 'y':
          e.preventDefault();
          redo();
          break;
      }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  ');
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) errs.title = 'Title is required';
    if (!formData.content.trim()) errs.content = 'Content is required';
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
    if (!validate() || !user) return;
    setIsSubmitting(true);
    try {
      let bannerUrl = formData.bannerUrl;
      if (bannerFile) {
        const ext = bannerFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `banners/${user.id}/${Date.now()}.${ext}`;
        const { url, error } = await uploadFile(STORAGE_BUCKETS.BLOGS, path, bannerFile, {
          upsert: true,
        });
        if (error) throw new Error('Banner upload failed');
        bannerUrl = url;
      }
      const data: Partial<Blog> & { tagIds: string[]; content?: string } = {
        title: formData.title,
        excerpt:
          formData.excerpt ||
          formData.content
            .slice(0, 160)
            .replace(/[#*`[\]]/g, '')
            .trim(),
        content: formData.content,
        bannerUrl,
        isFeatured: formData.isFeatured,
        tagIds: formData.tagIds,
        status: (publish ? 'published' : 'draft') as any,
      };
      if (isEditing && id) {
        await updateBlog(id, data);
        toast.success('Blog updated!');
      } else {
        await createBlog(data);
        toast.success(publish ? 'Blog published!' : 'Draft saved!');
      }
      localStorage.removeItem('blog_draft');
      navigate('/admin/blogs');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview('');
    handleChange('bannerUrl', '');
  };
  const toggleTag = (tagId: string) =>
    handleChange(
      'tagIds',
      formData.tagIds.includes(tagId)
        ? formData.tagIds.filter((t) => t !== tagId)
        : [...formData.tagIds, tagId]
    );
  const clearDraft = () => {
    localStorage.removeItem('blog_draft');
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      bannerUrl: '',
      isFeatured: false,
      tagIds: [],
    });
    toast.success('Draft cleared');
  };

  // Word and character count
  const wordCount = formData.content.trim() ? formData.content.trim().split(/\s+/).length : 0;
  const charCount = formData.content.length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  if (!isAdmin) return null;
  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const sz = 16;

  return (
    <div
      className={
        isFullscreen ? 'fixed inset-0 z-50 bg-[#030014] flex flex-col' : 'max-w-6xl mx-auto'
      }
    >
      <input
        ref={bannerInputRef}
        type="file"
        accept={IMAGE_EXTENSIONS}
        onChange={handleBannerSelect}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_EXTENSIONS}
        onChange={handleContentImage}
        className="hidden"
      />

      {/* Header */}
      <div
        className={`flex items-center justify-between gap-3 ${isFullscreen ? 'p-4 border-b border-white/10' : 'mb-4 sm:mb-6'}`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => (isFullscreen ? setIsFullscreen(false) : navigate('/admin/blogs'))}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-display font-bold text-white">
              {isEditing ? 'Edit Blog' : 'New Blog'}
            </h1>
            {lastSaved && !isEditing && (
              <p className="text-xs text-slate-500">Auto-saved {lastSaved.toLocaleTimeString()}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && formData.content && (
            <button
              onClick={clearDraft}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Clear draft
            </button>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:flex"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => handleSubmit(e, false)}
        className={isFullscreen ? 'flex-1 flex flex-col overflow-hidden p-4' : ''}
      >
        <div
          className={`grid grid-cols-1 ${isFullscreen ? 'flex-1 overflow-hidden' : 'lg:grid-cols-3'} gap-4`}
        >
          <div
            className={`${isFullscreen ? 'flex flex-col overflow-hidden' : 'lg:col-span-2'} space-y-4`}
          >
            {/* Title & Excerpt */}
            {!isFullscreen && (
              <>
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 space-y-4">
                  <Input
                    label="Title"
                    placeholder="Enter an engaging title..."
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    error={errors.title}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Excerpt <span className="text-slate-500 text-xs">(optional)</span>
                    </label>
                    <textarea
                      placeholder="Brief summary for previews and SEO..."
                      value={formData.excerpt}
                      onChange={(e) => handleChange('excerpt', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Auto-generated from content if left empty
                    </p>
                  </div>
                </div>

                {/* Banner */}
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white mb-3">
                    Banner Image <span className="text-slate-500 font-normal">(recommended)</span>
                  </h3>
                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    {bannerPreview && (
                      <div className="relative w-full sm:w-48 flex-shrink-0">
                        <img
                          src={bannerPreview}
                          alt="Banner"
                          className="w-full h-28 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={clearBanner}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <label className="w-full sm:flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-neon-cyan/50 transition-colors">
                      <Image size={24} className="text-slate-400 mb-2" />
                      <span className="text-sm text-slate-400">Click to upload banner</span>
                      <span className="text-xs text-slate-500 mt-1">JPG, PNG, WebP (max 5MB)</span>
                      <input
                        type="file"
                        accept={IMAGE_EXTENSIONS}
                        onChange={handleBannerSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Editor */}
            <div
              className={`bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden flex flex-col ${isFullscreen ? 'flex-1' : ''}`}
            >
              {/* Toolbar */}
              <div className="flex items-center gap-0.5 p-2 border-b border-white/10 bg-slate-800/50 overflow-x-auto no-scrollbar flex-shrink-0">
                <ToolbarBtn
                  icon={<Undo2 size={sz} />}
                  onClick={undo}
                  title="Undo (Ctrl+Z)"
                  disabled={historyIndex <= 0}
                />
                <ToolbarBtn
                  icon={<Redo2 size={sz} />}
                  onClick={redo}
                  title="Redo (Ctrl+Y)"
                  disabled={historyIndex >= history.length - 1}
                />
                <Divider />
                <ToolbarBtn
                  icon={<Bold size={sz} />}
                  onClick={actions.bold}
                  title="Bold (Ctrl+B)"
                />
                <ToolbarBtn
                  icon={<Italic size={sz} />}
                  onClick={actions.italic}
                  title="Italic (Ctrl+I)"
                />
                <ToolbarBtn
                  icon={<Strikethrough size={sz} />}
                  onClick={actions.strike}
                  title="Strikethrough"
                />
                <Divider />
                <ToolbarBtn icon={<Heading1 size={sz} />} onClick={actions.h1} title="Heading 1" />
                <ToolbarBtn icon={<Heading2 size={sz} />} onClick={actions.h2} title="Heading 2" />
                <ToolbarBtn icon={<Heading3 size={sz} />} onClick={actions.h3} title="Heading 3" />
                <Divider />
                <ToolbarBtn icon={<List size={sz} />} onClick={actions.ul} title="Bullet List" />
                <ToolbarBtn
                  icon={<ListOrdered size={sz} />}
                  onClick={actions.ol}
                  title="Numbered List"
                />
                <ToolbarBtn
                  icon={<CheckSquare size={sz} />}
                  onClick={actions.task}
                  title="Task List"
                />
                <Divider />
                <ToolbarBtn icon={<Quote size={sz} />} onClick={actions.quote} title="Blockquote" />
                <ToolbarBtn icon={<Code size={sz} />} onClick={actions.code} title="Inline Code" />

                {/* Code Block with Language Selector */}
                <div ref={codeLangRef} className="relative">
                  <ToolbarBtn
                    icon={<FileCode size={sz} />}
                    onClick={() => setShowCodeLang(!showCodeLang)}
                    title="Code Block"
                    active={showCodeLang}
                  />
                  {showCodeLang && (
                    <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50 py-1 w-40 max-h-60 overflow-y-auto">
                      {CODE_LANGUAGES.map((lang) => (
                        <button
                          key={lang.value}
                          type="button"
                          onClick={() => {
                            actions.codeBlock(lang.value);
                            setShowCodeLang(false);
                          }}
                          className="w-full px-3 py-1.5 text-sm text-left text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <ToolbarBtn
                  icon={<Link2 size={sz} />}
                  onClick={actions.link}
                  title="Link (Ctrl+K)"
                />
                <ToolbarBtn
                  icon={<Image size={sz} />}
                  onClick={() => imageInputRef.current?.click()}
                  title="Insert Image"
                />
                <ToolbarBtn icon={<Table size={sz} />} onClick={actions.table} title="Table" />
                <ToolbarBtn
                  icon={<Minus size={sz} />}
                  onClick={actions.hr}
                  title="Horizontal Rule"
                />

                {/* Emoji Picker */}
                <div ref={emojiRef} className="relative">
                  <ToolbarBtn
                    icon={<Smile size={sz} />}
                    onClick={() => setShowEmoji(!showEmoji)}
                    title="Emoji"
                    active={showEmoji}
                  />
                  {showEmoji && (
                    <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50 p-3 w-[280px]">
                      <div className="flex gap-1 mb-2 overflow-x-auto no-scrollbar">
                        {(
                          Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>
                        ).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setEmojiCategory(cat)}
                            className={`px-2 py-1 text-xs rounded-lg whitespace-nowrap transition-colors ${emojiCategory === cat ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-slate-400 hover:bg-white/10'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {EMOJI_CATEGORIES[emojiCategory].map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => {
                              insertAtCursor(e);
                              setShowEmoji(false);
                            }}
                            className="p-1.5 text-lg hover:bg-white/10 rounded transition-colors"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* More Options */}
                <div ref={moreRef} className="relative">
                  <ToolbarBtn
                    icon={<MoreHorizontal size={sz} />}
                    onClick={() => setShowMore(!showMore)}
                    title="More Options"
                    active={showMore}
                  />
                  {showMore && (
                    <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50 py-1 min-w-[180px]">
                      <div className="px-3 py-1.5 text-xs text-slate-500 font-medium">
                        GitHub Alerts
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          actions.noteAlert();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <Info size={14} className="text-blue-400" /> Note
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.tipAlert();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <Lightbulb size={14} className="text-green-400" /> Tip
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.importantAlert();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <AlertCircle size={14} className="text-purple-400" /> Important
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.warningAlert();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <AlertTriangle size={14} className="text-amber-400" /> Warning
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.cautionAlert();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <AlertTriangle size={14} className="text-red-400" /> Caution
                      </button>
                      <div className="border-t border-white/10 my-1" />
                      <div className="px-3 py-1.5 text-xs text-slate-500 font-medium">
                        Formatting
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          actions.details();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <Type size={14} /> Collapsible
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.kbd();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <Keyboard size={14} /> Keyboard Key
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.sup();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <Superscript size={14} /> Superscript
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.sub();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <Subscript size={14} /> Subscript
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.mark();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <Type size={14} /> Highlight
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.footnote();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <Hash size={14} /> Footnote
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.mention();
                          setShowMore(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <AtSign size={14} /> Mention
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1" />
                <ToolbarBtn
                  icon={showPreview ? <EyeOff size={sz} /> : <Eye size={sz} />}
                  onClick={() => setShowPreview(!showPreview)}
                  title="Toggle Preview"
                  active={showPreview}
                />
              </div>

              {/* Editor Content */}
              <div
                className={`flex-1 grid ${showPreview ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} overflow-hidden`}
              >
                <div
                  className={`${showPreview ? 'border-b md:border-b-0 md:border-r border-white/10' : ''} overflow-hidden flex flex-col`}
                >
                  <textarea
                    ref={textareaRef}
                    value={formData.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    placeholder="Start writing your blog post...&#10;&#10;Supports GitHub Flavored Markdown:&#10;- **bold**, _italic_, ~~strikethrough~~&#10;- # Headings, > quotes, `code`&#10;- Lists, tables, task lists&#10;- Drag & drop or paste images&#10;- Emojis 🎉 and more!"
                    className={`w-full flex-1 bg-transparent text-white placeholder:text-slate-500 p-4 focus:outline-none resize-none font-mono text-sm leading-relaxed ${isFullscreen ? 'min-h-[calc(100vh-220px)]' : 'min-h-[350px]'}`}
                  />

                  {/* Stats Bar */}
                  <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-slate-800/30 text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                      <span>{wordCount} words</span>
                      <span>{charCount} characters</span>
                      <span>~{readTime} min read</span>
                    </div>
                    <span className="hidden sm:block">
                      Markdown supported • Ctrl+B bold • Ctrl+I italic • Ctrl+K link
                    </span>
                  </div>
                </div>

                {showPreview && (
                  <div
                    className={`p-4 overflow-auto bg-slate-900/30 ${isFullscreen ? 'min-h-[calc(100vh-220px)]' : 'min-h-[350px] max-h-[450px]'}`}
                  >
                    <div className="prose prose-invert prose-sm max-w-none blog-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkEmoji]}
                        rehypePlugins={[rehypeRaw]}
                      >
                        {formData.content || '*Start typing to see preview...*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
              {errors.content && <p className="px-4 pb-3 text-sm text-red-400">{errors.content}</p>}
            </div>
          </div>

          {/* Sidebar */}
          {!isFullscreen && (
            <div className="space-y-4">
              {/* Tags */}
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${formData.tagIds.includes(tag.id) ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent'}`}
                    >
                      #{tag.name}
                    </button>
                  ))}
                  {!tags.length && <p className="text-slate-500 text-xs">No tags available</p>}
                </div>
              </div>

              {/* Options */}
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3">Options</h3>
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <Star
                      size={16}
                      className={formData.isFeatured ? 'text-amber-400' : 'text-slate-500'}
                    />
                    <div>
                      <span className="text-sm text-slate-300">Featured</span>
                      <p className="text-xs text-slate-500">Show on homepage</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChange('isFeatured', !formData.isFeatured)}
                    className="flex-shrink-0"
                  >
                    {formData.isFeatured ? (
                      <ToggleRight size={32} className="text-amber-400" />
                    ) : (
                      <ToggleLeft size={32} className="text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Stats Preview */}
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3">Content Stats</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-neon-cyan">{wordCount}</p>
                    <p className="text-xs text-slate-500">Words</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-neon-purple">{readTime}</p>
                    <p className="text-xs text-slate-500">Min read</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-neon-green">{formData.tagIds.length}</p>
                    <p className="text-xs text-slate-500">Tags</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 space-y-3">
                <Button
                  type="button"
                  className="w-full"
                  onClick={(e) => handleSubmit(e, true)}
                  isLoading={isSubmitting}
                  leftIcon={<Eye size={16} />}
                >
                  Publish Now
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  isLoading={isSubmitting}
                  leftIcon={<Save size={16} />}
                >
                  Save as Draft
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Actions */}
        {isFullscreen && (
          <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
            <div className="text-sm text-slate-500">
              {wordCount} words • {readTime} min read
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(false)}>
                Exit Fullscreen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleSubmit(e, false)}
                isLoading={isSubmitting}
                leftIcon={<Save size={14} />}
              >
                Save Draft
              </Button>
              <Button
                size="sm"
                onClick={(e) => handleSubmit(e, true)}
                isLoading={isSubmitting}
                leftIcon={<Eye size={14} />}
              >
                Publish
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
