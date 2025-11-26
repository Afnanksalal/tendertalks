import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Camera, Loader2, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { user, isLoading: authLoading, updateProfile } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateProfile({ name });
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030014] pt-24 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
            Settings
          </h1>
          <p className="text-slate-400 mb-8">Manage your account settings</p>

          {/* Profile Section */}
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-6">Profile</h2>

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover border-2 border-white/10"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-neon-cyan/20 flex items-center justify-center border-2 border-neon-cyan/30">
                    <User size={32} className="text-neon-cyan" />
                  </div>
                )}
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                  <Camera size={14} />
                </button>
              </div>
              <div>
                <p className="text-white font-medium">{user.name || 'User'}</p>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Display Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                leftIcon={<User size={18} />}
              />

              <Input
                label="Email"
                type="email"
                value={user.email}
                disabled
                leftIcon={<Mail size={18} />}
                helperText="Email cannot be changed"
              />

              <div className="pt-4">
                <Button type="submit" isLoading={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>

          {/* Account Info */}
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Account</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div>
                  <p className="text-white font-medium">Account Type</p>
                  <p className="text-sm text-slate-400">
                    {user.role === 'admin' ? 'Administrator' : 'Member'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  user.role === 'admin' 
                    ? 'bg-neon-purple/20 text-neon-purple' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {user.role}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white font-medium">Member Since</p>
                  <p className="text-sm text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
