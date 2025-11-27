import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Tag, Save, X, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';

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
}

export default function PlansManager() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', currency: 'INR', interval: 'month',
    features: [] as string[], allowDownloads: false, allowOffline: false, sortOrder: 0, isActive: true,
  });

  useEffect(() => { fetchPlans(); }, [user]);

  const fetchPlans = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/admin/plans?includeInactive=true`, { headers: { 'X-User-Id': user.id } });
      if (res.ok) setPlans(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/admin/plans/${editingId}` : `/api/admin/plans`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
        body: JSON.stringify({ ...formData, price: parseFloat(formData.price) }),
      });
      if (res.ok) { fetchPlans(); resetForm(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!user?.id || !confirm('Delete/deactivate this plan?')) return;
    await fetch(`/api/admin/plans/${id}`, { method: 'DELETE', headers: { 'X-User-Id': user.id } });
    fetchPlans();
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

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-neon-cyan animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-display font-bold text-white flex items-center gap-2 sm:gap-3">
          <Tag size={18} className="text-neon-purple" /> Pricing Plans
        </h1>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <Plus size={16} />
          <span className="hidden sm:inline">Add Plan</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-white">{editingId ? 'Edit' : 'New'} Plan</h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <input placeholder="Plan Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                className="bg-slate-800/50 border border-white/10 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none" required />
              <input placeholder="Price" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} 
                className="bg-slate-800/50 border border-white/10 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none" required />
              <select value={formData.interval} onChange={e => setFormData({...formData, interval: e.target.value})} 
                className="bg-slate-800/50 border border-white/10 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-white focus:border-neon-cyan/50 focus:outline-none">
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none resize-none" />
            
            <div>
              <label className="block text-sm text-slate-400 mb-2">Features</label>
              <div className="flex gap-2 mb-3">
                <input placeholder="Add a feature..." value={featureInput} onChange={e => setFeatureInput(e.target.value)} 
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  className="flex-1 bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none" />
                <Button type="button" variant="secondary" onClick={addFeature}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.features.map((f, i) => (
                  <span key={i} className="bg-slate-800 border border-white/10 px-3 py-1 rounded-full text-sm text-slate-300 flex items-center gap-2">
                    <Check size={12} className="text-neon-green" /> {f}
                    <button type="button" onClick={() => setFormData({...formData, features: formData.features.filter((_, idx) => idx !== i)})} className="text-slate-500 hover:text-red-400">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <input placeholder="Sort Order" type="number" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})} 
                className="w-24 bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-neon-cyan/50 focus:outline-none" />
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={formData.allowDownloads} onChange={e => setFormData({...formData, allowDownloads: e.target.checked})} className="w-4 h-4 rounded" /> Allow Downloads
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={formData.allowOffline} onChange={e => setFormData({...formData, allowOffline: e.target.checked})} className="w-4 h-4 rounded" /> Allow Offline
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 rounded" /> Active
              </label>
            </div>
            <Button type="submit" isLoading={saving} className="w-full flex items-center justify-center gap-2">
              <Save size={18} /> {editingId ? 'Update' : 'Create'} Plan
            </Button>
          </form>
        </motion.div>
      )}

      <div className="grid gap-4">
        {plans.map((plan, idx) => (
          <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className={`bg-slate-900/50 border border-white/10 rounded-xl p-4 sm:p-5 ${!plan.isActive ? 'opacity-60' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${plan.isActive ? 'bg-neon-green/20 text-neon-green' : 'bg-slate-700 text-slate-400'}`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">{plan.description}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xl sm:text-2xl font-display font-bold text-white">₹{parseFloat(plan.price).toLocaleString()}<span className="text-sm text-slate-400 font-normal">/{plan.interval}</span></p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {plan.features?.map((f, i) => (
                <span key={i} className="bg-slate-800/50 px-2 py-1 rounded text-xs text-slate-300 flex items-center gap-1">
                  <Check size={10} className="text-neon-green" /> {f}
                </span>
              ))}
              {plan.allowDownloads && <span className="bg-neon-cyan/10 text-neon-cyan px-2 py-1 rounded text-xs">Downloads</span>}
              {plan.allowOffline && <span className="bg-neon-purple/10 text-neon-purple px-2 py-1 rounded text-xs">Offline</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => startEdit(plan)} className="flex items-center gap-1 flex-1 sm:flex-none justify-center">
                <Edit2 size={14} /> Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(plan.id)} className="flex items-center gap-1 flex-1 sm:flex-none justify-center text-red-400 hover:bg-red-500/10">
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
