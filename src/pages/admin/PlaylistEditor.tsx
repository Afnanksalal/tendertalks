import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Upload, Search, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TextArea } from '../../components/ui/TextArea';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { usePodcastStore } from '../../stores/podcastStore';
import { supabase } from '../../lib/supabase';
import type { Podcast } from '../../db/schema';

export const PlaylistEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuthStore();
  const { podcasts, fetchPodcasts } = usePodcastStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '0',
    coverUrl: '',
    podcastIds: [] as string[],
  });

  const fetchPlaylist = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/playlists/${id}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          title: data.title,
          description: data.description || '',
          price: data.price,
          coverUrl: data.coverUrl || '',
          podcastIds: data.podcasts.map((p: Podcast) => p.id),
        });
      }
    } catch {
      toast.error('Failed to fetch playlist details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPodcasts();
    if (id) {
      fetchPlaylist();
    }
  }, [id, fetchPodcasts, fetchPlaylist]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Uploading cover...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('thumbnails').getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, coverUrl: publicUrl }));
      toast.success('Cover uploaded', { id: toastId });
    } catch {
      toast.error('Upload failed', { id: toastId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = id ? `/api/playlists/${id}` : '/api/playlists/create';
      const method = id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save');

      toast.success(id ? 'Playlist updated' : 'Playlist created');
      navigate('/admin/playlists');
    } catch {
      toast.error('Failed to save playlist');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePodcast = (podcastId: string) => {
    setFormData((prev) => {
      const exists = prev.podcastIds.includes(podcastId);
      return {
        ...prev,
        podcastIds: exists
          ? prev.podcastIds.filter((id) => id !== podcastId)
          : [...prev.podcastIds, podcastId],
      };
    });
  };

  const filteredPodcasts = podcasts.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/playlists')}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back
        </Button>
        <h1 className="text-2xl font-display font-bold text-white">
          {id ? 'Edit Playlist' : 'New Playlist'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <TextArea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
              <Input
                label="Price (₹)"
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Cover Image</label>
              <div className="aspect-video bg-slate-800 rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                {formData.coverUrl ? (
                  <>
                    <img
                      src={formData.coverUrl}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => document.getElementById('cover-upload')?.click()}
                      >
                        Change Image
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6">
                    <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 mb-2">Upload cover image</p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => document.getElementById('cover-upload')?.click()}
                    >
                      Select File
                    </Button>
                  </div>
                )}
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Podcast Selection */}
        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Select Podcasts</h2>

          <div className="mb-4">
            <Input
              placeholder="Search podcasts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
            {filteredPodcasts.map((podcast) => {
              const isSelected = formData.podcastIds.includes(podcast.id);
              return (
                <div
                  key={podcast.id}
                  onClick={() => togglePodcast(podcast.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-neon-cyan/10 border-neon-cyan/50'
                      : 'bg-slate-800/50 border-transparent hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-neon-cyan border-neon-cyan' : 'border-slate-600'
                    }`}
                  >
                    {isSelected && <Plus size={14} className="text-black" />}
                  </div>

                  {podcast.thumbnailUrl && (
                    <img
                      src={podcast.thumbnailUrl}
                      alt=""
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  )}

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}
                    >
                      {podcast.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {podcast.duration ? `${Math.floor(podcast.duration / 60)}m` : ''} • ₹
                      {podcast.price}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-sm text-slate-400">
            {formData.podcastIds.length} podcasts selected
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate('/admin/playlists')}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            leftIcon={isSaving ? <Loader2 className="animate-spin" /> : <Save />}
          >
            {isSaving ? 'Saving...' : 'Save Playlist'}
          </Button>
        </div>
      </form>
    </div>
  );
};
