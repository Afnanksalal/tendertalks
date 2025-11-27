import { useState, useEffect } from 'react';
import { Settings, Tag, FolderOpen, Save, Plus, X, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface Category { id: string; name: string; slug: string; description: string; }
interface TagItem { id: string; name: string; slug: string; }

const API_URL = import.meta.env.VITE_APP_URL || '';

export default function SettingsManager() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newTag, setNewTag] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/categories`, { headers: { 'X-User-Id': user?.id || '' } }),
        fetch(`${API_URL}/api/admin/tags`, { headers: { 'X-User-Id': user?.id || '' } }),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (tagRes.ok) setTags(await tagRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addCategory = async () => {
    if (!newCategory.name) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': user?.id || '' },
        body: JSON.stringify(newCategory),
      });
      if (res.ok) {
        setNewCategory({ name: '', description: '' });
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    try {
      await fetch(`${API_URL}/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': user?.id || '' },
        body: JSON.stringify(data),
      });
      setEditingCat(null);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/categories/${id}`, {
        method: 'DELETE', headers: { 'X-User-Id': user?.id || '' },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
      fetchData();
    } catch (e) { console.error(e); }
  };

  const addTag = async () => {
    if (!newTag) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': user?.id || '' },
        body: JSON.stringify({ name: newTag }),
      });
      if (res.ok) {
        setNewTag('');
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  const deleteTag = async (id: string) => {
    if (!confirm('Delete this tag?')) return;
    try {
      await fetch(`${API_URL}/api/admin/tags?id=${id}`, {
        method: 'DELETE', headers: { 'X-User-Id': user?.id || '' },
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6"><Settings /> Platform Settings</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><FolderOpen size={20} /> Categories</h2>
          
          <div className="space-y-2 mb-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-gray-700 rounded p-3">
                {editingCat === cat.id ? (
                  <div className="space-y-2">
                    <input defaultValue={cat.name} id={`cat-name-${cat.id}`} className="input w-full text-sm" />
                    <input defaultValue={cat.description} id={`cat-desc-${cat.id}`} className="input w-full text-sm" placeholder="Description" />
                    <div className="flex gap-2">
                      <button onClick={() => {
                        const name = (document.getElementById(`cat-name-${cat.id}`) as HTMLInputElement).value;
                        const description = (document.getElementById(`cat-desc-${cat.id}`) as HTMLInputElement).value;
                        updateCategory(cat.id, { name, description });
                      }} className="btn-primary text-xs flex items-center gap-1"><Save size={12} /> Save</button>
                      <button onClick={() => setEditingCat(null)} className="btn-secondary text-xs"><X size={12} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{cat.name}</div>
                      <div className="text-xs text-gray-400">{cat.description || cat.slug}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingCat(cat.id)} className="p-1 hover:text-blue-400">✏️</button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-1 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-700 pt-4">
            <input placeholder="Category name" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="input w-full mb-2 text-sm" />
            <input placeholder="Description (optional)" value={newCategory.description} onChange={e => setNewCategory({...newCategory, description: e.target.value})} className="input w-full mb-2 text-sm" />
            <button onClick={addCategory} className="btn-primary w-full text-sm flex items-center justify-center gap-1"><Plus size={14} /> Add Category</button>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><Tag size={20} /> Tags</h2>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map(tag => (
              <span key={tag.id} className="bg-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {tag.name}
                <button onClick={() => deleteTag(tag.id)} className="hover:text-red-400">&times;</button>
              </span>
            ))}
            {tags.length === 0 && <p className="text-gray-400 text-sm">No tags yet</p>}
          </div>

          <div className="border-t border-gray-700 pt-4 flex gap-2">
            <input placeholder="New tag" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyPress={e => e.key === 'Enter' && addTag()} className="input flex-1 text-sm" />
            <button onClick={addTag} className="btn-primary text-sm"><Plus size={14} /></button>
          </div>
        </div>
      </div>

      {/* Platform Info */}
      <div className="bg-gray-800 rounded-lg p-4 mt-6">
        <h2 className="text-lg font-semibold mb-4">Platform Info</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400">Categories</div>
            <div className="text-2xl font-bold">{categories.length}</div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400">Tags</div>
            <div className="text-2xl font-bold">{tags.length}</div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400">Environment</div>
            <div className="text-lg font-medium">{import.meta.env.MODE}</div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400">API URL</div>
            <div className="text-xs truncate">{API_URL || 'localhost'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
