import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Loader2, ListMusic } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import type { Playlist } from '../../db/schema';

export const PlaylistManager: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const { getAuthHeaders } = useAuthStore();

  const fetchPlaylists = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/playlists');
      if (response.ok) {
        setPlaylists(await response.json());
      }
    } catch {
      toast.error('Failed to fetch playlists');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const response = await fetch(`/api/playlists/${deleteModal.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete');

      setPlaylists(playlists.filter((p) => p.id !== deleteModal.id));
      toast.success('Playlist deleted');
      setDeleteModal({ open: false, id: null });
    } catch {
      toast.error('Failed to delete playlist');
    }
  };

  const filteredPlaylists = playlists.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-display font-bold text-white">Playlists</h1>
        <Link to="/admin/playlists/new">
          <Button leftIcon={<Plus size={16} />}>New Playlist</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Input
          placeholder="Search playlists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={18} />}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-white/5">
          <p className="text-slate-400 mb-4">No playlists found</p>
          <Link to="/admin/playlists/new">
            <Button>Create Your First Playlist</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-slate-900/30 rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">
                    Playlist
                  </th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">
                    Price
                  </th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">
                    Created
                  </th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPlaylists.map((playlist) => (
                  <tr key={playlist.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-neon-purple/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {playlist.coverUrl ? (
                            <img
                              src={playlist.coverUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ListMusic size={20} className="text-neon-purple/60" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate max-w-[200px]">
                            {playlist.title}
                          </p>
                          <p className="text-slate-500 text-xs truncate max-w-[200px]">
                            {playlist.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-white text-sm">
                        ₹{parseFloat(playlist.price).toFixed(0)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-slate-400 text-sm">
                        {new Date(playlist.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/playlists/${playlist.id}`}
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          to={`/admin/playlists/${playlist.id}/edit`}
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ open: true, id: playlist.id })}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
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
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        title="Delete Playlist"
        size="sm"
      >
        <p className="text-slate-400 mb-6">
          Are you sure you want to delete this playlist? This action cannot be undone.
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
