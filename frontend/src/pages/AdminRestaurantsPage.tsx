import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ImageUpload from '../components/ImageUpload';

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
    if (!confirm('Bu restorany pozmak?')) return;
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">🍽️ Restoranlary dolandyr</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Restoran sanawyny goşuň, redaktirläň we dolandyryň</p>
          </div>
          <div className="flex gap-4">
            <Link to="/" className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Sahypany gör</Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
              Çykyş
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation */}
        <nav className="flex gap-4 mb-6">
          <Link to="/admin" className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Dolandyryş paneli</Link>
          <Link to="/admin/restaurants" className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-lg shadow-md shadow-brand-500/30">Restoranlar</Link>
          <Link to="/admin/categories" className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Kategoriýalar</Link>
        </nav>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="Restoranlary gözläň..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
          >
            <option value="all">Ähli ýagdaý</option>
            <option value="active">Işjeň</option>
            <option value="inactive">Işjeň däl</option>
          </select>
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="px-6 py-2 bg-gradient-to-r from-brand-500 to-brand-400 text-white font-semibold rounded-lg hover:opacity-90"
          >
            + Restoran goş
          </button>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 text-sm font-medium">Restoran</th>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 text-sm font-medium">Etrapça</th>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 text-sm font-medium">Baha</th>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 text-sm font-medium">Reýting</th>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 text-sm font-medium">Ýagdaý</th>
                <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 text-sm font-medium">Hereketler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Ýüklenýär...</td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Restoran tapylmady</td>
                </tr>
              ) : (
                restaurants.map(r => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {r.hero_image && (
                          <img src={r.hero_image} alt="" className="w-12 h-8 object-cover rounded" />
                        )}
                        <div>
                          <div className="text-slate-900 dark:text-white font-medium">{r.name}</div>
                          <div className="text-slate-500 dark:text-slate-400 text-sm truncate max-w-[200px]">{r.cuisines?.join(', ')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.neighborhood}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.price_tier}</td>
                    <td className="px-4 py-3 text-amber-500 dark:text-amber-400 font-semibold">⭐ {r.rating}</td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        className={`px-2 py-1 rounded text-sm border ${
                          r.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                            : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                        }`}
                      >
                        <option value="active">Işjeň</option>
                        <option value="inactive">Işjeň däl</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/restaurants/${r.id}/menu`}
                          className="px-3 py-1 bg-brand-500/15 text-brand-600 dark:text-brand-400 rounded hover:bg-brand-500/25 text-sm flex items-center transition-colors"
                        >
                          Menýu
                        </Link>
                        <button
                          onClick={() => { setEditingId(r.id); setShowForm(true); }}
                          className="px-3 py-1 bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded hover:bg-sky-200 dark:hover:bg-sky-500/30 transition-colors text-sm"
                        >
                          Redaktirle
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="px-3 py-1 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded hover:bg-rose-200 dark:hover:bg-rose-500/30 transition-colors text-sm"
                        >
                          Poz
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{id ? 'Restorany redaktirle' : 'Restoran goş'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 mb-1 text-sm font-medium">Ady *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 mb-1 text-sm font-medium">Düşündiriş</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                rows={3}
              />
            </div>
            <div className="col-span-2">
              <ImageUpload
                label="Baş surat"
                value={form.hero_image}
                onChange={(url) => setForm({ ...form, hero_image: url })}
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 text-sm font-medium">Etrapça</label>
              <input
                type="text"
                value={form.neighborhood}
                onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 mb-1 text-sm font-medium">Salgy</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 text-sm font-medium">Tagamlar (üteş bilen bölünen)</label>
              <input
                type="text"
                value={form.cuisines}
                onChange={e => setForm({ ...form, cuisines: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                placeholder="Turkmen, International..."
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 text-sm font-medium">Bellikler (üteş bilen bölünen)</label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm({ ...form, tags: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                placeholder="Family, Fine Dining..."
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 text-sm font-medium">Baha derejesi</label>
              <select
                value={form.price_tier}
                onChange={e => setForm({ ...form, price_tier: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              >
                <option value="$">$ (Arzan)</option>
                <option value="$$">$$ (Orta)</option>
                <option value="$$$">$$$ (Gymmat)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 text-sm font-medium">Telefon</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                placeholder="+993 12 XX XX XX"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 text-sm font-medium">Ýagdaý</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              >
                <option value="active">Işjeň</option>
                <option value="inactive">Işjeň däl</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Ýatyr
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-brand-500 to-brand-400 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Saklanýar...' : 'Restorany sakla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
