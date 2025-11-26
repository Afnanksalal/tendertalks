import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Play, Clock, Trash2, Loader2, HardDrive, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';

interface DownloadItem {
  id: string;
  podcast: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
    duration: number | null;
    mediaType: 'audio' | 'video';
  };
  downloadedAt: string;
  expiresAt: string | null;
}

export const DownloadsPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuthStore();
  const { subscription, hasActiveSubscription } = useUserStore();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDownloads();
    }
  }, [user]);

  const fetchDownloads = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/users/downloads', {
        headers: { 'X-User-Id': user.id },
      });
      if (response.ok) {
        const data = await response.json();
        setDownloads(data);
      }
    } catch (error) {
      console.error('Failed to fetch downloads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (item: DownloadItem) => {
    if (!hasActiveSubscription() && !subscription?.plan?.allowDownloads) {
      toast.error('Upgrade your plan to download content');
      return;
    }

    setDownloadingId(item.podcast.id);

    if (!user) return;
    
    try {
      const response = await fetch(`/api/podcasts/${item.podcast.slug}/download`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Download failed');
      }

      const { url } = await response.json();
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${item.podcast.title}.${item.podcast.mediaType === 'video' ? 'mp4' : 'mp3'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started!');
      fetchDownloads();
    } catch (error: any) {
      toast.error(error.message || 'Failed to download');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRemoveDownload = async (downloadId: string) => {
    if (!user) return;
    try {
      await fetch(`/api/users/downloads/${downloadId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': user.id },
      });
      setDownloads(downloads.filter(d => d.id !== downloadId));
      toast.success('Removed from downloads');
    } catch (error) {
      toast.error('Failed to remove download');
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const canDownload = hasActiveSubscription() && subscription?.plan?.allowDownloads;

  return (
    <div className="min-h-screen bg-[#030014] pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                Downloads
              </h1>
              <p className="text-slate-400">Access your downloaded content offline</p>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <HardDrive size={18} />
              <span className="text-sm">{downloads.length} items</span>
            </div>
          </div>

          {/* Subscription Notice */}
          {!canDownload && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-400 font-medium">Downloads not available</p>
                <p className="text-sm text-slate-400 mt-1">
                  Upgrade to a Pro or Premium plan to download content for offline access.
                </p>
                <Link to="/pricing" className="text-sm text-neon-cyan hover:underline mt-2 inline-block">
                  View Plans →
                </Link>
              </div>
            </motion.div>
          )}

          {/* Downloads List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
            </div>
          ) : downloads.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/30 border border-white/5 rounded-2xl">
              <Download className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No downloads yet</h3>
              <p className="text-slate-400 mb-6">
                Download podcasts to listen offline
              </p>
              <Link to="/browse">
                <Button variant="outline">Browse Content</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {downloads.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 bg-slate-900/50 border border-white/10 rounded-xl hover:border-white/20 transition-colors group"
                >
                  {/* Thumbnail */}
                  <Link to={`/podcast/${item.podcast.slug}`} className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800">
                      {item.podcast.thumbnailUrl ? (
                        <img
                          src={item.podcast.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play size={20} className="text-slate-600" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/podcast/${item.podcast.slug}`}>
                      <h3 className="text-white font-medium truncate group-hover:text-neon-cyan transition-colors">
                        {item.podcast.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDuration(item.podcast.duration)}
                      </span>
                      <span>
                        Downloaded {new Date(item.downloadedAt).toLocaleDateString()}
                      </span>
                      {item.expiresAt && (
                        <span className="text-amber-400">
                          Expires {new Date(item.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(item)}
                      disabled={downloadingId === item.podcast.id}
                      className="p-2 text-slate-400 hover:text-neon-cyan hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                      title="Re-download"
                    >
                      {downloadingId === item.podcast.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Download size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveDownload(item.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
