import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Stats {
  totalRestaurants: number;
  activeRestaurants: number;
  totalCategories: number;
  totalViews: number;
  avgRating: number;
  byNeighborhood: { neighborhood: string; count: number }[];
  byPriceTier: { price_tier: string; count: number }[];
  topRated: { id: string; name: string; rating: number; review_count: number }[];
  recentlyAdded: { id: string; name: string; neighborhood: string; created_at: string }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadStats();
  }, [navigate]);

  async function loadStats() {
    try {
      const res = await fetch('http://localhost:4000/api/admin/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">🍽️ Admin Dashboard</h1>
            <p className="text-slate-400 text-sm">Ashgabat Restaurant Finder</p>
          </div>
          <div className="flex gap-4">
            <Link to="/" className="px-4 py-2 text-slate-300 hover:text-white">
              View Site
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation */}
        <nav className="flex gap-4 mb-8">
          <Link to="/admin" className="px-4 py-2 bg-orange-500 text-white rounded-lg">Dashboard</Link>
          <Link to="/admin/restaurants" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Restaurants</Link>
          <Link to="/admin/categories" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Categories</Link>
        </nav>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-white">{stats?.totalRestaurants}</div>
            <div className="text-slate-400 text-sm">Total Restaurants</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-green-400">{stats?.activeRestaurants}</div>
            <div className="text-slate-400 text-sm">Active</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-orange-400">{stats?.totalCategories}</div>
            <div className="text-slate-400 text-sm">Categories</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-blue-400">{stats?.totalViews}</div>
            <div className="text-slate-400 text-sm">Total Views</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="text-3xl font-bold text-yellow-400">⭐ {stats?.avgRating}</div>
            <div className="text-slate-400 text-sm">Avg Rating</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* By Neighborhood */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">📍 By Neighborhood</h3>
            <div className="space-y-3">
              {stats?.byNeighborhood.map(n => (
                <div key={n.neighborhood} className="flex items-center gap-3">
                  <span className="w-28 text-slate-400 text-sm truncate">{n.neighborhood}</span>
                  <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                      style={{ width: `${(n.count / (stats?.activeRestaurants || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-medium w-8 text-right">{n.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Price Tier */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">💰 By Price Tier</h3>
            <div className="space-y-3">
              {stats?.byPriceTier.map(p => (
                <div key={p.price_tier} className="flex items-center gap-3">
                  <span className="w-16 text-slate-400 text-sm">{p.price_tier}</span>
                  <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                      style={{ width: `${(p.count / (stats?.activeRestaurants || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-white font-medium w-8 text-right">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Rated */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">⭐ Top Rated</h3>
            <div className="space-y-3">
              {stats?.topRated.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg">
                  <span className="w-8 h-8 flex items-center justify-center bg-orange-500 text-white font-bold rounded-lg text-sm">
                    #{i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="text-white font-medium">{r.name}</div>
                    <div className="text-slate-400 text-sm">{r.review_count} reviews</div>
                  </div>
                  <span className="text-yellow-400 font-semibold">⭐ {r.rating}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Added */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">🕐 Recently Added</h3>
            <div className="space-y-3">
              {stats?.recentlyAdded.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg">
                  <div className="flex-1">
                    <div className="text-white font-medium">{r.name}</div>
                    <div className="text-slate-400 text-sm">{r.neighborhood}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
