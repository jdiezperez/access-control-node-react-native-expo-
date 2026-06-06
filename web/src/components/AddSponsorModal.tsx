import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, X, Plus, Loader2, Image as ImageIcon } from 'lucide-react';
import type { Sponsor } from '@/data/Types';

const AddSponsorModal = ({ onClose, onAdded, eventId }: { onClose: () => void, onAdded: () => void, eventId: string }) => {
    const token = localStorage.getItem('token');
    const [available, setAvailable] = useState<Sponsor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [mode, setMode] = useState<'list' | 'create'>('list');
    const [newSponsor, setNewSponsor] = useState({
        name: '',
        description: '',
        logo: '',
        url: '',
        contact: '',
        contact_email: '',
        contact_phone: '',
        country: ''
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pageSize = 5;

    useEffect(() => {
        fetchAvailable();
    }, [eventId]);

    const fetchAvailable = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/admin/events/${eventId}/available-sponsors`, {
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

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            setUploading(true);
            setError(null);
            const res = await axios.post('/api/admin/upload?folder=sponsors', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`
                }
            });
            setNewSponsor(prev => ({ ...prev, logo: res.data.url }));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to upload logo');
        } finally {
            setUploading(false);
        }
    };

    const handleAdd = async () => {
        if (selectedIds.length === 0) return;
        try {
            setError(null);
            await axios.post(`/api/admin/events/${eventId}/sponsors`, { sponsorIds: selectedIds }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onAdded();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to add sponsors');
        }
    };

    const handleCreate = async () => {
        if (!newSponsor.name) {
            alert('Please fill in the Sponsor Name');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            
            // 1. Create the sponsor
            const res = await axios.post(`/api/admin/sponsors`, newSponsor, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newSponsorId = res.data.id;

            // 2. Add to event
            await axios.post(`/api/admin/events/${eventId}/sponsors`, { 
                sponsorIds: [newSponsorId] 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onAdded();
            onClose();
        } catch (err: any) {
            console.error('Form submission error:', err);
            setError(err.response?.data?.message || 'Failed to create sponsor');
        } finally {
            setSaving(false);
        }
    };

    const filtered = available.filter(s => {
        const searchLower = search.toLowerCase();
        return !search || [s.name, s.description, s.contact, s.contact_email].some(v => v?.toLowerCase().includes(searchLower));
    });

    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filtered.length / pageSize);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-slate-800">
                            {mode === 'list' ? 'Assign Sponsors to Event' : 'Create New Sponsor'}
                        </h3>
                        <p className="text-xs text-slate-500">
                            {mode === 'list' ? 'Select from existing sponsors' : 'Enter details for the new sponsor'}
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
                                    placeholder="Search available sponsors..."
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
                                                    checked={paginated.length > 0 && paginated.every(s => selectedIds.includes(s.id))}
                                                    onChange={e => {
                                                        const ids = paginated.map(s => s.id);
                                                        if (e.target.checked) {
                                                            setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
                                                        } else {
                                                            setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
                                                        }
                                                    }}
                                                    className="rounded text-primary"
                                                />
                                            </th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Sponsor</th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
                                        ) : paginated.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">No sponsors available</td></tr>
                                        ) : paginated.map(s => (
                                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(s.id)}
                                                        onChange={() => handleToggleSelect(s.id)}
                                                        className="rounded text-primary"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-700">{s.name}</div>
                                                    <div className="text-xs text-slate-400 truncate max-w-xs">{s.description}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-600">{s.contact || '-'}</div>
                                                    <div className="text-xs text-slate-400">{s.contact_email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-600">{s.country || '-'}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary transition-colors bg-slate-50/50">
                                {newSponsor.logo ? (
                                    <div className="relative w-32 h-32 group">
                                        <img src={newSponsor.logo} alt="Logo Preview" className="w-full h-full object-contain rounded-lg" />
                                        <button 
                                            onClick={() => setNewSponsor({ ...newSponsor, logo: '' })}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-4 bg-white rounded-full shadow-sm">
                                            {uploading ? <Loader2 className="animate-spin text-primary" size={32} /> : <ImageIcon className="text-slate-400" size={32} />}
                                        </div>
                                        <div className="text-center">
                                            <label className="text-sm font-bold text-primary cursor-pointer hover:underline">
                                                Click to upload logo
                                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                                            </label>
                                            <p className="text-xs text-slate-500 mt-1">PNG, JPG or SVG up to 2MB</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Sponsor Name *</label>
                                <input
                                    type="text"
                                    value={newSponsor.name}
                                    onChange={e => setNewSponsor({ ...newSponsor, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Company Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Website URL</label>
                                <input
                                    type="text"
                                    value={newSponsor.url}
                                    onChange={e => setNewSponsor({ ...newSponsor, url: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                                <textarea
                                    value={newSponsor.description}
                                    onChange={e => setNewSponsor({ ...newSponsor, description: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px]"
                                    placeholder="Brief description of the sponsor..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Contact Person</label>
                                <input
                                    type="text"
                                    value={newSponsor.contact}
                                    onChange={e => setNewSponsor({ ...newSponsor, contact: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Full Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Contact Email</label>
                                <input
                                    type="email"
                                    value={newSponsor.contact_email}
                                    onChange={e => setNewSponsor({ ...newSponsor, contact_email: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Contact Phone</label>
                                <input
                                    type="text"
                                    value={newSponsor.contact_phone}
                                    onChange={e => setNewSponsor({ ...newSponsor, contact_phone: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Country</label>
                                <input
                                    type="text"
                                    value={newSponsor.country}
                                    onChange={e => setNewSponsor({ ...newSponsor, country: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm text-slate-500 font-medium">
                        {mode === 'list' ? `${selectedIds.length} sponsors selected` : '* Mandatory fields'}
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

export default AddSponsorModal;