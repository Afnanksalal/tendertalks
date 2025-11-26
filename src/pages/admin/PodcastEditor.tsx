import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Loader2, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { usePodcastStore } from '../../stores/podcastStore';
import { useAuthStore } from '../../stores/authStore';
import { uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface PodcastFormData {
  title: string;
  description: string;
  mediaType: 'audio' | 'video';
  isFree: boolean;
  price: string;
  categoryId: string;
  isDownloadable: boolean;
  thumbnailUrl: string;
  mediaUrl: string;
  duration: number;
}

export const PodcastEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthStore();
  const { categories, fetchCategories, createPodcast, updatePodcast, currentPodcast } = usePodcastStore();

  const isEditing = !!id;

  const [formData, setFormData] = useState<PodcastFormData>({
    title: '',
    description: '',
    mediaType: 'audio',
    isFree: false,
    price: '0',
    categoryId: '',
    isDownloadable: false,
    thumbnailUrl: '',
    mediaUrl: '',
    duration: 0,
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchCategories();
  }, [fetchCategories, isAdmin, navigate]);

  useEffect(() => {
    if (isEditing && currentPodcast) {
      setFormData({
        title: currentPodcast.title,
        description: currentPodcast.description,
        mediaType: currentPodcast.mediaType,
        isFree: currentPodcast.isFree,
        price: currentPodcast.price || '0',
        categoryId: currentPodcast.categoryId || '',
        isDownloadable: currentPodcast.isDownloadable,
        thumbnailUrl: currentPodcast.thumbnailUrl || '',
        mediaUrl: currentPodcast.mediaUrl || '',
        duration: currentPodcast.duration || 0,
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

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isAudio && !isVideo) {
        toast.error('Please select an audio or video file');
        return;
      }
      
      setMediaFile(file);
      handleChange('mediaType', isVideo ? 'video' : 'audio');
    }
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
    if (!isEditing && !mediaFile && !formData.mediaUrl) {
      newErrors.media = 'Media file is required';
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
      let thumbnailUrl = formData.thumbnailUrl;
      let mediaUrl = formData.mediaUrl;

      // Upload thumbnail if selected
      if (thumbnailFile) {
        setUploadProgress('Uploading thumbnail...');
        const path = `${user.id}/${Date.now()}-${thumbnailFile.name}`;
        const { url, error } = await uploadFile(STORAGE_BUCKETS.THUMBNAILS, path, thumbnailFile, { upsert: true });
        
        if (error) {
          throw new Error('Failed to upload thumbnail');
        }
        thumbnailUrl = url;
      }

      // Upload media if selected
      if (mediaFile) {
        setUploadProgress('Uploading media file...');
        const path = `${user.id}/${Date.now()}-${mediaFile.name}`;
        const { url, error } = await uploadFile(STORAGE_BUCKETS.PODCASTS, path, mediaFile, { upsert: true });
        
        if (error) {
          throw new Error('Failed to upload media file');
        }
        mediaUrl = url;
      }

      setUploadProgress('Saving podcast...');

      const podcastData = {
        title: formData.title,
        description: formData.description,
        mediaType: formData.mediaType,
        isFree: formData.isFree,
        price: formData.isFree ? '0' : formData.price,
        categoryId: formData.categoryId || undefined,
        isDownloadable: formData.isDownloadable,
        thumbnailUrl,
        mediaUrl,
        duration: formData.duration,
        status: publish ? 'published' : 'draft',
      };

      if (isEditing && id) {
        await updatePodcast(id, podcastData);
        toast.success('Podcast updated!');
      } else {
        await createPodcast(podcastData);
        toast.success(publish ? 'Podcast published!' : 'Podcast saved as draft!');
      }

      navigate('/admin/podcasts');
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to save podcast');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  if (!isAdmin) {
    return null;
  }

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

                <Input
                  label="Duration (seconds)"
                  type="number"
                  placeholder="3600"
                  value={formData.duration.toString()}
                  onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Media Upload */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Media Files</h3>
              
              <div className="space-y-4">
                {/* Thumbnail */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Thumbnail Image
                  </label>
                  <div className="flex items-start gap-4">
                    {thumbnailPreview && (
                      <img 
                        src={thumbnailPreview} 
                        alt="Thumbnail preview" 
                        className="w-32 h-20 object-cover rounded-lg"
                      />
                    )}
                    <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-neon-cyan/50 transition-colors">
                      <Upload size={24} className="text-slate-400 mb-2" />
                      <span className="text-sm text-slate-400">Click to upload thumbnail</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Media File */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {formData.mediaType === 'video' ? 'Video' : 'Audio'} File
                  </label>
                  <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-neon-cyan/50 transition-colors ${
                    errors.media ? 'border-red-500' : 'border-white/10'
                  }`}>
                    <Upload size={24} className="text-slate-400 mb-2" />
                    <span className="text-sm text-slate-400">
                      {mediaFile ? mediaFile.name : 'Click to upload media file'}
                    </span>
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      onChange={handleMediaSelect}
                      className="hidden"
                    />
                  </label>
                  {errors.media && (
                    <p className="mt-1.5 text-sm text-red-400">{errors.media}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">Or enter URL directly:</p>
                  <Input
                    placeholder="https://example.com/media.mp3"
                    value={formData.mediaUrl}
                    onChange={(e) => handleChange('mediaUrl', e.target.value)}
                    className="mt-2"
                  />
                </div>
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

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDownloadable}
                    onChange={(e) => handleChange('isDownloadable', e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-slate-800 text-neon-cyan focus:ring-neon-cyan/50"
                  />
                  <span className="text-sm text-slate-300">Allow downloads</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
              <div className="space-y-3">
                {uploadProgress && (
                  <div className="text-sm text-neon-cyan text-center mb-2">
                    {uploadProgress}
                  </div>
                )}
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
