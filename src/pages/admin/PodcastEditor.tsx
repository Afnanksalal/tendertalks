import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Music, Video, Image, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { usePodcastStore } from '../../stores/podcastStore';
import { useAuthStore } from '../../stores/authStore';
import { uploadFile, STORAGE_BUCKETS } from '../../lib/supabase';
import toast from 'react-hot-toast';

// File type configurations
const AUDIO_EXTENSIONS = '.mp3,.wav,.ogg,.m4a,.aac,.flac,.wma';
const VIDEO_EXTENSIONS = '.mp4,.webm,.mov,.avi,.mkv,.m4v';
const IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif';

const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/aac', 'audio/flac', 'audio/x-ms-wma'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/x-m4v'];
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

  // Handle media type change - clear media file if type changes
  const handleMediaTypeChange = (type: 'audio' | 'video') => {
    if (type !== formData.mediaType) {
      setMediaFile(null);
      handleChange('mediaUrl', '');
      // Clear thumbnail only when switching FROM video TO audio
      if (type === 'audio') {
        setThumbnailFile(null);
        setThumbnailPreview('');
        handleChange('thumbnailUrl', '');
      }
    }
    handleChange('mediaType', type);
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, WebP, GIF)');
      return;
    }

    // Max 5MB for thumbnails
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Thumbnail must be less than 5MB');
      return;
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAudio = AUDIO_MIME_TYPES.includes(file.type);
    const isVideo = VIDEO_MIME_TYPES.includes(file.type);

    // Validate file type matches selected media type
    if (formData.mediaType === 'audio' && !isAudio) {
      toast.error('Please select a valid audio file (MP3, WAV, OGG, M4A, AAC, FLAC)');
      return;
    }

    if (formData.mediaType === 'video' && !isVideo) {
      toast.error('Please select a valid video file (MP4, WebM, MOV, AVI, MKV)');
      return;
    }

    // File size limits
    const maxSize = formData.mediaType === 'video' ? 500 : 100; // MB
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File must be less than ${maxSize}MB`);
      return;
    }

    setMediaFile(file);
    if (errors.media) {
      setErrors((prev) => ({ ...prev, media: '' }));
    }
  };

  const clearThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview('');
    handleChange('thumbnailUrl', '');
  };

  const clearMediaFile = () => {
    setMediaFile(null);
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
      newErrors.media = `${formData.mediaType === 'video' ? 'Video' : 'Audio'} file is required`;
    }
    // Thumbnail required for video
    if (formData.mediaType === 'video' && !thumbnailFile && !formData.thumbnailUrl) {
      newErrors.thumbnail = 'Thumbnail is required for video content';
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

      // Upload thumbnail if selected (required for video, optional for audio)
      if (thumbnailFile) {
        setUploadProgress('Uploading thumbnail...');
        const ext = thumbnailFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { url, error } = await uploadFile(STORAGE_BUCKETS.THUMBNAILS, path, thumbnailFile, { upsert: true });
        
        if (error) {
          throw new Error('Failed to upload thumbnail');
        }
        thumbnailUrl = url;
      }

      // Upload media file
      if (mediaFile) {
        setUploadProgress(`Uploading ${formData.mediaType} file...`);
        const ext = mediaFile.name.split('.').pop()?.toLowerCase() || (formData.mediaType === 'video' ? 'mp4' : 'mp3');
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { url, error } = await uploadFile(STORAGE_BUCKETS.PODCASTS, path, mediaFile, { upsert: true });
        
        if (error) {
          throw new Error(`Failed to upload ${formData.mediaType} file`);
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
        thumbnailUrl: formData.mediaType === 'video' ? thumbnailUrl : '', // Only save thumbnail for video
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

  const isVideo = formData.mediaType === 'video';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <button
          onClick={() => navigate('/admin/podcasts')}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
          {isEditing ? 'Edit Podcast' : 'Create New Podcast'}
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
                      Content Type
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMediaTypeChange('audio')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          !isVideo
                            ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                            : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'
                        }`}
                      >
                        <Music size={16} />
                        Audio
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMediaTypeChange('video')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          isVideo
                            ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                            : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'
                        }`}
                      >
                        <Video size={16} />
                        Video
                      </button>
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
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">
                {isVideo ? 'Video Files' : 'Audio File'}
              </h3>
              
              <div className="space-y-4">
                {/* Thumbnail - Only for Video */}
                {isVideo && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Thumbnail Image <span className="text-red-400">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                      {thumbnailPreview && (
                        <div className="relative w-full sm:w-auto">
                          <img 
                            src={thumbnailPreview} 
                            alt="Thumbnail preview" 
                            className="w-full sm:w-40 h-32 sm:h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={clearThumbnail}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      <label className={`w-full sm:flex-1 flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-neon-cyan/50 transition-colors ${
                        errors.thumbnail ? 'border-red-500' : 'border-white/10'
                      }`}>
                        <Image size={20} className="text-slate-400 mb-2 sm:hidden" />
                        <Image size={24} className="text-slate-400 mb-2 hidden sm:block" />
                        <span className="text-xs sm:text-sm text-slate-400 text-center">Click to upload thumbnail</span>
                        <span className="text-[10px] sm:text-xs text-slate-500 mt-1">JPG, PNG, WebP (max 5MB)</span>
                        <input
                          type="file"
                          accept={IMAGE_EXTENSIONS}
                          onChange={handleThumbnailSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {errors.thumbnail && (
                      <p className="mt-1.5 text-sm text-red-400">{errors.thumbnail}</p>
                    )}
                  </div>
                )}

                {/* Media File */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {isVideo ? 'Video' : 'Audio'} File <span className="text-red-400">*</span>
                  </label>
                  
                  {mediaFile ? (
                    <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-800/50 rounded-xl border border-white/10">
                      {isVideo ? <Video size={18} className="text-neon-purple flex-shrink-0" /> : <Music size={18} className="text-neon-cyan flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-white truncate">{mediaFile.name}</p>
                        <p className="text-[10px] sm:text-xs text-slate-400">{(mediaFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={clearMediaFile}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-neon-cyan/50 transition-colors ${
                      errors.media ? 'border-red-500' : 'border-white/10'
                    }`}>
                      {isVideo ? (
                        <Video size={28} className="text-slate-400 mb-2" />
                      ) : (
                        <Music size={28} className="text-slate-400 mb-2" />
                      )}
                      <span className="text-xs sm:text-sm text-slate-400 text-center">
                        Click to upload {isVideo ? 'video' : 'audio'} file
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-500 mt-1 text-center">
                        {isVideo 
                          ? 'MP4, WebM, MOV, AVI, MKV (max 500MB)' 
                          : 'MP3, WAV, OGG, M4A, AAC, FLAC (max 100MB)'}
                      </span>
                      <input
                        type="file"
                        accept={isVideo ? VIDEO_EXTENSIONS : AUDIO_EXTENSIONS}
                        onChange={handleMediaSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                  {errors.media && (
                    <p className="mt-1.5 text-sm text-red-400">{errors.media}</p>
                  )}
                  
                  <p className="mt-2 text-xs text-slate-500">Or enter URL directly:</p>
                  <Input
                    placeholder={isVideo ? 'https://example.com/video.mp4' : 'https://example.com/audio.mp3'}
                    value={formData.mediaUrl}
                    onChange={(e) => handleChange('mediaUrl', e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Pricing */}
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Pricing</h3>
              
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

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isDownloadable}
                      onChange={(e) => handleChange('isDownloadable', e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-slate-800 text-neon-cyan focus:ring-neon-cyan/50"
                    />
                    <span className="text-sm text-slate-300">Allow downloads</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1 ml-7">
                    Free users can download this content. Premium users can always download.
                  </p>
                </div>
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
