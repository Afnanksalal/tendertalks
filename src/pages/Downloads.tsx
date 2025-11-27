import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Play, Clock, Loader2, HardDrive, Music, Video, Check } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';

interface DownloadablePodcast {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  duration: number | null;
  mediaType: 'audio' | 'video';
  isDownloadable: boolean;
  isFree: boolean;
}

export const DownloadsPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuthStore();
  const { subscription, hasActiveSubscription, purchases, fetchPurchases, fetchSubscription } = useUserStore();
  const [downloadableContent, setDownloadableContent] = useState<DownloadablePodcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchPurchases();
      fetchSubscription();
      fetchDownloadableContent();
    }
  }, [user]);

  const fetchDownloadableContent = async () => {
    if (!user) return;
    try {
      // Fetch all podcasts user has access to that are downloadable
      const response = await fetch('/api/users/downloadable', {
        headers: { 'X-User-Id': user.id },
      });
      if (response.ok) {
        const data = await response.json();
        setDownloadableContent(data);
      }
    } catch (error) {
      console.error('Failed to fetch downloadable content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (podcast: DownloadablePodcast) => {
    if (!user) return;
    
    setDownloadingId(podcast.id);

    try {
      const response = await fetch(`/api/podcasts/${podcast.slug}/download`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download failed');
      }

      const { url } = await response.json();
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${podcast.title}.${podcast.mediaType === 'video' ? 'mp4' : 'mp3'}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Mark as downloaded in this session
      setDownloadedIds(prev => new Set(prev).add(podcast.id));
      toast.success('Download started!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  // Check if user can download based on subscription OR individual podcast settings
  const planAllowsDownloads = hasActiveSubscription() && subscription?.plan?.allowDownloads;

  return (
    <div className="min-h-screen bg-[#030014] pt-28 md:pt-36 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white mb-1">
                Downloadable Content
              </h1>
              <p className="text-slate-400 text-sm sm:text-base">
                Download podcasts to enjoy offline
              </p>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <HardDrive size={18} />
              <span className="text-sm">{downloadableContent.length} available</span>
            </div>
          </div>

          {/* Plan Info */}
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
            planAllowsDownloads 
              ? 'bg-neon-green/10 border border-neon-green/30' 
              : 'bg-slate-900/50 border border-white/10'
          }`}>
            <Download className={`w-5 h-5 flex-shrink-0 mt-0.5 ${planAllowsDownloads ? 'text-neon-green' : 'text-slate-400'}`} />
            <div>
              <p className={`font-medium ${planAllowsDownloads ? 'text-neon-green' : 'text-white'}`}>
                {planAllowsDownloads ? 'Downloads Enabled' : 'Free Plan'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {planAllowsDownloads 
                  ? 'You can download all premium content for offline access.'
                  : 'You can download content marked as downloadable. Upgrade for unlimited downloads.'}
              </p>
              {!planAllowsDownloads && (
                <Link to="/pricing" className="text-sm text-neon-cyan hover:underline mt-2 inline-block">
                  Upgrade for unlimited downloads →
                </Link>
              )}
            </div>
          </div>

          {/* Content List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
            </div>
          ) : downloadableContent.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/30 border border-white/5 rounded-2xl">
              <Download className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No downloadable content</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                {planAllowsDownloads 
                  ? "You haven't purchased any content yet. Browse our collection to find something you like."
                  : "Browse our collection to find downloadable content, or upgrade your plan for unlimited downloads."}
              </p>
              <Link to="/browse">
                <Button variant="outline">Browse Content</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {downloadableContent.map((podcast) => (
                <motion.div
                  key={podcast.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/50 border border-white/10 rounded-xl hover:border-white/20 transition-colors group"
                >
                  <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                    {/* Thumbnail */}
                    <Link to={`/podcast/${podcast.slug}`} className="flex-shrink-0">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden ${
                        podcast.mediaType === 'video' ? 'bg-neon-purple/10' : 'bg-neon-cyan/10'
                      }`}>
                        {podcast.thumbnailUrl ? (
                          <img
                            src={podcast.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {podcast.mediaType === 'video' ? (
                              <Video size={20} className="text-neon-purple/60" />
                            ) : (
                              <Music size={20} className="text-neon-cyan/60" />
                            )}
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/podcast/${podcast.slug}`}>
                        <h3 className="text-white font-medium truncate group-hover:text-neon-cyan transition-colors text-sm sm:text-base">
                          {podcast.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={12} />
                          {formatDuration(podcast.duration)}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          podcast.mediaType === 'video' 
                            ? 'bg-neon-purple/20 text-neon-purple' 
                            : 'bg-neon-cyan/20 text-neon-cyan'
                        }`}>
                          {podcast.mediaType.toUpperCase()}
                        </span>
                        {podcast.isFree && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neon-green/20 text-neon-green">
                            FREE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Download Button */}
                    <button
                      onClick={() => handleDownload(podcast)}
                      disabled={downloadingId === podcast.id}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all touch-feedback disabled:opacity-50 flex-shrink-0 ${
                        downloadedIds.has(podcast.id)
                          ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                          : 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30'
                      }`}
                    >
                      {downloadingId === podcast.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : downloadedIds.has(podcast.id) ? (
                        <>
                          <Check size={16} />
                          <span className="hidden sm:inline">Downloaded</span>
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          <span className="hidden sm:inline">Download</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Help Text */}
          <div className="mt-8 p-4 bg-slate-900/30 border border-white/5 rounded-xl">
            <p className="text-slate-500 text-sm">
              <strong className="text-slate-400">Note:</strong> Downloaded files are saved to your device's default download location. 
              You can play them using any media player app.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
