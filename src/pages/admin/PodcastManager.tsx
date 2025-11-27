import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Edit, Trash2, 
  Eye, Play, Loader2, Video, Music, Clock
} from 'lucide-react';
import { usePodcastStore } from '../../stores/podcastStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export const PodcastManager: React.FC = () => {
  const { podcasts, fetchPodcasts, deletePodcast, publishPodcast, isLoading } = usePodcastStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchPodcasts({ status: statusFilter === 'all' ? undefined : statusFilter });
  }, [fetchPodcasts, statusFilter]);

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deletePodcast(deleteModal.id);
      toast.success('Podcast deleted');
      setDeleteModal({ open: false, id: null });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishPodcast(id);
      toast.success('Podcast published!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish');
    }
  };

  const filteredPodcasts = podcasts.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-slate-500/20 text-slate-400',
      scheduled: 'bg-amber-500/20 text-amber-400',
      live: 'bg-red-500/20 text-red-400',
      published: 'bg-neon-green/20 text-neon-green',
      archived: 'bg-slate-700/20 text-slate-500',
    };
    return styles[status] || styles.draft;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Podcasts</h1>
        <Link to="/admin/podcasts/new">
          <Button leftIcon={<Plus size={16} />} className="text-sm sm:text-base">
            <span className="hidden sm:inline">New Podcast</span>
            <span className="sm:hidden">New</span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search podcasts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
          {['all', 'draft', 'published', 'scheduled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                statusFilter === status
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
        </div>
      ) : filteredPodcasts.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-white/5">
          <p className="text-slate-400 mb-4">No podcasts found</p>
          <Link to="/admin/podcasts/new">
            <Button>Create Your First Podcast</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {filteredPodcasts.map((podcast) => (
              <div key={podcast.id} className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 ${
                    podcast.mediaType === 'video' ? 'bg-neon-purple/10' : 'bg-neon-cyan/10'
                  }`}>
                    {podcast.thumbnailUrl ? (
                      <img src={podcast.thumbnailUrl} alt="" className="w-full h-full object-cover" />
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
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{podcast.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {podcast.mediaType === 'video' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-neon-purple/10 text-neon-purple text-xs">
                          <Video size={10} /> Video
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan text-xs">
                          <Music size={10} /> Audio
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(podcast.status)}`}>
                        {podcast.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-slate-400">
                    <span className={podcast.isFree ? 'text-neon-green' : 'text-white'}>
                      {podcast.isFree ? 'Free' : `₹${parseFloat(podcast.price || '0').toFixed(0)}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {podcast.duration 
                        ? `${Math.floor(podcast.duration / 60)}:${(podcast.duration % 60).toString().padStart(2, '0')}`
                        : '--:--'
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {podcast.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(podcast.id)}
                        className="w-9 h-9 flex items-center justify-center text-neon-green hover:bg-neon-green/10 rounded-lg transition-colors touch-feedback"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    <Link to={`/podcast/${podcast.slug}`} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors touch-feedback">
                      <Eye size={16} />
                    </Link>
                    <Link to={`/admin/podcasts/${podcast.id}/edit`} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors touch-feedback">
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={() => setDeleteModal({ open: true, id: podcast.id })}
                      className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors touch-feedback"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-slate-900/30 rounded-xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Podcast</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Price</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Duration</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Created</th>
                    <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPodcasts.map((podcast) => (
                    <tr key={podcast.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ${
                            podcast.mediaType === 'video' ? 'bg-neon-purple/10' : 'bg-neon-cyan/10'
                          }`}>
                            {podcast.thumbnailUrl ? (
                              <img src={podcast.thumbnailUrl} alt="" className="w-full h-full object-cover" />
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
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate max-w-[200px]">{podcast.title}</p>
                            <p className="text-slate-500 text-xs truncate max-w-[200px]">{podcast.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {podcast.mediaType === 'video' ? (
                          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neon-purple/10 text-neon-purple text-xs font-medium">
                            <Video size={12} /> Video
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neon-cyan/10 text-neon-cyan text-xs font-medium">
                            <Music size={12} /> Audio
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(podcast.status)}`}>
                          {podcast.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-sm ${podcast.isFree ? 'text-neon-green' : 'text-white'}`}>
                          {podcast.isFree ? 'Free' : `₹${parseFloat(podcast.price || '0').toFixed(0)}`}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-400 text-sm flex items-center gap-1">
                          <Clock size={12} />
                          {podcast.duration 
                            ? `${Math.floor(podcast.duration / 60)}:${(podcast.duration % 60).toString().padStart(2, '0')}`
                            : '--:--'
                          }
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-400 text-sm">
                          {new Date(podcast.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {podcast.status === 'draft' && (
                            <button onClick={() => handlePublish(podcast.id)} className="p-2 text-neon-green hover:bg-neon-green/10 rounded-lg transition-colors" title="Publish">
                              <Play size={16} />
                            </button>
                          )}
                          <Link to={`/podcast/${podcast.slug}`} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="View">
                            <Eye size={16} />
                          </Link>
                          <Link to={`/admin/podcasts/${podcast.id}/edit`} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Edit">
                            <Edit size={16} />
                          </Link>
                          <button onClick={() => setDeleteModal({ open: true, id: podcast.id })} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        title="Delete Podcast"
        size="sm"
      >
        <p className="text-slate-400 mb-6">
          Are you sure you want to delete this podcast? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteModal({ open: false, id: null })}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};
