import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Tag, Save, X, Check, Loader2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';

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
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null; name: string }>({ open: false, id: null, name: '' });

  useEffect(() => { fetchPlans(); }, [user]);

  const fetchPlans = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/admin/plans?includeInactive=true`, { headers: { 'X-User-Id': user.id } });
      if (res.ok) setPlans(await res.json());
    } catch { /* Fetch failed silently */ }
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
    } catch { /* Save failed silently */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!user?.id || !deleteModal.id) return;
    await fetch(`/api/admin/plans/${deleteModal.id}`, { method: 'DELETE', headers: { 'X-User-Id': user.id } });
    setDeleteModal({ open: false, id: null, name: '' });
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

      {/* Plan Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingId ? 'Edit Plan' : 'Add New Plan'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Name & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium text-slate-300">Plan Name *</label>
              <input placeholder="e.g., Pro" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium text-slate-300">Price (₹) *</label>
              <input placeholder="299" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} 
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none" required />
            </div>
          </div>

          {/* Interval & Sort Order */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium text-slate-300">Billing</label>
              <Select
                value={formData.interval}
                onChange={(value) => setFormData({...formData, interval: value})}
                options={[
                  { value: 'month', label: 'Monthly' },
                  { value: 'year', label: 'Yearly' },
                  { value: 'lifetime', label: 'Lifetime' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium text-slate-300">Sort Order</label>
              <input placeholder="0" type="number" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})} 
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-neon-cyan/50 focus:outline-none" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-slate-300">Description</label>
            <textarea placeholder="Describe this plan..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2}
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none resize-none" />
          </div>
          
          {/* Features */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Features</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input placeholder="Add a feature..." value={featureInput} onChange={e => setFeatureInput(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                className="flex-1 bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:border-neon-cyan/50 focus:outline-none text-sm min-w-0" />
              <Button type="button" variant="secondary" size="sm" onClick={addFeature} className="w-full sm:w-auto flex-shrink-0">Add</Button>
            </div>
            {formData.features.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 max-h-28 sm:max-h-32 overflow-y-auto p-1">
                {formData.features.map((f, i) => (
                  <span key={i} className="bg-slate-800 border border-white/10 px-2 py-1 rounded-full text-xs text-slate-300 flex items-center gap-1 max-w-full">
                    <Check size={10} className="text-neon-green flex-shrink-0" />
                    <span className="truncate">{f}</span>
                    <button type="button" onClick={() => setFormData({...formData, features: formData.features.filter((_, idx) => idx !== i)})} className="text-slate-500 hover:text-red-400 ml-0.5 flex-shrink-0">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Switches */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-800/50 rounded-lg border border-white/5">
              <span className="text-xs sm:text-sm text-slate-300">Allow Downloads</span>
              <button
                type="button"
                onClick={() => setFormData({...formData, allowDownloads: !formData.allowDownloads})}
                className={`relative w-10 h-5 sm:w-11 sm:h-6 rounded-full transition-colors flex-shrink-0 ${formData.allowDownloads ? 'bg-neon-cyan' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow transition-transform ${formData.allowDownloads ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-800/50 rounded-lg border border-white/5">
              <span className="text-xs sm:text-sm text-slate-300">Allow Offline</span>
              <button
                type="button"
                onClick={() => setFormData({...formData, allowOffline: !formData.allowOffline})}
                className={`relative w-10 h-5 sm:w-11 sm:h-6 rounded-full transition-colors flex-shrink-0 ${formData.allowOffline ? 'bg-neon-purple' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow transition-transform ${formData.allowOffline ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-800/50 rounded-lg border border-white/5">
              <span className="text-xs sm:text-sm text-slate-300">Active</span>
              <button
                type="button"
                onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                className={`relative w-10 h-5 sm:w-11 sm:h-6 rounded-full transition-colors flex-shrink-0 ${formData.isActive ? 'bg-neon-green' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={resetForm} className="flex-1">Cancel</Button>
            <Button type="submit" isLoading={saving} className="flex-1 flex items-center justify-center gap-2">
              <Save size={16} /> {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

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
              <Button variant="secondary" size="sm" onClick={() => startEdit(plan)} className="flex items-center gap-1.5 flex-1 sm:flex-none justify-center">
                <Edit2 size={14} /> <span>Edit</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ open: true, id: plan.id, name: plan.name })} className="flex items-center gap-1.5 flex-1 sm:flex-none justify-center text-red-400 hover:bg-red-500/10">
                <Trash2 size={14} /> <span>Delete</span>
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: '' })}
        title="Delete Plan"
        size="sm"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-white font-medium mb-1">Delete "{deleteModal.name}"?</p>
            <p className="text-slate-400 text-sm">
              This will deactivate the plan. Existing subscribers won't be affected.
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
