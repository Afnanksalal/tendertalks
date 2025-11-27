import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Shield, ShieldOff, Loader2, Mail, Calendar } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  createdAt: string;
}

export const UsersManager: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: { 'X-User-Id': currentUser!.id },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    fetchUsers();
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    if (userId === currentUser?.id) {
      toast.error("You can't change your own role");
      return;
    }

    setUpdatingId(userId);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser!.id,
        },
        body: JSON.stringify({
          targetUserId: userId,
          role: currentRole === 'admin' ? 'user' : 'admin',
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setUsers(users.map(u => u.id === userId ? updated : u));
        toast.success(`User role updated to ${updated.role}`);
      } else {
        toast.error('Failed to update user');
      }
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Users</h1>
        <span className="text-slate-400 text-xs sm:text-sm">{users.length} total</span>
      </div>

      <form onSubmit={handleSearch} className="mb-4 sm:mb-6">
        <Input
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={16} />}
        />
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 border border-white/5 rounded-2xl">
          <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No users found</h3>
          <p className="text-slate-400">Try a different search term</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-900/50 border border-white/10 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                        <Users size={16} className="text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{u.name || 'User'}</p>
                      <p className="text-slate-500 text-xs truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      u.role === 'admin' 
                        ? 'bg-neon-purple/20 text-neon-purple' 
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {u.role}
                    </span>
                    <button
                      onClick={() => toggleRole(u.id, u.role)}
                      disabled={updatingId === u.id || u.id === currentUser?.id}
                      className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {updatingId === u.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : u.role === 'admin' ? (
                        <ShieldOff size={16} />
                      ) : (
                        <Shield size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">User</th>
                  <th className="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Email</th>
                  <th className="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Joined</th>
                  <th className="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Role</th>
                  <th className="text-right text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                            <Users size={16} className="text-slate-400" />
                          </div>
                        )}
                        <span className="text-white font-medium">{u.name || 'User'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-400 text-sm">{u.email}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-slate-500 text-sm">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        u.role === 'admin' 
                          ? 'bg-neon-purple/20 text-neon-purple' 
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleRole(u.id, u.role)}
                        disabled={updatingId === u.id || u.id === currentUser?.id}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      >
                        {updatingId === u.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : u.role === 'admin' ? (
                          <ShieldOff size={16} />
                        ) : (
                          <Shield size={16} />
                        )}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
