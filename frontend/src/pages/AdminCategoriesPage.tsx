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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">🍽️ Kategoriýalar</h1>
            <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">Restoran kategoriýalaryny dolandyryň</p>
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
          <Link to="/admin/restaurants" className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Restoranlar</Link>
          <Link to="/admin/categories" className="px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-lg shadow-md shadow-brand-500/30">Kategoriýalar</Link>
        </nav>

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">
            Jemi: {categories.length} kategoriýa
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-gradient-to-r from-brand-500 to-brand-400 text-white font-semibold rounded-lg hover:opacity-90"
          >
            + Kategoriýa goş
          </button>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">Ýüklenýär...</div>
        ) : categories.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-12">Kategoriýa tapylmady</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-slate-900 dark:text-white font-medium">{cat.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="px-3 py-1 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded hover:bg-rose-200 dark:hover:bg-rose-500/30 transition-colors text-sm"
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Kategoriýa goş</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1 text-sm font-medium">Ady *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1 text-sm font-medium">Nyşan</label>
            <input
              type="text"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
              placeholder="🍽️"
            />
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
              {loading ? 'Saklanýar...' : 'Sakla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
