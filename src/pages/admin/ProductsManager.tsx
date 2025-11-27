import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Save, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

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

const API_URL = import.meta.env.VITE_APP_URL || '';

export default function ProductsManager() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    name: string; description: string; price: string; category: 'clothing' | 'accessories' | 'digital';
    imageUrl: string; stockQuantity: number; inStock: boolean; isActive: boolean;
  }>({
    name: '', description: '', price: '', category: 'accessories',
    imageUrl: '', stockQuantity: 0, inStock: true, isActive: true,
  });

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/products?includeInactive=true`, {
        headers: { 'X-User-Id': user?.id || '' },
      });
      if (res.ok) setProducts(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `${API_URL}/api/admin/products/${editingId}` : `${API_URL}/api/admin/products`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', 'X-User-Id': user?.id || '' },
        body: JSON.stringify({ ...formData, price: parseFloat(formData.price) }),
      });
      if (res.ok) {
        fetchProducts();
        resetForm();
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this product?')) return;
    try {
      await fetch(`${API_URL}/api/admin/products/${id}`, {
        method: 'DELETE', headers: { 'X-User-Id': user?.id || '' },
      });
      fetchProducts();
    } catch (e) { console.error(e); }
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

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package /> Products</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Product</h2>
            <button onClick={resetForm}><X /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <input placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input" required />
            <input placeholder="Price" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="input" required />
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="input">
              <option value="clothing">Clothing</option>
              <option value="accessories">Accessories</option>
              <option value="digital">Digital</option>
            </select>
            <input placeholder="Stock Qty" type="number" value={formData.stockQuantity} onChange={e => setFormData({...formData, stockQuantity: parseInt(e.target.value)})} className="input" />
            <input placeholder="Image URL" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="input col-span-2" />
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input col-span-2" rows={2} />
            <div className="flex gap-4 col-span-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.inStock} onChange={e => setFormData({...formData, inStock: e.target.checked})} /> In Stock</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} /> Active</label>
            </div>
            <button type="submit" className="btn-primary col-span-2 flex items-center justify-center gap-2"><Save size={18} /> Save</button>
          </form>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr><th className="p-3 text-left">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody>
            {products.map(item => (
              <tr key={item.id} className="border-t border-gray-700">
                <td className="p-3"><div className="font-medium">{item.name}</div><div className="text-sm text-gray-400">{item.slug}</div></td>
                <td className="p-3 text-center capitalize">{item.category}</td>
                <td className="p-3 text-center">₹{item.price}</td>
                <td className="p-3 text-center">{item.stockQuantity}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${item.isActive ? 'bg-green-600' : 'bg-gray-600'}`}>{item.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => startEdit(item)} className="p-1 hover:text-blue-400"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1 hover:text-red-400 ml-2"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
