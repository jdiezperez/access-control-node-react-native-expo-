import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Plus, Search, ChevronUp, ChevronDown, Filter, Loader2, Unlink, Globe, Mail, Phone } from 'lucide-react';
import type { Sponsor } from '@/data/Types';
import AddSponsorModal from '../components/AddSponsorModal';

const EventsSponsors = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [sortField, setSortField] = useState<keyof Sponsor>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchEventSponsors();
    }, [id]);

    const fetchEventSponsors = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/admin/events/${id}/sponsors`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSponsors(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveSponsor = async (sponsorId: number) => {
        if (!window.confirm('Are you sure you want to remove this sponsor from the event?')) return;
        try {
            await axios.delete(`/api/admin/events/${id}/sponsors/${sponsorId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchEventSponsors();
        } catch (err) {
            alert('Failed to remove sponsor');
        }
    };

    const handleSort = (field: keyof Sponsor) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const filteredSponsors = sponsors.filter(s => {
        const searchLower = search.toLowerCase();
        return !search || [
            s.name, s.description, s.contact, s.contact_email, s.contact_phone, s.country
        ].some(val => val?.toLowerCase().includes(searchLower));
    }).sort((a, b) => {
        const valA = a[sortField] || '';
        const valB = b[sortField] || '';
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2 border border-white/10 rounded-2xl hover:bg-white/5 hover:text-white transition-all text-slate-400"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-3xl font-black text-white tracking-tight">Event Sponsors</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white font-bold shadow-xl shadow-blue-500/30 hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                        <Plus size={16} /> Add Sponsors
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-3xl border border-white/10 p-6" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search sponsors by name, contact, phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                    />
                </div>
            </div>

            {/* Table Card */}
            <div className="rounded-3xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-primary" size={40} />
                        <p className="text-slate-400 font-medium">Loading sponsors...</p>
                    </div>
                ) : filteredSponsors.length === 0 ? (
                    <div className="p-12 text-center">
                        <Filter className="mx-auto text-slate-500 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-white">No sponsors found</h3>
                        <p className="text-slate-400">No sponsors assigned to this event or matching your search.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/10 border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest font-black">Logo</th>
                                        {['name', 'contact', 'contact_email', 'contact_phone', 'country'].map(field => (
                                            <th
                                                key={field}
                                                onClick={() => handleSort(field as keyof Sponsor)}
                                                className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest font-black cursor-pointer hover:text-white transition-colors"
                                            >
                                                <div className="flex items-center gap-1">
                                                    {field.replace('_', ' ')}
                                                    {sortField === field && (
                                                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest font-black text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredSponsors.map(sponsor => (
                                        <tr key={sponsor.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                {sponsor.logo ? (
                                                    <img src={sponsor.logo} alt={sponsor.name} className="w-10 h-10 object-contain rounded bg-white border border-white/10" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center text-slate-400 border border-white/10">
                                                        <Globe size={20} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-white">{sponsor.name}</div>
                                                {sponsor.url && (
                                                    <a href={sponsor.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                                                        <Globe size={10} /> {sponsor.url.substring(0, 20)}
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">{sponsor.contact || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Mail size={14} className="text-slate-500" />
                                                    {sponsor.contact_email || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Phone size={14} className="text-slate-500" />
                                                    {sponsor.contact_phone || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">{sponsor.country || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleRemoveSponsor(sponsor.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/10 transition-all"
                                                    title="Remove from event"
                                                >
                                                    <Unlink size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile/Tablet Card View */}
                        <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                            {filteredSponsors.map(sponsor => (
                                <div key={sponsor.id} className="rounded-2xl border border-white/10 p-5 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-white/10 p-1 shrink-0">
                                            {sponsor.logo ? (
                                                <img src={sponsor.logo} alt={sponsor.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <Globe size={20} className="text-slate-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-base truncate">{sponsor.name}</h3>
                                            {sponsor.url && (
                                                <a href={sponsor.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                                                    <Globe size={10} /> {sponsor.url.substring(0, 25)}
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 text-xs text-slate-400 border-t border-white/5 pt-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-slate-300">{sponsor.contact || '-'}</span>
                                        </div>
                                        {sponsor.contact_email && (
                                            <div className="flex items-center gap-1.5">
                                                <Mail size={12} className="text-slate-500" /> {sponsor.contact_email}
                                            </div>
                                        )}
                                        {sponsor.contact_phone && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone size={12} className="text-slate-500" /> {sponsor.contact_phone}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-slate-500">Country:</span> <span className="text-slate-300">{sponsor.country || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                                        <button
                                            onClick={() => handleRemoveSponsor(sponsor.id)}
                                            className="w-full flex items-center justify-center gap-2 py-2 border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 rounded-xl text-xs font-semibold text-red-400 transition-all"
                                        >
                                            <Unlink size={14} /> Remove Sponsor
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Add Sponsors Modal */}
            {showAddModal && <AddSponsorModal onClose={() => setShowAddModal(false)} onAdded={fetchEventSponsors} eventId={id!} />}
        </div>
    );
};

export default EventsSponsors;
