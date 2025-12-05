import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Tag,
  FolderOpen,
  Plus,
  X,
  Trash2,
  Loader2,
  Edit2,
  Save,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  ShoppingBag,
  FileText,
  CreditCard,
  Download,
  Mail,
  Wrench,
  ListMusic,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}
interface TagItem {
  id: string;
  name: string;
  slug: string;
}
interface DeleteModal {
  open: boolean;
  type: 'category' | 'tag';
  id: string | null;
  name: string;
}
interface FeatureToggle {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export default function SettingsManager() {
  const { user, getAuthHeaders } = useAuthStore();
  const { refreshSettings } = useSettingsStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newTag, setNewTag] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatData, setEditCatData] = useState({ name: '', description: '' });
  const [deleteModal, setDeleteModal] = useState<DeleteModal>({
    open: false,
    type: 'category',
    id: null,
    name: '',
  });
  const [features, setFeatures] = useState<FeatureToggle[]>([]);
  const [savingFeature, setSavingFeature] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const [catRes, tagRes, settingsRes] = await Promise.all([
        fetch(`/api/admin/categories`, { headers: getAuthHeaders() }),
        fetch(`/api/admin/tags`, { headers: getAuthHeaders() }),
        fetch(`/api/admin/settings`, { headers: getAuthHeaders() }),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (tagRes.ok) setTags(await tagRes.json());

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setFeatures([
          {
            key: 'feature_blog',
            label: 'Blog',
            description: 'Enable blog section for articles and posts',
            icon: <FileText size={18} />,
            enabled: settings.feature_blog?.value === 'true',
          },
          {
            key: 'feature_merch',
            label: 'Merchandise Store',
            description: 'Enable merchandise store for selling products',
            icon: <ShoppingBag size={18} />,
            enabled: settings.feature_merch?.value === 'true',
          },
          {
            key: 'feature_subscriptions',
            label: 'Subscriptions',
            description: 'Enable subscription plans and premium content',
            icon: <CreditCard size={18} />,
            enabled: settings.feature_subscriptions?.value === 'true',
          },
          {
            key: 'feature_downloads',
            label: 'Downloads',
            description: 'Allow users to download podcast episodes',
            icon: <Download size={18} />,
            enabled: settings.feature_downloads?.value === 'true',
          },
          {
            key: 'feature_playlists',
            label: 'Playlists',
            description: 'Enable curated podcast playlists',
            icon: <ListMusic size={18} />,
            enabled: settings.feature_playlists?.value === 'true',
          },
          {
            key: 'feature_newsletter',
            label: 'Newsletter',
            description: 'Enable newsletter signup form',
            icon: <Mail size={18} />,
            enabled: settings.feature_newsletter?.value === 'true',
          },
          {
            key: 'maintenance_mode',
            label: 'Maintenance Mode',
            description: 'Show maintenance page to non-admin users',
            icon: <Wrench size={18} />,
            enabled: settings.maintenance_mode?.value === 'true',
          },
        ]);
      }
    } catch {
      /* Settings fetch failed silently */
    }
    setLoading(false);
  };

  const toggleFeature = async (key: string, currentValue: boolean) => {
    if (!user?.id) return;
    setSavingFeature(key);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ key, value: (!currentValue).toString() }),
      });

      if (res.ok) {
        setFeatures((prev) =>
          prev.map((f) => (f.key === key ? { ...f, enabled: !currentValue } : f))
        );
        // Refresh global settings store so navbar/footer update immediately
        await refreshSettings();
        toast.success(`Feature ${!currentValue ? 'enabled' : 'disabled'}`);
      } else {
        toast.error('Failed to update setting');
      }
    } catch {
      toast.error('Failed to update setting');
    }
    setSavingFeature(null);
  };

  const addCategory = async () => {
    if (!user?.id || !newCategory.name) return;
    const res = await fetch(`/api/admin/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(newCategory),
    });
    if (res.ok) {
      setNewCategory({ name: '', description: '' });
      fetchData();
    }
  };

  const updateCategory = async (id: string) => {
    if (!user?.id) return;
    await fetch(`/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(editCatData),
    });
    setEditingCat(null);
    fetchData();
  };

  const deleteCategory = async () => {
    if (!user?.id || !deleteModal.id) return;
    const res = await fetch(`/api/admin/categories/${deleteModal.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || 'Failed to delete');
    }
    setDeleteModal({ open: false, type: 'category', id: null, name: '' });
    fetchData();
  };

  const addTag = async () => {
    if (!user?.id || !newTag) return;
    const res = await fetch(`/api/admin/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ name: newTag }),
    });
    if (res.ok) {
      setNewTag('');
      fetchData();
    }
  };

  const deleteTag = async () => {
    if (!user?.id || !deleteModal.id) return;
    await fetch(`/api/admin/tags?id=${deleteModal.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    setDeleteModal({ open: false, type: 'tag', id: null, name: '' });
    fetchData();
  };

  const startEditCat = (cat: Category) => {
    setEditingCat(cat.id);
    setEditCatData({ name: cat.name, description: cat.description || '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
        <Settings className="text-neon-purple" /> Platform Settings
      </h1>

      {/* Feature Toggles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5"
      >
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-4">
          <ToggleRight size={18} className="text-neon-cyan" /> Feature Toggles
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          Enable or disable features across the platform. Changes take effect immediately.
        </p>

        <div className="grid gap-3">
          {features.map((feature) => (
            <div
              key={feature.key}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                feature.enabled
                  ? 'bg-neon-cyan/5 border-neon-cyan/20'
                  : 'bg-slate-800/50 border-white/5'
              } ${feature.key === 'maintenance_mode' && feature.enabled ? 'bg-amber-500/10 border-amber-500/30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    feature.enabled
                      ? feature.key === 'maintenance_mode'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-neon-cyan/20 text-neon-cyan'
                      : 'bg-slate-700/50 text-slate-400'
                  }`}
                >
                  {feature.icon}
                </div>
                <div>
                  <p className="text-white font-medium">{feature.label}</p>
                  <p className="text-slate-500 text-xs">{feature.description}</p>
                </div>
              </div>

              <button
                onClick={() => toggleFeature(feature.key, feature.enabled)}
                disabled={savingFeature === feature.key}
                className="relative flex-shrink-0"
              >
                {savingFeature === feature.key ? (
                  <Loader2 size={24} className="animate-spin text-neon-cyan" />
                ) : feature.enabled ? (
                  <ToggleRight
                    size={32}
                    className={
                      feature.key === 'maintenance_mode' ? 'text-amber-400' : 'text-neon-cyan'
                    }
                  />
                ) : (
                  <ToggleLeft size={32} className="text-slate-500" />
                )}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5"
        >
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-3 sm:mb-4">
            <FolderOpen size={16} className="text-neon-cyan" /> Categories
          </h2>

          <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-slate-800/50 border border-white/10 rounded-lg p-3">
                {editingCat === cat.id ? (
                  <div className="space-y-2">
                    <input
                      value={editCatData.name}
                      onChange={(e) => setEditCatData({ ...editCatData, name: e.target.value })}
                      className="w-full bg-slate-700/50 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-neon-cyan/50 focus:outline-none"
                    />
                    <input
                      value={editCatData.description}
                      onChange={(e) =>
                        setEditCatData({ ...editCatData, description: e.target.value })
                      }
                      placeholder="Description"
                      className="w-full bg-slate-700/50 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-neon-cyan/50 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateCategory(cat.id)}
                        className="flex items-center gap-1"
                      >
                        <Save size={12} /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCat(null)}>
                        <X size={12} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{cat.name}</p>
                      <p className="text-slate-500 text-xs">{cat.description || cat.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditCat(cat)}
                        className="p-1.5 text-slate-400 hover:text-neon-cyan transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteModal({
                            open: true,
                            type: 'category',
                            id: cat.id,
                            name: cat.name,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors touch-feedback"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">No categories yet</p>
            )}
          </div>

          <div className="border-t border-white/10 pt-4 space-y-2">
            <input
              placeholder="Category name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:border-neon-cyan/50 focus:outline-none"
            />
            <input
              placeholder="Description (optional)"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:border-neon-cyan/50 focus:outline-none"
            />
            <Button
              onClick={addCategory}
              className="w-full flex items-center justify-center gap-1"
              size="sm"
            >
              <Plus size={14} /> Add Category
            </Button>
          </div>
        </motion.div>

        {/* Tags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5"
        >
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-3 sm:mb-4">
            <Tag size={16} className="text-neon-purple" /> Tags
          </h2>

          <div className="flex flex-wrap gap-2 mb-4 min-h-[100px] max-h-[200px] overflow-y-auto">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="bg-slate-800 border border-white/10 px-3 py-1.5 rounded-full text-sm text-slate-300 flex items-center gap-2 group"
              >
                #{tag.name}
                <button
                  onClick={() =>
                    setDeleteModal({ open: true, type: 'tag', id: tag.id, name: tag.name })
                  }
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
            {tags.length === 0 && <p className="text-slate-500 text-sm">No tags yet</p>}
          </div>

          <div className="border-t border-white/10 pt-4 flex gap-2">
            <input
              placeholder="New tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              className="flex-1 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:border-neon-cyan/50 focus:outline-none"
            />
            <Button onClick={addTag} size="sm">
              <Plus size={14} />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Platform Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5"
      >
        <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Platform Info</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: 'Categories', value: categories.length, color: 'text-neon-cyan' },
            { label: 'Tags', value: tags.length, color: 'text-neon-purple' },
            { label: 'Environment', value: import.meta.env.MODE, color: 'text-neon-green' },
            {
              label: 'API',
              value: import.meta.env.VITE_APP_URL || 'localhost',
              color: 'text-slate-400',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-slate-800/50 border border-white/10 rounded-lg p-2 sm:p-3"
            >
              <p className="text-slate-400 text-[10px] sm:text-xs mb-0.5 sm:mb-1">{item.label}</p>
              <p className={`font-bold text-sm sm:text-base truncate ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, type: 'category', id: null, name: '' })}
        title={`Delete ${deleteModal.type === 'category' ? 'Category' : 'Tag'}`}
        size="sm"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-white font-medium mb-1">Delete "{deleteModal.name}"?</p>
            <p className="text-slate-400 text-sm">
              {deleteModal.type === 'category'
                ? 'This will remove the category. Podcasts using it will be unaffected.'
                : 'This will remove the tag from all podcasts and blogs.'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setDeleteModal({ open: false, type: 'category', id: null, name: '' })}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={deleteModal.type === 'category' ? deleteCategory : deleteTag}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
