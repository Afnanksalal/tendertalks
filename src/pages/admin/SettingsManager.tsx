import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Tag, FolderOpen, Plus, X, Trash2, Loader2, Edit2, Save, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

interface Category { id: string; name: string; slug: string; description: string; }
interface TagItem { id: string; name: string; slug: string; }
interface DeleteModal { open: boolean; type: 'category' | 'tag'; id: string | null; name: string; }

export default function SettingsManager() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newTag, setNewTag] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatData, setEditCatData] = useState({ name: '', description: '' });
  const [deleteModal, setDeleteModal] = useState<DeleteModal>({ open: false, type: 'category', id: null, name: '' });

  useEffect(() => { fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const [catRes, tagRes] = await Promise.all([
        fetch(`/api/admin/categories`, { headers: { 'X-User-Id': user.id } }),
        fetch(`/api/admin/tags`, { headers: { 'X-User-Id': user.id } }),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (tagRes.ok) setTags(await tagRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addCategory = async () => {
    if (!user?.id || !newCategory.name) return;
    const res = await fetch(`/api/admin/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
      body: JSON.stringify(newCategory),
    });
    if (res.ok) { setNewCategory({ name: '', description: '' }); fetchData(); }
  };

  const updateCategory = async (id: string) => {
    if (!user?.id) return;
    await fetch(`/api/admin/categories/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
      body: JSON.stringify(editCatData),
    });
    setEditingCat(null);
    fetchData();
  };

  const deleteCategory = async () => {
    if (!user?.id || !deleteModal.id) return;
    const res = await fetch(`/api/admin/categories/${deleteModal.id}`, { method: 'DELETE', headers: { 'X-User-Id': user.id } });
    if (!res.ok) { const data = await res.json(); alert(data.error || 'Failed to delete'); }
    setDeleteModal({ open: false, type: 'category', id: null, name: '' });
    fetchData();
  };

  const addTag = async () => {
    if (!user?.id || !newTag) return;
    const res = await fetch(`/api/admin/tags`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
      body: JSON.stringify({ name: newTag }),
    });
    if (res.ok) { setNewTag(''); fetchData(); }
  };

  const deleteTag = async () => {
    if (!user?.id || !deleteModal.id) return;
    await fetch(`/api/admin/tags?id=${deleteModal.id}`, { method: 'DELETE', headers: { 'X-User-Id': user.id } });
    setDeleteModal({ open: false, type: 'tag', id: null, name: '' });
    fetchData();
  };

  const startEditCat = (cat: Category) => {
    setEditingCat(cat.id);
    setEditCatData({ name: cat.name, description: cat.description || '' });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-neon-cyan animate-spin" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3 mb-6">
        <Settings className="text-neon-purple" /> Platform Settings
      </h1>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {/* Categories */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-3 sm:mb-4">
            <FolderOpen size={16} className="text-neon-cyan" /> Categories
          </h2>
          
          <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
            {categories.map(cat => (
              <div key={cat.id} className="bg-slate-800/50 border border-white/10 rounded-lg p-3">
                {editingCat === cat.id ? (
                  <div className="space-y-2">
                    <input value={editCatData.name} onChange={e => setEditCatData({...editCatData, name: e.target.value})} 
                      className="w-full bg-slate-700/50 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-neon-cyan/50 focus:outline-none" />
                    <input value={editCatData.description} onChange={e => setEditCatData({...editCatData, description: e.target.value})} placeholder="Description"
                      className="w-full bg-slate-700/50 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-neon-cyan/50 focus:outline-none" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateCategory(cat.id)} className="flex items-center gap-1"><Save size={12} /> Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCat(null)}><X size={12} /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{cat.name}</p>
                      <p className="text-slate-500 text-xs">{cat.description || cat.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEditCat(cat)} className="p-1.5 text-slate-400 hover:text-neon-cyan transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteModal({ open: true, type: 'category', id: cat.id, name: cat.name })} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors touch-feedback"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {categories.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No categories yet</p>}
          </div>

          <div className="border-t border-white/10 pt-4 space-y-2">
            <input placeholder="Category name" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} 
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:border-neon-cyan/50 focus:outline-none" />
            <input placeholder="Description (optional)" value={newCategory.description} onChange={e => setNewCategory({...newCategory, description: e.target.value})} 
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:border-neon-cyan/50 focus:outline-none" />
            <Button onClick={addCategory} className="w-full flex items-center justify-center gap-1" size="sm">
              <Plus size={14} /> Add Category
            </Button>
          </div>
        </motion.div>

        {/* Tags */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-3 sm:mb-4">
            <Tag size={16} className="text-neon-purple" /> Tags
          </h2>
          
          <div className="flex flex-wrap gap-2 mb-4 min-h-[100px]">
            {tags.map(tag => (
              <span key={tag.id} className="bg-slate-800 border border-white/10 px-3 py-1.5 rounded-full text-sm text-slate-300 flex items-center gap-2 group">
                {tag.name}
                <button onClick={() => setDeleteModal({ open: true, type: 'tag', id: tag.id, name: tag.name })} className="text-slate-500 hover:text-red-400 transition-colors">&times;</button>
              </span>
            ))}
            {tags.length === 0 && <p className="text-slate-500 text-sm">No tags yet</p>}
          </div>

          <div className="border-t border-white/10 pt-4 flex gap-2">
            <input placeholder="New tag" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyPress={e => e.key === 'Enter' && addTag()}
              className="flex-1 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:border-neon-cyan/50 focus:outline-none" />
            <Button onClick={addTag} size="sm"><Plus size={14} /></Button>
          </div>
        </motion.div>
      </div>

      {/* Platform Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5 mt-4 sm:mt-6">
        <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Platform Info</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: 'Categories', value: categories.length, color: 'text-neon-cyan' },
            { label: 'Tags', value: tags.length, color: 'text-neon-purple' },
            { label: 'Environment', value: import.meta.env.MODE, color: 'text-neon-green' },
            { label: 'API', value: import.meta.env.VITE_APP_URL || 'localhost', color: 'text-slate-400' },
          ].map(item => (
            <div key={item.label} className="bg-slate-800/50 border border-white/10 rounded-lg p-2 sm:p-3">
              <p className="text-slate-400 text-[10px] sm:text-xs mb-0.5 sm:mb-1">{item.label}</p>
              <p className={`font-bold text-sm sm:text-base truncate ${item.color}`}>{item.value}</p>
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
                : 'This will remove the tag from all podcasts.'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setDeleteModal({ open: false, type: 'category', id: null, name: '' })} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteModal.type === 'category' ? deleteCategory : deleteTag} className="flex-1">
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
