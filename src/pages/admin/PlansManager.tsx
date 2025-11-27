import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CreditCard, Save, X, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  interval: string;
  features: string[];
  allowDownloads: boolean;
  allowOffline: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_APP_URL || '';

export default function PlansManager() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', currency: 'INR', interval: 'month',
    features: [] as string[], allowDownloads: false, allowOffline: false, sortOrder: 0, isActive: true,
  });

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/plans?includeInactive=true`, {
        headers: { 'X-User-Id': user?.id || '' },
      });
      if (res.ok) setPlans(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `${API_URL}/api/admin/plans/${editingId}` : `${API_URL}/api/admin/plans`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', 'X-User-Id': user?.id || '' },
        body: JSON.stringify({ ...formData, price: parseFloat(formData.price) }),
      });
      if (res.ok) {
        fetchPlans();
        resetForm();
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete/deactivate this plan?')) return;
    try {
      await fetch(`${API_URL}/api/admin/plans/${id}`, {
        method: 'DELETE', headers: { 'X-User-Id': user?.id || '' },
      });
      fetchPlans();
    } catch (e) { console.error(e); }
  };

  const startEdit = (plan: PricingPlan) => {
    setEditingId(plan.id);
    setFormData({
      name: plan.name, description: plan.description || '', price: plan.price,
      currency: plan.currency, interval: plan.interval, features: plan.features || [],
      allowDownloads: plan.allowDownloads, allowOffline: plan.allowOffline,
      sortOrder: plan.sortOrder, isActive: plan.isActive,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFeatureInput('');
    setFormData({ name: '', description: '', price: '', currency: 'INR', interval: 'month', features: [], allowDownloads: false, allowOffline: false, sortOrder: 0, isActive: true });
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({ ...formData, features: [...formData.features, featureInput.trim()] });
      setFeatureInput('');
    }
  };

  const removeFeature = (idx: number) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== idx) });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard /> Pricing Plans</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Plan
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Plan</h2>
            <button onClick={resetForm}><X /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <input placeholder="Plan Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input" required />
              <input placeholder="Price" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="input" required />
              <select value={formData.interval} onChange={e => setFormData({...formData, interval: e.target.value})} className="input">
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input w-full" rows={2} />
            
            <div>
              <label className="block text-sm mb-2">Features</label>
              <div className="flex gap-2 mb-2">
                <input placeholder="Add feature..." value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addFeature())} className="input flex-1" />
                <button type="button" onClick={addFeature} className="btn-secondary">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.features.map((f, i) => (
                  <span key={i} className="bg-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <Check size={14} className="text-green-400" /> {f}
                    <button type="button" onClick={() => removeFeature(i)} className="hover:text-red-400">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <input placeholder="Sort Order" type="number" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value)})} className="input" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.allowDownloads} onChange={e => setFormData({...formData, allowDownloads: e.target.checked})} /> Downloads</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.allowOffline} onChange={e => setFormData({...formData, allowOffline: e.target.checked})} /> Offline</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} /> Active</label>
            </div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2"><Save size={18} /> Save Plan</button>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {plans.map(plan => (
          <div key={plan.id} className={`bg-gray-800 rounded-lg p-4 ${!plan.isActive ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-gray-400 text-sm">{plan.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">₹{plan.price}<span className="text-sm text-gray-400">/{plan.interval}</span></div>
                <span className={`px-2 py-1 rounded text-xs ${plan.isActive ? 'bg-green-600' : 'bg-gray-600'}`}>{plan.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {plan.features?.map((f, i) => (
                <span key={i} className="bg-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1"><Check size={12} className="text-green-400" /> {f}</span>
              ))}
              {plan.allowDownloads && <span className="bg-blue-600/30 px-2 py-1 rounded text-xs">Downloads</span>}
              {plan.allowOffline && <span className="bg-purple-600/30 px-2 py-1 rounded text-xs">Offline</span>}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => startEdit(plan)} className="btn-secondary text-sm flex items-center gap-1"><Edit2 size={14} /> Edit</button>
              <button onClick={() => handleDelete(plan.id)} className="btn-secondary text-sm flex items-center gap-1 hover:bg-red-600"><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
