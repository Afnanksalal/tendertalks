import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Download, Search, ExternalLink, RefreshCw, Loader2, TrendingUp, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';

interface Payment {
  id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

interface Stats {
  totalAmount: number;
  totalCount: number;
  completedCount: number;
  refundedCount: number;
  failedCount: number;
}

export default function InvoicesManager() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: 'all', status: 'all', startDate: '', endDate: '' });
  const [search, setSearch] = useState('');

  useEffect(() => { fetchPayments(); }, [filters, user]);

  const fetchPayments = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const res = await fetch(`/api/admin/invoices?${params}`, { headers: { 'X-User-Id': user.id } });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setStats(data.stats);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const statusConfig: Record<string, { color: string; icon: any }> = {
    completed: { color: 'bg-neon-green/20 text-neon-green', icon: CheckCircle },
    pending: { color: 'bg-amber-500/20 text-amber-400', icon: RefreshCw },
    failed: { color: 'bg-red-500/20 text-red-400', icon: XCircle },
    refunded: { color: 'bg-neon-purple/20 text-neon-purple', icon: RotateCcw },
    authorized: { color: 'bg-neon-cyan/20 text-neon-cyan', icon: CheckCircle },
  };

  const typeLabels: Record<string, string> = {
    subscription: 'Subscription', subscription_renewal: 'Renewal', purchase: 'Purchase',
    merch: 'Merchandise', invoice: 'Invoice', upgrade: 'Upgrade', downgrade: 'Downgrade',
  };

  const filteredPayments = payments.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.user?.name?.toLowerCase().includes(s) || p.user?.email?.toLowerCase().includes(s) || p.razorpayPaymentId?.toLowerCase().includes(s);
  });

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'User', 'Email', 'Amount', 'Status', 'Payment ID'];
    const rows = filteredPayments.map(p => [formatDate(p.createdAt), typeLabels[p.type] || p.type, p.user?.name || '', p.user?.email || '', `₹${p.amount}`, p.status, p.razorpayPaymentId || '']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1 className="text-lg sm:text-2xl font-display font-bold text-white flex items-center gap-2 sm:gap-3">
          <Receipt size={18} className="text-neon-cyan sm:hidden" />
          <Receipt size={24} className="text-neon-cyan hidden sm:block" />
          <span className="hidden sm:inline">Invoices & Payments</span>
          <span className="sm:hidden">Invoices</span>
        </h1>
        <div className="flex gap-1.5 sm:gap-2">
          <Button variant="secondary" size="sm" onClick={fetchPayments} className="flex items-center gap-1 px-2 sm:px-3"><RefreshCw size={14} /></Button>
          <Button variant="secondary" size="sm" onClick={exportCSV} className="flex items-center gap-1 px-2 sm:px-3">
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {[
            { label: 'Total Revenue', value: `₹${stats.totalAmount.toLocaleString()}`, color: 'text-neon-green', icon: TrendingUp },
            { label: 'Transactions', value: stats.totalCount, color: 'text-white', icon: Receipt },
            { label: 'Completed', value: stats.completedCount, color: 'text-neon-green', icon: CheckCircle },
            { label: 'Refunded', value: stats.refundedCount, color: 'text-neon-purple', icon: RotateCcw },
            { label: 'Failed', value: stats.failedCount, color: 'text-red-400', icon: XCircle },
          ].map((stat, idx) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className="bg-slate-900/50 border border-white/10 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-slate-400 text-[10px] sm:text-xs truncate pr-1">{stat.label}</span>
                <stat.icon size={12} className={`${stat.color} flex-shrink-0`} />
              </div>
              <p className={`text-base sm:text-xl font-display font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/50 border border-white/10 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="space-y-3">
          {/* Search - Full width on mobile */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input placeholder="Search by name, email, or payment ID..." value={search} onChange={e => setSearch(e.target.value)} 
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 text-sm focus:border-neon-cyan/50 focus:outline-none" />
          </div>
          {/* Filters - Grid on mobile */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} 
              className="bg-slate-800/50 border border-white/10 rounded-lg px-2 sm:px-3 py-2 text-white text-xs sm:text-sm focus:border-neon-cyan/50 focus:outline-none">
              <option value="all">All Types</option>
              <option value="subscription">Subscription</option>
              <option value="subscription_renewal">Renewal</option>
              <option value="purchase">Purchase</option>
              <option value="merch">Merch</option>
            </select>
            <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} 
              className="bg-slate-800/50 border border-white/10 rounded-lg px-2 sm:px-3 py-2 text-white text-xs sm:text-sm focus:border-neon-cyan/50 focus:outline-none">
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} 
              className="bg-slate-800/50 border border-white/10 rounded-lg px-2 sm:px-3 py-2 text-white text-xs sm:text-sm focus:border-neon-cyan/50 focus:outline-none" />
            <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} 
              className="bg-slate-800/50 border border-white/10 rounded-lg px-2 sm:px-3 py-2 text-white text-xs sm:text-sm focus:border-neon-cyan/50 focus:outline-none" />
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-neon-cyan animate-spin" /></div>
      ) : filteredPayments.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/50 border border-white/10 rounded-xl p-12 text-center">
          <Receipt size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">No payments found</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {filteredPayments.map((p, idx) => {
            const statusStyle = statusConfig[p.status] || { color: 'bg-slate-700 text-slate-400', icon: Receipt };
            const StatusIcon = statusStyle.icon;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                className="bg-slate-900/50 border border-white/10 rounded-xl p-3 sm:p-4">
                {/* Mobile Layout */}
                <div className="sm:hidden">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${statusStyle.color.split(' ')[0]}`}>
                        <StatusIcon size={14} className={statusStyle.color.split(' ')[1]} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.user?.name || 'Unknown'}</p>
                        <p className="text-slate-500 text-xs truncate">{p.user?.email}</p>
                      </div>
                    </div>
                    <p className={`font-mono font-bold text-sm flex-shrink-0 ${p.status === 'refunded' ? 'text-neon-purple line-through' : 'text-neon-green'}`}>
                      ₹{parseFloat(p.amount).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">{typeLabels[p.type] || p.type}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.color}`}>{p.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[10px]">{formatDate(p.createdAt)}</span>
                      {p.razorpayPaymentId && (
                        <a href={`https://dashboard.razorpay.com/app/payments/${p.razorpayPaymentId}`} target="_blank" rel="noopener noreferrer"
                          className="text-neon-cyan text-[10px] flex items-center gap-0.5">
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusStyle.color.split(' ')[0]}`}>
                      <StatusIcon size={18} className={statusStyle.color.split(' ')[1]} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{p.user?.name || 'Unknown'}</p>
                      <p className="text-slate-500 text-sm">{p.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 lg:gap-6 flex-wrap">
                    <span className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-300">{typeLabels[p.type] || p.type}</span>
                    <p className={`font-mono font-bold ${p.status === 'refunded' ? 'text-neon-purple line-through' : 'text-neon-green'}`}>
                      ₹{parseFloat(p.amount).toLocaleString()}
                    </p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.color}`}>{p.status}</span>
                    <p className="text-slate-500 text-xs hidden lg:block">{formatDate(p.createdAt)}</p>
                    {p.razorpayPaymentId && (
                      <a href={`https://dashboard.razorpay.com/app/payments/${p.razorpayPaymentId}`} target="_blank" rel="noopener noreferrer"
                        className="text-neon-cyan hover:underline text-xs flex items-center gap-1">
                        View <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
