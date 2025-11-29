import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Package, Save, X, Loader2, AlertTriangle, Upload, Image as ImageIcon, DollarSign, Hash, FileText, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { uploadMerchImage } from '../../lib/storage';
import toast from 'react-hot-toast';

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
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null; name: string }>({ open: false, id: null, name: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    } catch { /* Save failed silently */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!user?.id || !deleteModal.id) return;
    await fetch(`/api/admin/products/${deleteModal.id}`, { method: 'DELETE', headers: { 'X-User-Id': user.id } });
    setDeleteModal({ open: false, id: null, name: '' });
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

      {/* Product Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingId ? 'Edit Product' : 'Add New Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image Upload Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <ImageIcon size={14} className="text-neon-cyan" />
              Product Image
            </label>
            <div className="flex items-start gap-4">
              <div 
                onClick={() => imageInputRef.current?.click()}
                className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
                  formData.imageUrl 
                    ? 'border-neon-cyan/30 bg-neon-cyan/5' 
                    : 'border-white/20 bg-slate-800/50 hover:border-neon-cyan/50 hover:bg-slate-800'
                }`}
              >
                {uploadingImage ? (
                  <Loader2 size={24} className="text-neon-cyan animate-spin" />
                ) : formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload size={24} className="text-slate-500" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingImage(true);
                    try {
                      const tempId = editingId || `temp-${Date.now()}`;
                      const url = await uploadMerchImage(file, tempId);
                      if (url) {
                        setFormData({ ...formData, imageUrl: url });
                        toast.success('Image uploaded!');
                      } else {
                        throw new Error('Upload failed');
                      }
                    } catch (err) {
                      toast.error('Failed to upload image');
                    }
                    setUploadingImage(false);
                  }}
                />
                <input
                  placeholder="Or paste image URL..."
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none"
                />
                <p className="text-xs text-slate-500">Click to upload or paste URL</p>
              </div>
            </div>
          </div>

          {/* Name & Price Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Tag size={14} className="text-neon-cyan" />
                Product Name *
              </label>
              <input
                placeholder="e.g., TenderTalks T-Shirt"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <DollarSign size={14} className="text-neon-green" />
                Price (₹) *
              </label>
              <input
                placeholder="299"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Category & Stock Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Package size={14} className="text-neon-purple" />
                Category
              </label>
              <Select
                value={formData.category}
                onChange={(value) => setFormData({...formData, category: value as any})}
                options={[
                  { value: 'clothing', label: '👕 Clothing' },
                  { value: 'accessories', label: '🎧 Accessories' },
                  { value: 'digital', label: '💾 Digital' },
                ]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Hash size={14} className="text-amber-400" />
                Stock Quantity
              </label>
              <input
                placeholder="100"
                type="number"
                min="0"
                value={formData.stockQuantity}
                onChange={e => setFormData({...formData, stockQuantity: parseInt(e.target.value) || 0})}
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <FileText size={14} className="text-slate-400" />
              Description
            </label>
            <textarea
              placeholder="Describe your product..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none resize-none"
            />
          </div>

          {/* Toggle Switches */}
          <div className="space-y-2 sm:space-y-3 pt-2">
            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-800/50 rounded-lg border border-white/5">
              <span className="text-xs sm:text-sm text-slate-300">In Stock</span>
              <button
                type="button"
                onClick={() => setFormData({...formData, inStock: !formData.inStock})}
                className="flex-shrink-0"
              >
                {formData.inStock ? (
                  <ToggleRight size={32} className="text-neon-green" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-500" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-800/50 rounded-lg border border-white/5">
              <span className="text-xs sm:text-sm text-slate-300">Active (visible in store)</span>
              <button
                type="button"
                onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                className="flex-shrink-0"
              >
                {formData.isActive ? (
                  <ToggleRight size={32} className="text-neon-cyan" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-500" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={resetForm} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={saving} className="flex-1 flex items-center justify-center gap-2">
              <Save size={18} />
              {editingId ? 'Update' : 'Create'} Product
            </Button>
          </div>
        </form>
      </Modal>

      {products.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/50 border border-white/10 rounded-xl p-8 sm:p-12 text-center">
          <Package size={40} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 mb-2">No products yet</p>
          <p className="text-slate-500 text-sm">Click "Add" to create your first product</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {products.map((item, idx) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.03, 0.15) }}
              className={`bg-slate-900/50 border border-white/10 rounded-xl p-3 sm:p-4 ${!item.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover bg-slate-800 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0"><Package size={20} className="text-slate-600" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-white font-medium text-sm sm:text-base truncate">{item.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${item.isActive ? 'bg-neon-green/20 text-neon-green' : 'bg-slate-700 text-slate-400'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs truncate mb-1.5">{item.slug} · <span className="capitalize">{item.category}</span></p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <p className="text-neon-green font-mono font-bold text-sm">₹{parseFloat(item.price).toLocaleString()}</p>
                      <p className="text-slate-500 text-xs">{item.stockQuantity} in stock</p>
                    </div>
                    <div className="flex items-center">
                      <button onClick={() => startEdit(item)} className="p-1.5 sm:p-2 text-slate-400 hover:text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteModal({ open: true, id: item.id, name: item.name })} className="p-1.5 sm:p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: '' })}
        title="Delete Product"
        size="sm"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-white font-medium mb-1">Delete "{deleteModal.name}"?</p>
            <p className="text-slate-400 text-sm">
              This will deactivate the product. It won't appear in the store anymore.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setDeleteModal({ open: false, id: null, name: '' })} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
