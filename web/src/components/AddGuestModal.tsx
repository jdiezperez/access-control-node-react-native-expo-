import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, X, Plus, Loader2, Upload, User, MapPin, Briefcase } from 'lucide-react';
import type { Guest } from '@/data/Types';
import { getImagePath } from '@/utils/imagePath';
import CountrySelect from './CountrySelect';

interface Field {
    id: number;
    event_id: number;
    field_name: string;
    field_type: 'text' | 'number' | 'yes/no' | 'options' | 'date' | 'country' | 'image';
    field_values?: string;
    field_order: number;
    required: number | boolean;
}

const AddGuestsModal = ({ onClose, onAdded, eventId }: { onClose: () => void, onAdded: () => void, eventId: string }) => {
    const token = localStorage.getItem('token');
    const [available, setAvailable] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [mode, setMode] = useState<'list' | 'create'>('list');
    const [fields, setFields] = useState<Field[]>([]);
    const [newGuest, setNewGuest] = useState<Record<string, any>>({});
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
        const fetchFields = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/fields`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setFields(res.data);

                // Initialize form state
                const initialData: Record<string, any> = {};
                res.data.forEach((f: any) => {
                    initialData[f.field_name] = '';
                });
                initialData.image = '';
                setNewGuest(initialData);
            } catch (err) {
                console.error('Failed to fetch event fields', err);
            }
        };

        if (eventId) {
            fetchFields();
        }
    }, [eventId]);

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
            await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/guests`, { guestIds: selectedIds }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onAdded();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to add guests');
        }
    };

    const handleCreate = async () => {
        const missingRequired = fields.find(f => {
            const isReq = f.required === 1 || f.required === true;
            return isReq && !newGuest[f.field_name];
        });

        if (missingRequired) {
            alert(`Please fill in all mandatory fields (${missingRequired.field_name})`);
            return;
        }

        try {
            setSaving(true);
            setError(null);

            // Send guest data directly to the event endpoint to populate guestdata
            await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/guests/create`, {
                guestData: newGuest
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
        return !search || [g.name, g.surname, g.email, g.city, g.country].some(v => v?.toLowerCase().includes(searchLower));
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

                            <div className="border rounded-xl overflow-x-auto">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto p-2">
                            {fields.sort((a, b) => a.field_order - b.field_order).map(field => {
                                const value = newGuest[field.field_name] || '';
                                const onChange = (val: any) => setNewGuest(prev => ({ ...prev, [field.field_name]: val }));
                                const isRequired = field.required === 1 || field.required === true;
                                const labelText = `${field.field_name.charAt(0).toUpperCase() + field.field_name.slice(1)}${isRequired ? ' *' : ''}`;

                                switch (field.field_type) {
                                    case 'image':
                                        return (
                                            <div key={field.id} className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    {labelText}
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative group">
                                                        <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
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
                                            </div>

                                        );
                                    case 'country':
                                        return (
                                            <div key={field.id} className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    {labelText}
                                                </label>
                                                <CountrySelect
                                                    value={value}
                                                    onChange={onChange}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                                />
                                            </div>
                                        );
                                    case 'number':
                                        return (
                                            <div key={field.id} className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    {labelText}
                                                </label>
                                                <input
                                                    required={isRequired}
                                                    type="number"
                                                    value={value}
                                                    onChange={e => onChange(e.target.value)}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                />
                                            </div>
                                        );
                                    case 'yes/no':
                                        return (
                                            <div key={field.id} className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                                    {labelText}
                                                </label>
                                                <div className="flex gap-6 items-center py-2">
                                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={field.field_name}
                                                            value="yes"
                                                            checked={value === 'yes'}
                                                            onChange={() => onChange('yes')}
                                                            required={isRequired}
                                                            className="w-4 h-4 text-primary focus:ring-primary"
                                                        />
                                                        Yes
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={field.field_name}
                                                            value="no"
                                                            checked={value === 'no'}
                                                            onChange={() => onChange('no')}
                                                            required={isRequired}
                                                            className="w-4 h-4 text-primary focus:ring-primary"
                                                        />
                                                        No
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    case 'options':
                                        return (
                                            <div key={field.id} className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    {labelText}
                                                </label>
                                                <select
                                                    required={isRequired}
                                                    value={value}
                                                    onChange={e => onChange(e.target.value)}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                                >
                                                    <option value="">Select option</option>
                                                    {field.field_values?.split('|').map(v => v.trim()).filter(Boolean).map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    case 'date':
                                        return (
                                            <div key={field.id} className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    {labelText}
                                                </label>
                                                <input
                                                    required={isRequired}
                                                    type="date"
                                                    value={value}
                                                    onChange={e => onChange(e.target.value)}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                />
                                            </div>
                                        );
                                    case 'text':
                                    default:
                                        return (
                                            <div key={field.id} className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                    {labelText}
                                                </label>
                                                <input
                                                    required={isRequired}
                                                    type="text"
                                                    value={value}
                                                    onChange={e => onChange(e.target.value)}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                />
                                            </div>
                                        );
                                }
                            })}
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