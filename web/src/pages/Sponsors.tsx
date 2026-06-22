import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Search, Mail, Globe, MapPin, Loader2, Calendar, Image as ImageIcon } from 'lucide-react';
import { getImagePath } from '@/utils/imagePath';
import SponsorModal from '@/components/SponsorModal';

const Sponsors = () => {
    const [sponsors, setSponsors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [history, setHistory] = useState<{ [key: number]: any[] }>({});
    const [historyLoading, setHistoryLoading] = useState<number | null>(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sponsorToEdit, setSponsorToEdit] = useState<any>(null);

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchSponsors();
    }, []);

    const fetchSponsors = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/sponsors`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSponsors(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (sponsorId: number) => {
        if (history[sponsorId]) return;
        try {
            setHistoryLoading(sponsorId);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/sponsors/${sponsorId}/events`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(prev => ({ ...prev, [sponsorId]: res.data }));
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(null);
        }
    };

    const toggleExpand = (sponsorId: number) => {
        if (expandedId === sponsorId) {
            setExpandedId(null);
        } else {
            setExpandedId(sponsorId);
            fetchHistory(sponsorId);
        }
    };

    const handleEdit = (sponsor: any) => {
        setSponsorToEdit(sponsor);
        setIsModalOpen(true);
    };

    const handleDeleteSponsor = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this sponsor?')) {
            try {
                await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/sponsors/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSponsors(sponsors.filter(s => s.id !== id));
            } catch (err) {
                alert('Error deleting sponsor');
            }
        }
    };

    const filtered = sponsors.filter(s => {
        const query = search.toLowerCase();
        return !search || [s.name, s.description, s.contact, s.contact_email].some(v => v?.toLowerCase().includes(query));
    });

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-primary" size={40} />
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div
                        className="p-4 rounded-3xl shadow-lg shadow-blue-500/20"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                        <ImageIcon size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Sponsors</h1>
                        <p className="text-slate-400 font-medium mt-0.5">
                            Manage global sponsors and their event participation.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setSponsorToEdit(null); setIsModalOpen(true); }}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white font-bold shadow-xl shadow-blue-500/30 hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                        <Plus size={18} /> Add New
                    </button>
                </div>
            </div>

            {/* Content Card */}
            <div className="rounded-3xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
                {/* Search Bar */}
                <div className="p-4 border-b border-white/10 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search sponsors by name, email, or description..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                            style={{ background: 'rgba(255,255,255,0.03)' }}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black/10">
                                <tr>
                                    <th className="px-6 py-4 w-10"></th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Sponsor</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Location</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Events</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map(sponsor => (
                                    <React.Fragment key={sponsor.id}>
                                        <tr className={`hover:bg-white/5 transition-colors ${expandedId === sponsor.id ? 'bg-white/5' : ''}`}>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleExpand(sponsor.id)}
                                                    className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-all"
                                                    style={{ background: 'rgba(255,255,255,0.03)' }}
                                                >
                                                    {expandedId === sponsor.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-white/10 p-1">
                                                        {sponsor.logo ? (
                                                            <img src={getImagePath(sponsor.logo, 'sponsors')} alt="" className="w-full h-full object-contain" />
                                                        ) : (
                                                            <ImageIcon size={20} className="text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className="max-w-xs">
                                                        <div className="font-bold text-white truncate">{sponsor.name}</div>
                                                        <div className="text-xs text-slate-400 truncate">{sponsor.description || 'No description'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-slate-300">{sponsor.contact || '-'}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                    <Mail size={12} /> {sponsor.contact_email || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-300 flex items-center gap-1">
                                                    <MapPin size={14} className="text-slate-500" /> {sponsor.country || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold border border-blue-500/20">
                                                        {sponsor.event_count || 0} Linked
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    {sponsor.url && (
                                                        <a
                                                            href={sponsor.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/10 transition-all"
                                                            title="Website"
                                                        >
                                                            <Globe size={16} />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleEdit(sponsor)}
                                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/10 transition-all"
                                                        title="Edit Sponsor"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSponsor(sponsor.id)}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/10 transition-all"
                                                        title="Delete Sponsor"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedId === sponsor.id && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-0 border-none">
                                                    <div className="py-6 pl-16 pr-6 bg-black/10 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                            <div className="px-6 py-4 border-b border-white/10 bg-black/10 flex items-center justify-between">
                                                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                                    <Calendar size={16} className="text-primary" /> Event Participation History
                                                                </h4>
                                                            </div>
                                                            <div className="p-0">
                                                                {historyLoading === sponsor.id ? (
                                                                    <div className="p-8 flex justify-center">
                                                                        <Loader2 className="animate-spin text-primary" size={24} />
                                                                    </div>
                                                                ) : !history[sponsor.id] || history[sponsor.id].length === 0 ? (
                                                                    <div className="p-8 text-center text-slate-500 text-sm italic">
                                                                        No event participation found for this sponsor.
                                                                    </div>
                                                                ) : (
                                                                    <table className="w-full text-left">
                                                                        <thead className="bg-black/10">
                                                                            <tr>
                                                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event Name</th>
                                                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-white/5">
                                                                            {history[sponsor.id].map((ev, i) => (
                                                                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                                                                    <td className="px-6 py-3 text-sm font-semibold text-white">{ev.name}</td>
                                                                                    <td className="px-6 py-3 text-sm text-slate-400">
                                                                                        {ev.date ? new Date(ev.date).toLocaleDateString() : '-'}
                                                                                    </td>
                                                                                    <td className="px-6 py-3">
                                                                                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-[10px] font-bold uppercase border border-green-500/20">
                                                                                            Linked
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Tablet Card View */}
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                        {filtered.map(sponsor => (
                            <div key={sponsor.id} className="rounded-2xl border border-white/10 p-5 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-white/10 p-1 shrink-0">
                                        {sponsor.logo ? (
                                            <img src={getImagePath(sponsor.logo, 'sponsors')} alt="" className="w-full h-full object-contain" />
                                        ) : (
                                            <ImageIcon size={20} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-base truncate">{sponsor.name}</h3>
                                        <p className="text-xs text-slate-400 truncate mt-0.5">{sponsor.description || 'No description'}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleExpand(sponsor.id)}
                                        className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-all shrink-0 self-center"
                                        style={{ background: 'rgba(255,255,255,0.03)' }}
                                    >
                                        {expandedId === sponsor.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                </div>

                                <div className="flex flex-col gap-1.5 text-xs text-slate-400 border-t border-white/5 pt-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-300">{sponsor.contact || '-'}</span>
                                        {sponsor.contact_email && <span className="text-[10px] text-slate-500 font-medium">({sponsor.contact_email})</span>}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MapPin size={12} className="text-slate-500" /> {sponsor.country || '-'}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-bold border border-blue-500/20 uppercase">
                                        {sponsor.event_count || 0} Linked
                                    </span>
                                </div>

                                {/* Expanded History Section for mobile */}
                                {expandedId === sponsor.id && (
                                    <div className="border-t border-white/10 pt-4 mt-2 space-y-3">
                                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                            <Calendar size={14} className="text-primary" /> Event Participation History
                                        </h4>
                                        {historyLoading === sponsor.id ? (
                                            <div className="py-4 flex justify-center">
                                                <Loader2 className="animate-spin text-primary" size={20} />
                                            </div>
                                        ) : !history[sponsor.id] || history[sponsor.id].length === 0 ? (
                                            <p className="text-xs text-slate-500 italic text-center py-2">No event participation found.</p>
                                        ) : (
                                            <div className="space-y-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                                {history[sponsor.id].map((ev, i) => (
                                                    <div key={i} className="flex items-center justify-between text-xs pb-2 border-b border-white/5 last:border-b-0 last:pb-0">
                                                        <span className="font-semibold text-white truncate max-w-[180px]">{ev.name}</span>
                                                        <span className="text-[10px] text-slate-500">{ev.date ? new Date(ev.date).toLocaleDateString() : '-'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                                    {sponsor.url && (
                                        <a
                                            href={sponsor.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/10 transition-all mr-auto"
                                            title="Website"
                                        >
                                            <Globe size={14} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleEdit(sponsor)}
                                        className="flex-1 max-w-[100px] flex items-center justify-center gap-2 py-2 border border-white/10 rounded-xl hover:text-white hover:bg-white/5 transition-all text-xs font-semibold text-slate-300"
                                    >
                                        <Edit2 size={12} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteSponsor(sponsor.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/10 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            </div>

            <SponsorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchSponsors}
                sponsorToEdit={sponsorToEdit}
            />
        </div>
    );
};

export default Sponsors;
