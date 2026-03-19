import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Category {
  id: number;
  name: string;
  icon: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadCategories();
  }, [navigate]);

  async function loadCategories() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bu kategoriýany pozmak?')) return;
    try {
      await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      loadCategories();
    } catch (err) {
      console.error('Delete failed', err);
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
            <h1 className="text-2xl font-bold text-white">🍽️ Kategoriýalar</h1>
            <p className="text-slate-400 text-sm">Restoran kategoriýalaryny dolandyryň</p>
          </div>
          <div className="flex gap-4">
            <Link to="/" className="px-4 py-2 text-slate-300 hover:text-white">Sahypany gör</Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
              Çykyş
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation */}
        <nav className="flex gap-4 mb-6">
          <Link to="/admin" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Dolandyryş paneli</Link>
          <Link to="/admin/restaurants" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Restoranlar</Link>
          <Link to="/admin/categories" className="px-4 py-2 bg-orange-500 text-white rounded-lg">Kategoriýalar</Link>
        </nav>

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-slate-400 text-sm">
            Jemi: {categories.length} kategoriýa
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg hover:opacity-90"
          >
            + Kategoriýa goş
          </button>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="text-center text-slate-400 py-12">Ýüklenýär...</div>
        ) : categories.length === 0 ? (
          <div className="text-center text-slate-400 py-12">Kategoriýa tapylmady</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-white font-medium">{cat.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-sm"
                >
                  Poz
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {showForm && (
        <CategoryForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadCategories(); }}
        />
      )}
    </div>
  );
}

function CategoryForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🍽️');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon: icon.trim() || '🍽️' })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Näsazlyk ýüze çykdy');
        return;
      }

      onSaved();
    } catch (err) {
      console.error('Save failed', err);
      setError('Näsazlyk ýüze çykdy');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Kategoriýa goş</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-slate-300 mb-1 text-sm">Ady *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">Nyşan</label>
            <input
              type="text"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              placeholder="🍽️"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              Ýatyr
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Saklanýar...' : 'Sakla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
