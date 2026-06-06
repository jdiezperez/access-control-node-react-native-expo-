import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, X, Plus, Loader2, Upload, User, MapPin, Briefcase } from 'lucide-react';
import type { Guest } from '@/data/Types';
import { getImagePath } from '@/utils/imagePath';

const AddGuestsModal = ({ onClose, onAdded, eventId }: { onClose: () => void, onAdded: () => void, eventId: string }) => {
    const token = localStorage.getItem('token');
    const [available, setAvailable] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [mode, setMode] = useState<'list' | 'create'>('list');
    const [newGuest, setNewGuest] = useState({
        name: '',
        surname: '',
        email: '',
        role: '',
        organization: '',
        city: '',
        country: '',
        gender: '',
        image: ''
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            setUploading(true);
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/admin/upload?folder=users', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewGuest(prev => ({ ...prev, image: res.data.url }));
        } catch (err: any) {
            setError('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };
    const pageSize = 5;

    useEffect(() => {
        fetchAvailable();
    }, [eventId]);

    const fetchAvailable = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/available-guests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailable(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleAdd = async () => {
        if (selectedIds.length === 0) return;
        try {
            setError(null);
            await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/guests`, { userIds: selectedIds }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onAdded();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to add guests');
        }
    };

    const handleCreate = async () => {
        if (!newGuest.name || !newGuest.surname || !newGuest.email) {
            alert('Please fill in all mandatory fields (Name, Surname, Email)');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            // 1. Create the user
            const userRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/users`, {
                ...newGuest,
                type: 'guest'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newUserId = userRes.data.id;

            // 2. Add to event
            await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/guests`, {
                userIds: [newUserId]
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onAdded();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create guest');
        } finally {
            setSaving(false);
        }
    };

    const filtered = available.filter(g => {
        const searchLower = search.toLowerCase();
        return !search || [g.name, g.surname, g.email, g.organization].some(v => v?.toLowerCase().includes(searchLower));
    });

    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-slate-800">
                            {mode === 'list' ? 'Assign Guests to Event' : 'Create New Guest'}
                        </h3>
                        <p className="text-xs text-slate-500">
                            {mode === 'list' ? 'Select from existing guests' : 'Enter details for the new attendee'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {mode === 'list' && (
                            <button
                                onClick={() => { setMode('create'); setError(null); }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all text-sm font-bold shadow-sm"
                            >
                                <Plus size={16} /> Add New
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                </div>

                <div className="p-8 flex-1 overflow-auto space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between">
                            <span>{error}</span>
                            <button onClick={() => setError(null)}><X size={14} /></button>
                        </div>
                    )}
                    {mode === 'list' ? (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search available guests..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            <div className="border rounded-xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={paginated.length > 0 && paginated.every(g => selectedIds.includes(g.id))}
                                                    onChange={e => {
                                                        const ids = paginated.map(g => g.id);
                                                        if (e.target.checked) {
                                                            setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
                                                        } else {
                                                            setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
                                                        }
                                                    }}
                                                    className="rounded text-primary"
                                                />
                                            </th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest</th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Role / Gender</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
                                        ) : paginated.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">No guests available</td></tr>
                                        ) : paginated.map(g => (
                                            <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(g.id)}
                                                        onChange={() => handleToggleSelect(g.id)}
                                                        className="rounded text-primary"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                                            {g.image ? (
                                                                <img src={getImagePath(g.image, 'users')} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User size={20} className="text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-700">{g.name} {g.surname}</div>
                                                            <div className="text-xs text-slate-400 font-medium">{g.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-slate-600">{g.organization || '-'}</div>
                                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                                        <MapPin size={10} /> {g.city}{g.city && g.country ? ', ' : ''}{g.country || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-slate-600 flex items-center gap-1">
                                                        <Briefcase size={14} className="text-slate-400" /> {g.role || '-'}
                                                    </div>
                                                    <div className="text-xs text-slate-400 capitalize">{g.gender || '-'}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-4">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                        className="px-4 py-2 bg-slate-100 rounded-lg disabled:opacity-50 text-sm font-semibold"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm font-medium text-slate-500">Page {page} of {totalPages}</span>
                                    <button
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                        className="px-4 py-2 bg-slate-100 rounded-lg disabled:opacity-50 text-sm font-semibold"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2">
                            <div className="md:col-span-2 flex justify-center pb-4">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
                                        {newGuest.image ? (
                                            <img src={newGuest.image} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="text-slate-300" size={40} />
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                                <Loader2 className="animate-spin text-primary" size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <label className="absolute -bottom-1 -right-1 p-2 bg-primary text-white rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
                                        <Upload size={14} />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Name *</label>
                                <input
                                    type="text"
                                    value={newGuest.name}
                                    onChange={e => setNewGuest({ ...newGuest, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="First Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Surname *</label>
                                <input
                                    type="text"
                                    value={newGuest.surname}
                                    onChange={e => setNewGuest({ ...newGuest, surname: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Last Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Email *</label>
                                <input
                                    type="email"
                                    value={newGuest.email}
                                    onChange={e => setNewGuest({ ...newGuest, email: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                                <select
                                    value={newGuest.gender}
                                    onChange={e => setNewGuest({ ...newGuest, gender: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="">Select gender</option>
                                    <option value="female">Female</option>
                                    <option value="male">Male</option>
                                    <option value="non binary">Non Binary</option>
                                    <option value="other">Other</option>
                                    <option value="prefer not to say">Prefer not to say</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                                <input
                                    type="text"
                                    value={newGuest.role}
                                    onChange={e => setNewGuest({ ...newGuest, role: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="e.g. CEO, Developer"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Organization</label>
                                <input
                                    type="text"
                                    value={newGuest.organization}
                                    onChange={e => setNewGuest({ ...newGuest, organization: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Company Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">City</label>
                                <input
                                    type="text"
                                    value={newGuest.city}
                                    onChange={e => setNewGuest({ ...newGuest, city: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Country</label>
                                <input
                                    type="text"
                                    value={newGuest.country}
                                    onChange={e => setNewGuest({ ...newGuest, country: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">
                        {mode === 'list' ? `${selectedIds.length} guests selected` : '* Mandatory fields'}
                    </span>
                    <div className="flex gap-4">
                        <button
                            onClick={mode === 'list' ? onClose : () => { setMode('list'); setError(null); }}
                            className="px-6 py-2 text-slate-600 font-semibold hover:text-slate-800 transition-colors"
                        >
                            {mode === 'list' ? 'Cancel' : 'Back to List'}
                        </button>
                        <button
                            onClick={mode === 'list' ? handleAdd : handleCreate}
                            disabled={(mode === 'list' && selectedIds.length === 0) || (mode === 'create' && saving)}
                            className="px-8 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {saving && <Loader2 className="animate-spin" size={18} />}
                            {mode === 'list' ? 'Add to Event' : 'Create & Add'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddGuestsModal;