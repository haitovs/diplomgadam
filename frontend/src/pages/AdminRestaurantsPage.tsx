import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  hero_image: string;
  cuisines: string[];
  tags: string[];
  price_tier: string;
  rating: number;
  review_count: number;
  address: string;
  neighborhood: string;
  phone: string;
  status: string;
}

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadRestaurants();
  }, [filter, search, navigate]);

  async function loadRestaurants() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/restaurants?${params}`);
      const data = await res.json();
      setRestaurants(data);
    } catch (err) {
      console.error('Failed to load', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this restaurant?')) return;
    try {
      await fetch(`/api/admin/restaurants/${id}`, { method: 'DELETE' });
      loadRestaurants();
    } catch (err) {
      console.error('Delete failed', err);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const restaurant = restaurants.find(r => r.id === id);
      await fetch(`/api/admin/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...restaurant, status })
      });
      loadRestaurants();
    } catch (err) {
      console.error('Update failed', err);
    }
  }

  function handleLogout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">🍽️ Manage Restaurants</h1>
            <p className="text-slate-400 text-sm">Add, edit, and manage restaurant listings</p>
          </div>
          <div className="flex gap-4">
            <Link to="/" className="px-4 py-2 text-slate-300 hover:text-white">View Site</Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation */}
        <nav className="flex gap-4 mb-6">
          <Link to="/admin" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Dashboard</Link>
          <Link to="/admin/restaurants" className="px-4 py-2 bg-orange-500 text-white rounded-lg">Restaurants</Link>
          <Link to="/admin/categories" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Categories</Link>
        </nav>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="Search restaurants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg hover:opacity-90"
          >
            + Add Restaurant
          </button>
        </div>

        {/* Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Restaurant</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Neighborhood</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Price</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Rating</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No restaurants found</td>
                </tr>
              ) : (
                restaurants.map(r => (
                  <tr key={r.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.hero_image && (
                          <img src={r.hero_image} alt="" className="w-12 h-8 object-cover rounded" />
                        )}
                        <div>
                          <div className="text-white font-medium">{r.name}</div>
                          <div className="text-slate-400 text-sm truncate max-w-[200px]">{r.cuisines?.join(', ')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.neighborhood}</td>
                    <td className="px-4 py-3 text-slate-300">{r.price_tier}</td>
                    <td className="px-4 py-3 text-yellow-400">⭐ {r.rating}</td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        className={`px-2 py-1 rounded text-sm ${r.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/restaurants/${r.id}/menu`}
                          className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30 text-sm flex items-center"
                        >
                          Menu
                        </Link>
                        <button
                          onClick={() => { setEditingId(r.id); setShowForm(true); }}
                          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <RestaurantForm
          id={editingId}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSaved={() => { setShowForm(false); setEditingId(null); loadRestaurants(); }}
        />
      )}
    </div>
  );
}

function RestaurantForm({ id, onClose, onSaved }: { id: string | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    hero_image: '',
    cuisines: '',
    tags: '',
    price_tier: '$$',
    rating: 0,
    address: '',
    neighborhood: '',
    phone: '',
    website: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadRestaurant();
    }
  }, [id]);

  async function loadRestaurant() {
    try {
      const res = await fetch(`/api/admin/restaurants/${id}`);
      const data = await res.json();
      setForm({
        name: data.name || '',
        description: data.description || '',
        hero_image: data.hero_image || '',
        cuisines: data.cuisines?.join(', ') || '',
        tags: data.tags?.join(', ') || '',
        price_tier: data.price_tier || '$$',
        rating: data.rating || 0,
        address: data.address || '',
        neighborhood: data.neighborhood || '',
        phone: data.phone || '',
        website: data.website || '',
        status: data.status || 'active'
      });
    } catch (err) {
      console.error('Failed to load restaurant', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const data = {
      ...form,
      cuisines: form.cuisines.split(',').map(s => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean)
    };

    try {
      const url = id
        ? `/api/admin/restaurants/${id}`
        : '/api/admin/restaurants';

      await fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      onSaved();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{id ? 'Edit Restaurant' : 'Add Restaurant'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-slate-300 mb-1 text-sm">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-300 mb-1 text-sm">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 text-sm">Hero Image URL</label>
              <input
                type="text"
                value={form.hero_image}
                onChange={e => setForm({ ...form, hero_image: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 text-sm">Neighborhood</label>
              <input
                type="text"
                value={form.neighborhood}
                onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-300 mb-1 text-sm">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 text-sm">Cuisines (comma-separated)</label>
              <input
                type="text"
                value={form.cuisines}
                onChange={e => setForm({ ...form, cuisines: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                placeholder="Turkmen, International..."
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 text-sm">Tags (comma-separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                placeholder="Family, Fine Dining..."
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 text-sm">Price Tier</label>
              <select
                value={form.price_tier}
                onChange={e => setForm({ ...form, price_tier: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              >
                <option value="$">$ (Budget)</option>
                <option value="$$">$$ (Moderate)</option>
                <option value="$$$">$$$ (Premium)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1 text-sm">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                placeholder="+993 12 XX XX XX"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1 text-sm">Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Restaurant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
