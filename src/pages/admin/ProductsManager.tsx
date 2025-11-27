import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Package, Save, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';

interface MerchItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string | null;
  category: 'clothing' | 'accessories' | 'digital';
  inStock: boolean;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
}

export default function ProductsManager() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{
    name: string; description: string; price: string; category: 'clothing' | 'accessories' | 'digital';
    imageUrl: string; stockQuantity: number; inStock: boolean; isActive: boolean;
  }>({
    name: '', description: '', price: '', category: 'accessories',
    imageUrl: '', stockQuantity: 0, inStock: true, isActive: true,
  });

  useEffect(() => { fetchProducts(); }, [user]);

  const fetchProducts = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products?includeInactive=true`, {
        headers: { 'X-User-Id': user.id },
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      setProducts(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/admin/products/${editingId}` : `/api/admin/products`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
        body: JSON.stringify({ ...formData, price: parseFloat(formData.price) }),
      });
      if (res.ok) { fetchProducts(); resetForm(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!user?.id || !confirm('Deactivate this product?')) return;
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers: { 'X-User-Id': user.id } });
    fetchProducts();
  };

  const startEdit = (item: MerchItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name, description: item.description || '', price: item.price,
      category: item.category, imageUrl: item.imageUrl || '',
      stockQuantity: item.stockQuantity, inStock: item.inStock, isActive: item.isActive,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({ name: '', description: '', price: '', category: 'accessories', imageUrl: '', stockQuantity: 0, inStock: true, isActive: true });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-neon-cyan animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-display font-bold text-white flex items-center gap-2 sm:gap-3">
          <Package size={18} className="text-neon-cyan" /> Products
        </h1>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <Plus size={16} />
          <span className="hidden sm:inline">Add Product</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400">
          {error} <button onClick={fetchProducts} className="ml-2 underline">Retry</button>
        </motion.div>
      )}

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-white">{editingId ? 'Edit' : 'New'} Product</h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <input placeholder="Product Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
              className="bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none" required />
            <input placeholder="Price (₹)" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} 
              className="bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none" required />
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} 
              className="bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-neon-cyan/50 focus:outline-none">
              <option value="clothing">Clothing</option>
              <option value="accessories">Accessories</option>
              <option value="digital">Digital</option>
            </select>
            <input placeholder="Stock Quantity" type="number" value={formData.stockQuantity} onChange={e => setFormData({...formData, stockQuantity: parseInt(e.target.value) || 0})} 
              className="bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none" />
            <input placeholder="Image URL" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
              className="bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none md:col-span-2" />
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2}
              className="bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none md:col-span-2 resize-none" />
            <div className="flex gap-6 md:col-span-2">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={formData.inStock} onChange={e => setFormData({...formData, inStock: e.target.checked})} className="w-4 h-4 rounded" /> In Stock
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 rounded" /> Active
              </label>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" isLoading={saving} className="w-full flex items-center justify-center gap-2">
                <Save size={18} /> {editingId ? 'Update' : 'Create'} Product
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {products.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/50 border border-white/10 rounded-xl p-12 text-center">
          <Package size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 mb-2">No products yet</p>
          <p className="text-slate-500 text-sm">Click "Add Product" to create your first product</p>
        </motion.div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {products.map((item, idx) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className={`bg-slate-900/50 border border-white/10 rounded-xl p-4 ${!item.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3 sm:gap-4">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover bg-slate-800 flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0"><Package className="text-slate-600" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-white font-medium truncate">{item.name}</h3>
                      <p className="text-slate-500 text-sm truncate">{item.slug} · <span className="capitalize">{item.category}</span></p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${item.isActive ? 'bg-neon-green/20 text-neon-green' : 'bg-slate-700 text-slate-400'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <p className="text-neon-green font-mono font-bold">₹{parseFloat(item.price).toLocaleString()}</p>
                      <p className="text-slate-500 text-xs">{item.stockQuantity} in stock</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(item)} className="p-2 text-slate-400 hover:text-neon-cyan transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
