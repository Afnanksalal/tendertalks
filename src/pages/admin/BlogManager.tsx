import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Edit, Trash2, Eye, Play, Loader2, 
  FileText, Clock, Star
} from 'lucide-react';
import { useBlogStore } from '../../stores/blogStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export const BlogManager: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const { blogs, fetchBlogs, deleteBlog, publishBlog, isLoading } = useBlogStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      // Force refetch when status filter changes
      fetchBlogs({ status: statusFilter === 'all' ? undefined : statusFilter });
    }
  }, [fetchBlogs, statusFilter, isAdmin]);

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteBlog(deleteModal.id);
      toast.success('Blog deleted');
      setDeleteModal({ open: false, id: null });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishBlog(id);
      toast.success('Blog published!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish');
    }
  };

  const filteredBlogs = blogs.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-slate-500/20 text-slate-400',
      published: 'bg-neon-green/20 text-neon-green',
      archived: 'bg-slate-700/20 text-slate-500',
    };
    return styles[status] || styles.draft;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Blogs</h1>
        <Link to="/admin/blogs/new">
          <Button leftIcon={<Plus size={16} />} className="text-sm sm:text-base">
            <span className="hidden sm:inline">New Blog</span>
            <span className="sm:hidden">New</span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search blogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
          {['all', 'draft', 'published', 'archived'].map((status) => (
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
      ) : filteredBlogs.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-white/5">
          <FileText size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 mb-4">No blogs found</p>
          <Link to="/admin/blogs/new">
            <Button>Create Your First Blog</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {filteredBlogs.map((blog) => (
              <div key={blog.id} className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-neon-cyan/10">
                    {blog.bannerUrl ? (
                      <img src={blog.bannerUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText size={20} className="text-neon-cyan/60" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium truncate">{blog.title}</p>
                      {blog.isFeatured && <Star size={12} className="text-amber-400 flex-shrink-0" fill="currentColor" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(blog.status)}`}>
                        {blog.status}
                      </span>
                      {blog.readTime && (
                        <span className="flex items-center gap-1 text-slate-500 text-xs">
                          <Clock size={10} /> {blog.readTime} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 text-xs">
                    {blog.publishedAt 
                      ? new Date(blog.publishedAt).toLocaleDateString()
                      : new Date(blog.createdAt).toLocaleDateString()
                    }
                  </span>
                  <div className="flex items-center gap-0.5">
                    {blog.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(blog.id)}
                        className="w-9 h-9 flex items-center justify-center text-neon-green hover:bg-neon-green/10 rounded-lg transition-colors touch-feedback"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    <Link to={`/blog/${blog.slug}`} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors touch-feedback">
                      <Eye size={16} />
                    </Link>
                    <Link to={`/admin/blogs/${blog.id}/edit`} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors touch-feedback">
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={() => setDeleteModal({ open: true, id: blog.id })}
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
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Blog</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Read Time</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Views</th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Date</th>
                    <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBlogs.map((blog) => (
                    <tr key={blog.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-neon-cyan/10">
                            {blog.bannerUrl ? (
                              <img src={blog.bannerUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText size={20} className="text-neon-cyan/60" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium truncate max-w-[200px]">{blog.title}</p>
                              {blog.isFeatured && <Star size={12} className="text-amber-400" fill="currentColor" />}
                            </div>
                            <p className="text-slate-500 text-xs truncate max-w-[200px]">{blog.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(blog.status)}`}>
                          {blog.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-400 text-sm flex items-center gap-1">
                          <Clock size={12} />
                          {blog.readTime || 0} min
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-400 text-sm">{blog.viewCount || 0}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-400 text-sm">
                          {blog.publishedAt 
                            ? new Date(blog.publishedAt).toLocaleDateString()
                            : new Date(blog.createdAt).toLocaleDateString()
                          }
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {blog.status === 'draft' && (
                            <button onClick={() => handlePublish(blog.id)} className="p-2 text-neon-green hover:bg-neon-green/10 rounded-lg transition-colors" title="Publish">
                              <Play size={16} />
                            </button>
                          )}
                          <Link to={`/blog/${blog.slug}`} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="View">
                            <Eye size={16} />
                          </Link>
                          <Link to={`/admin/blogs/${blog.id}/edit`} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Edit">
                            <Edit size={16} />
                          </Link>
                          <button onClick={() => setDeleteModal({ open: true, id: blog.id })} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
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
        title="Delete Blog"
        size="sm"
      >
        <p className="text-slate-400 mb-6">
          Are you sure you want to delete this blog? This action cannot be undone.
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
