import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FileUpload } from '../../components/ui/FileUpload';
import { usePodcastStore } from '../../stores/podcastStore';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

interface PodcastFormData {
  title: string;
  description: string;
  mediaType: 'audio' | 'video';
  isFree: boolean;
  price: string;
  categoryId: string;
  tagIds: string[];
  thumbnailFile?: File;
  mediaFile?: File;
  scheduledAt?: string;
}

export const PodcastEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { categories, tags, fetchCategories, fetchTags, createPodcast, updatePodcast, currentPodcast, fetchPodcastBySlug } = usePodcastStore();

  const isEditing = !!id;

  const [formData, setFormData] = useState<PodcastFormData>({
    title: '',
    description: '',
    mediaType: 'audio',
    isFree: false,
    price: '0',
    categoryId: '',
    tagIds: [],
  });
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, [fetchCategories, fetchTags]);

  useEffect(() => {
    if (isEditing && currentPodcast) {
      setFormData({
        title: currentPodcast.title,
        description: currentPodcast.description,
        mediaType: currentPodcast.mediaType,
        isFree: currentPodcast.isFree,
        price: currentPodcast.price || '0',
        categoryId: currentPodcast.categoryId || '',
        tagIds: [],
      });
      if (currentPodcast.thumbnailUrl) {
        setThumbnailPreview(currentPodcast.thumbnailUrl);
      }
    }
  }, [isEditing, currentPodcast]);

  const handleChange = (field: keyof PodcastFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleThumbnailSelect = (file: File) => {
    handleChange('thumbnailFile', file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleMediaSelect = (file: File) => {
    handleChange('mediaFile', file);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.isFree && (!formData.price || parseFloat(formData.price) <= 0)) {
      newErrors.price = 'Price is required for paid content';
    }
    if (!isEditing && !formData.mediaFile) {
      newErrors.mediaFile = 'Media file is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault();

    if (!validate()) return;
    if (!user) return;

    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('mediaType', formData.mediaType);
      data.append('isFree', String(formData.isFree));
      data.append('price', formData.price);
      data.append('createdBy', user.id);
      
      if (formData.categoryId) {
        data.append('categoryId', formData.categoryId);
      }
      if (formData.tagIds.length > 0) {
        data.append('tagIds', JSON.stringify(formData.tagIds));
      }
      if (formData.thumbnailFile) {
        data.append('thumbnail', formData.thumbnailFile);
      }
      if (formData.mediaFile) {
        data.append('media', formData.mediaFile);
      }
      if (publish) {
        data.append('status', 'published');
      }

      if (isEditing && id) {
        await updatePodcast(id, data);
        toast.success('Podcast updated!');
      } else {
        await createPodcast(data);
        toast.success(publish ? 'Podcast published!' : 'Podcast saved as draft!');
      }

      navigate('/admin/podcasts');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save podcast');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/podcasts')}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-display font-bold text-white">
          {isEditing ? 'Edit Podcast' : 'Create New Podcast'}
        </h1>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                <Input
                  label="Title"
                  placeholder="Enter podcast title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  error={errors.title}
                />

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your podcast..."
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={5}
                    className={`w-full bg-slate-900/50 border rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 focus:border-neon-cyan ${
                      errors.description ? 'border-red-500' : 'border-white/10'
                    }`}
                  />
                  {errors.description && (
                    <p className="mt-1.5 text-sm text-red-400">{errors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Media Type
                    </label>
                    <div className="flex gap-2">
                      {['audio', 'video'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleChange('mediaType', type)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            formData.mediaType === type
                              ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                              : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Category
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => handleChange('categoryId', e.target.value)}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Media Upload */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Media Files</h3>
              
              <div className="space-y-4">
                <FileUpload
                  label="Thumbnail Image"
                  type="image"
                  onFileSelect={handleThumbnailSelect}
                  onFileRemove={() => {
                    handleChange('thumbnailFile', undefined);
                    setThumbnailPreview('');
                  }}
                  preview={thumbnailPreview}
                  helperText="Recommended: 1280x720px (16:9)"
                />

                <FileUpload
                  label={`${formData.mediaType === 'video' ? 'Video' : 'Audio'} File`}
                  type={formData.mediaType}
                  onFileSelect={handleMediaSelect}
                  onFileRemove={() => handleChange('mediaFile', undefined)}
                  error={errors.mediaFile}
                  helperText="Max file size: 500MB"
                  maxSize={500 * 1024 * 1024}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Pricing</h3>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('isFree', true)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.isFree
                        ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                        : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('isFree', false)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      !formData.isFree
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'
                    }`}
                  >
                    Paid
                  </button>
                </div>

                {!formData.isFree && (
                  <Input
                    label="Price (₹)"
                    type="number"
                    placeholder="299"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    error={errors.price}
                  />
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      const newTags = formData.tagIds.includes(tag.id)
                        ? formData.tagIds.filter((t) => t !== tag.id)
                        : [...formData.tagIds, tag.id];
                      handleChange('tagIds', newTags);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      formData.tagIds.includes(tag.id)
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full"
                  onClick={(e) => handleSubmit(e, true)}
                  isLoading={isSubmitting}
                  leftIcon={<Eye size={18} />}
                >
                  Publish Now
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  isLoading={isSubmitting}
                  leftIcon={<Save size={18} />}
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
