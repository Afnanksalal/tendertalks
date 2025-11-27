import { useState, useEffect } from 'react';
import { Receipt, Download, Filter, Search, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface Payment {
  id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  refId: string | null;
  refType: string | null;
  metadata: string | null;
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

const API_URL = import.meta.env.VITE_APP_URL || '';

export default function InvoicesManager() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: 'all', status: 'all', startDate: '', endDate: '' });
  const [search, setSearch] = useState('');

  useEffect(() => { fetchPayments(); }, [filters]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const res = await fetch(`${API_URL}/api/admin/invoices?${params}`, {
        headers: { 'X-User-Id': user?.id || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setStats(data.stats);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const statusColors: Record<string, string> = {
    completed: 'bg-green-600',
    pending: 'bg-yellow-600',
    failed: 'bg-red-600',
    refunded: 'bg-purple-600',
    authorized: 'bg-blue-600',
  };

  const typeLabels: Record<string, string> = {
    subscription: 'Subscription',
    subscription_renewal: 'Renewal',
    purchase: 'Purchase',
    merch: 'Merch',
    invoice: 'Invoice',
    upgrade: 'Upgrade',
    downgrade: 'Downgrade',
  };

  const filteredPayments = payments.filter(p => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      p.user?.name?.toLowerCase().includes(searchLower) ||
      p.user?.email?.toLowerCase().includes(searchLower) ||
      p.razorpayPaymentId?.toLowerCase().includes(searchLower) ||
      p.razorpayOrderId?.toLowerCase().includes(searchLower)
    );
  });

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'User', 'Email', 'Amount', 'Status', 'Payment ID'];
    const rows = filteredPayments.map(p => [
      formatDate(p.createdAt),
      typeLabels[p.type] || p.type,
      p.user?.name || '',
      p.user?.email || '',
      `${p.currency} ${p.amount}`,
      p.status,
      p.razorpayPaymentId || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt /> Invoices & Payments</h1>
        <div className="flex gap-2">
          <button onClick={fetchPayments} className="btn-secondary flex items-center gap-1"><RefreshCw size={16} /></button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-1"><Download size={16} /> Export</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Revenue</div>
            <div className="text-2xl font-bold text-green-400">₹{stats.totalAmount.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Transactions</div>
            <div className="text-2xl font-bold">{stats.totalCount}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Completed</div>
            <div className="text-2xl font-bold text-green-400">{stats.completedCount}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Refunded</div>
            <div className="text-2xl font-bold text-purple-400">{stats.refundedCount}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Failed</div>
            <div className="text-2xl font-bold text-red-400">{stats.failedCount}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={18} className="text-gray-400" />
            <input placeholder="Search by name, email, or payment ID..." value={search} onChange={e => setSearch(e.target.value)} className="input flex-1" />
          </div>
          <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className="input w-36">
            <option value="all">All Types</option>
            <option value="subscription">Subscription</option>
            <option value="subscription_renewal">Renewal</option>
            <option value="purchase">Purchase</option>
            <option value="merch">Merch</option>
            <option value="invoice">Invoice</option>
          </select>
          <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="input w-36">
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="input w-36" />
          <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="input w-36" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(p => (
                <tr key={p.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                  <td className="p-3 text-sm">{formatDate(p.createdAt)}</td>
                  <td className="p-3">
                    <div className="font-medium">{p.user?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-400">{p.user?.email}</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-1 bg-gray-700 rounded text-xs">{typeLabels[p.type] || p.type}</span>
                  </td>
                  <td className="p-3 text-center font-mono">
                    <span className={p.status === 'refunded' ? 'text-purple-400 line-through' : 'text-green-400'}>
                      ₹{parseFloat(p.amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${statusColors[p.status] || 'bg-gray-600'}`}>{p.status}</span>
                  </td>
                  <td className="p-3 text-center">
                    {p.razorpayPaymentId ? (
                      <a href={`https://dashboard.razorpay.com/app/payments/${p.razorpayPaymentId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs flex items-center justify-center gap-1">
                        {p.razorpayPaymentId.slice(0, 14)}... <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-gray-500 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filteredPayments.length === 0 && <div className="p-8 text-center text-gray-400">No payments found</div>}
      </div>
    </div>
  );
}
