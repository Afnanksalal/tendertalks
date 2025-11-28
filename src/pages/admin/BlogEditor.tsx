import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Image, X, Star } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useBlogStore } from '../../stores/blogStore';
import { usePodcastStore } from '../../stores/podcastStore';
import { useAuthStore } from '../../stores/authStore';
import { uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';
import toast from 'react-hot-toast';

const IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif';
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface BlogFormData {
  title: string;
  excerpt: string;
  content: string;
  bannerUrl: string;
  isFeatured: boolean;
  tagIds: string[];
}

export const BlogEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthStore();
  const { tags, fetchTags } = usePodcastStore();
  const { createBlog, updateBlog } = useBlogStore();

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
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingBlog, setIsLoadingBlog] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchTags();
  }, [fetchTags, isAdmin, navigate]);

  // Load existing blog for editing
  useEffect(() => {
    if (isEditing && id && user) {
      setIsLoadingBlog(true);
      fetch(`/api/admin/blogs/${id}`, {
        headers: { 'X-User-Id': user.id },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            toast.error(data.error);
            navigate('/admin/blogs');
            return;
          }
          setFormData({
            title: data.title || '',
            excerpt: data.excerpt || '',
            content: data.content || '',
            bannerUrl: data.bannerUrl || '',
            isFeatured: data.isFeatured || false,
            tagIds: data.tagIds || [],
          });
          if (data.bannerUrl) {
            setBannerPreview(data.bannerUrl);
          }
        })
        .catch(() => {
          toast.error('Failed to load blog');
          navigate('/admin/blogs');
        })
        .finally(() => setIsLoadingBlog(false));
    }
  }, [isEditing, id, user, navigate]);

  const handleChange = (field: keyof BlogFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, WebP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Banner must be less than 5MB');
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview('');
    handleChange('bannerUrl', '');
  };

  const toggleTag = (tagId: string) => {
    const newTagIds = formData.tagIds.includes(tagId)
      ? formData.tagIds.filter((tid) => tid !== tagId)
      : [...formData.tagIds, tagId];
    handleChange('tagIds', newTagIds);
  };

  // Handle image upload for editor
  const handleImageUpload = async (file: File): Promise<string> => {
    if (!user) throw new Error('Not authenticated');

    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      throw new Error('Invalid image type');
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `content/${user.id}/${Date.now()}.${ext}`;
    const { url, error } = await uploadFile(STORAGE_BUCKETS.BLOGS, path, file, {
      upsert: true,
    });

    if (error) throw error;
    return url;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault();

    if (!validate()) return;
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setIsSubmitting(true);

    try {
      let bannerUrl = formData.bannerUrl;

      // Upload banner if selected
      if (bannerFile) {
        setUploadProgress('Uploading banner...');
        const ext = bannerFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `banners/${user.id}/${Date.now()}.${ext}`;
        const { url, error } = await uploadFile(STORAGE_BUCKETS.BLOGS, path, bannerFile, {
          upsert: true,
        });

        if (error) {
          throw new Error('Failed to upload banner');
        }
        bannerUrl = url;
      }

      setUploadProgress('Saving blog...');

      const blogData = {
        title: formData.title,
        excerpt: formData.excerpt || formData.content.slice(0, 160).replace(/[#*`\[\]]/g, ''),
        content: formData.content,
        bannerUrl,
        isFeatured: formData.isFeatured,
        tagIds: formData.tagIds,
        status: publish ? 'published' : 'draft',
      };

      if (isEditing && id) {
        await updateBlog(id, blogData);
        toast.success('Blog updated!');
      } else {
        await createBlog(blogData);
        toast.success(publish ? 'Blog published!' : 'Blog saved as draft!');
      }

      navigate('/admin/blogs');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save blog');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  if (!isAdmin) return null;

  if (isLoadingBlog) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto" data-color-mode="dark">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <button
          onClick={() => navigate('/admin/blogs')}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
          {isEditing ? 'Edit Blog' : 'Create New Blog'}
        </h1>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Basic Info */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg font-bold text-white mb-4">Basic Information</h3>

              <div className="space-y-4">
                <Input
                  label="Title"
                  placeholder="Enter blog title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  error={errors.title}
                />

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Excerpt (optional)
                  </label>
                  <textarea
                    placeholder="Brief summary of your blog post..."
                    value={formData.excerpt}
                    onChange={(e) => handleChange('excerpt', e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan"
                  />
                </div>
              </div>
            </div>

            {/* Banner Upload */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg font-bold text-white mb-4">Banner Image</h3>

              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                {bannerPreview && (
                  <div className="relative w-full sm:w-48">
                    <img
                      src={bannerPreview}
                      alt="Banner preview"
                      className="w-full h-28 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={clearBanner}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <label
                  className={`w-full sm:flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-neon-cyan/50 transition-colors border-white/10`}
                >
                  <Image size={24} className="text-slate-400 mb-2" />
                  <span className="text-sm text-slate-400 text-center">Click to upload banner</span>
                  <span className="text-xs text-slate-500 mt-1">Recommended: 1200x630px</span>
                  <input
                    type="file"
                    accept={IMAGE_EXTENSIONS}
                    onChange={handleBannerSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Content</h3>
                <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg text-sm text-slate-400 hover:text-white cursor-pointer transition-colors">
                  <Image size={14} />
                  Upload Image
                  <input
                    type="file"
                    accept={IMAGE_EXTENSIONS}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await handleImageUpload(file);
                        handleChange('content', formData.content + `\n![${file.name}](${url})\n`);
                        toast.success('Image uploaded!');
                      } catch {
                        toast.error('Failed to upload image');
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="w-full overflow-hidden">
                <MDEditor
                  value={formData.content}
                  onChange={(val) => handleChange('content', val || '')}
                  height={typeof window !== 'undefined' && window.innerWidth < 640 ? 350 : 500}
                  preview={typeof window !== 'undefined' && window.innerWidth < 768 ? 'edit' : 'live'}
                  hideToolbar={false}
                  enableScroll={true}
                  textareaProps={{
                    placeholder: 'Write your blog content here...',
                    style: { fontSize: '14px', lineHeight: '1.6' },
                  }}
                  className="!bg-slate-900/50 !border-white/10"
                />
              </div>
              {errors.content && <p className="mt-1.5 text-sm text-red-400">{errors.content}</p>}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Tags */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Tags</h3>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.tagIds.includes(tag.id)
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                        : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'
                    }`}
                  >
                    #{tag.name}
                  </button>
                ))}
                {tags.length === 0 && <p className="text-slate-500 text-sm">No tags available</p>}
              </div>
            </div>

            {/* Options */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Options</h3>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                  <Star
                    size={16}
                    className={formData.isFeatured ? 'text-amber-400' : 'text-slate-500'}
                  />
                  <span className="text-sm font-medium text-slate-300">Featured</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('isFeatured', !formData.isFeatured)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    formData.isFeatured ? 'bg-amber-400' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      formData.isFeatured ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                {uploadProgress && (
                  <div className="text-xs sm:text-sm text-neon-cyan text-center mb-2">
                    {uploadProgress}
                  </div>
                )}
                <Button
                  type="button"
                  className="w-full text-sm sm:text-base"
                  onClick={(e) => handleSubmit(e, true)}
                  isLoading={isSubmitting}
                  leftIcon={<Eye size={16} />}
                >
                  Publish Now
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full text-sm sm:text-base"
                  isLoading={isSubmitting}
                  leftIcon={<Save size={16} />}
                >
                  Save as Draft
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
