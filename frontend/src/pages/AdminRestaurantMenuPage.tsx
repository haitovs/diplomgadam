import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

interface MenuItem {
    id: number;
    name: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    image_url: string;
    is_available: number; // 0 or 1
}

interface Restaurant {
    id: string;
    name: string;
}

export default function AdminRestaurantMenuPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            navigate('/admin/login');
            return;
        }
        loadData();
    }, [id, navigate]);

    async function loadData() {
        try {
            setLoading(true);
            // Load restaurant details
            const resRest = await fetch(`http://localhost:4000/api/admin/restaurants/${id}`);
            const restData = await resRest.json();
            setRestaurant(restData);

            // Load menu items
            const resMenu = await fetch(`http://localhost:4000/api/admin/restaurants/${id}/menu`);
            const menuData = await resMenu.json();
            setMenuItems(menuData);
        } catch (err) {
            console.error('Failed to load data', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(itemId: number) {
        if (!confirm('Delete this menu item?')) return;
        try {
            await fetch(`http://localhost:4000/api/admin/menu/${itemId}`, { method: 'DELETE' });
            loadData();
        } catch (err) {
            console.error('Delete failed', err);
        }
    }

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            📝 Manage Menu: <span className="text-orange-500">{restaurant?.name}</span>
                        </h1>
                        <p className="text-slate-400 text-sm">Add and edit individual menu items</p>
                    </div>
                    <div className="flex gap-4">
                        <Link to="/admin/restaurants" className="px-4 py-2 text-slate-300 hover:text-white">← Back to Restaurants</Link>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl text-white font-semibold">Menu Items</h2>
                    <button
                        onClick={() => { setEditingItem(null); setShowForm(true); }}
                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg hover:opacity-90"
                    >
                        + Add Menu Item
                    </button>
                </div>

                {/* Table */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-900">
                            <tr>
                                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Image</th>
                                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Name</th>
                                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Category</th>
                                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Price</th>
                                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Status</th>
                                <th className="px-4 py-3 text-left text-slate-400 text-sm font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                                </tr>
                            ) : menuItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No menu items found. Add one!</td>
                                </tr>
                            ) : (
                                menuItems.map(item => (
                                    <tr key={item.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                                        <td className="px-4 py-3">
                                            {item.image_url && <img src={item.image_url} alt="" className="w-12 h-12 object-cover rounded" />}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-white font-medium">{item.name}</div>
                                            <div className="text-slate-400 text-xs truncate max-w-[200px]">{item.description}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-300">{item.category}</td>
                                        <td className="px-4 py-3 text-orange-400 font-bold">{item.price} {item.currency}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs ${item.is_available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {item.is_available ? 'Available' : 'Unavailable'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setEditingItem(item); setShowForm(true); }}
                                                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
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
                <MenuForm
                    restaurantId={id!}
                    item={editingItem}
                    onClose={() => { setShowForm(false); setEditingItem(null); }}
                    onSaved={() => { setShowForm(false); setEditingItem(null); loadData(); }}
                />
            )}
        </div>
    );
}

function MenuForm({ restaurantId, item, onClose, onSaved }: { restaurantId: string; item: MenuItem | null; onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState({
        name: item?.name || '',
        description: item?.description || '',
        price: item?.price || 0,
        category: item?.category || 'Main',
        image_url: item?.image_url || '',
        is_available: item?.is_available !== undefined ? item.is_available === 1 : true
    });
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const url = item
                ? `http://localhost:4000/api/admin/menu/${item.id}`
                : `http://localhost:4000/api/admin/restaurants/${restaurantId}/menu`;

            await fetch(url, {
                method: item ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    // Add item endpoint needs to be separate if structure differs, but here put works for update.
                    // For stats
                })
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
            <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">{item ? 'Edit Item' : 'Add Item'}</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-slate-300 mb-1 text-sm">Name *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-slate-300 mb-1 text-sm">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                            rows={2}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-300 mb-1 text-sm">Price (TMT) *</label>
                            <input
                                type="number"
                                value={form.price}
                                onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-slate-300 mb-1 text-sm">Category</label>
                            <input
                                type="text"
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                                placeholder="Starter, Main..."
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-slate-300 mb-1 text-sm">Image URL</label>
                        <input
                            type="text"
                            value={form.image_url}
                            onChange={e => setForm({ ...form, image_url: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_available"
                            checked={form.is_available}
                            onChange={e => setForm({ ...form, is_available: e.target.checked })}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-600"
                        />
                        <label htmlFor="is_available" className="text-slate-300 text-sm">Available</label>
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
                            {loading ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
