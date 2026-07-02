import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, Upload, Plus, ChevronDown, ChevronRight, Edit2, Trash2, Calendar, Loader2, Search, User, MapPin, Briefcase } from 'lucide-react';
import { getImagePath } from '@/utils/imagePath';
import GuestModal from '@/components/GuestModal';

const Guests = () => {
    const [guests, setGuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [history, setHistory] = useState<{ [key: number]: any[] }>({});
    const [historyLoading, setHistoryLoading] = useState<number | null>(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [guestToEdit, setGuestToEdit] = useState<any>(null);

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchGuests();
    }, []);

    const fetchGuests = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/guests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(res.data);
            setGuests(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (guestId: number) => {
        if (history[guestId]) return;
        try {
            setHistoryLoading(guestId);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/guests/${guestId}/events`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(prev => ({ ...prev, [guestId]: res.data }));
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(null);
        }
    };

    const toggleExpand = (guestId: number) => {
        if (expandedId === guestId) {
            setExpandedId(null);
        } else {
            setExpandedId(guestId);
            fetchHistory(guestId);
        }
    };

    const handleEdit = (guest: any) => {
        setGuestToEdit(guest);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this guest?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGuests(guests.filter(g => g.id !== id));
        } catch (err) {
            alert('Failed to delete guest');
        }
    };

    const filtered = guests.filter(g => {
        const s = search.toLowerCase();
        return !search || [g.name, g.surname, g.email, g.organization].some(v => v?.toLowerCase().includes(s));
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
                        <User size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Guests</h1>
                        <p className="text-slate-400 font-medium mt-0.5">
                            Manage your global guest list and their event history.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-3 border border-white/10 rounded-2xl hover:text-white hover:bg-white/5 transition-all font-semibold text-slate-400">
                        <Upload size={18} /> Import CSV
                    </button>
                    <button
                        onClick={() => { setGuestToEdit(null); setIsModalOpen(true); }}
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
                            placeholder="Search guests by name, email, or organization..."
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
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Guest</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Organization</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Role / Gender</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Events</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map(guest => (
                                    <React.Fragment key={guest.id}>
                                        <tr className={`hover:bg-white/5 transition-colors ${expandedId === guest.id ? 'bg-white/5' : ''}`}>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleExpand(guest.id)}
                                                    className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-all"
                                                    style={{ background: 'rgba(255,255,255,0.03)' }}
                                                >
                                                    {expandedId === guest.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-white/10">
                                                        {guest.image ? (
                                                            <img src={`${import.meta.env.VITE_API_URL}${getImagePath(guest.image, 'users')}`} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={20} className="text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white">{guest.name} {guest.surname}</div>
                                                        <div className="text-xs text-slate-400 font-medium">{guest.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-slate-300">{guest.organization || '-'}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <MapPin size={10} /> {guest.city}{guest.city && guest.country ? ', ' : ''}{guest.country || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-300 flex items-center gap-1">
                                                    <Briefcase size={14} className="text-slate-500" /> {guest.role || '-'}
                                                </div>
                                                <div className="text-xs text-slate-500 capitalize">{guest.gender || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-bold border border-blue-500/20">
                                                        {guest.event_count || 0} Events
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(guest)}
                                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/10 transition-all"
                                                        title="Edit Guest"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(guest.id)}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/10 transition-all"
                                                        title="Delete Guest"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedId === guest.id && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-0 border-none">
                                                    <div className="py-6 pl-16 pr-6 bg-black/10 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                            <div className="px-6 py-4 border-b border-white/10 bg-black/10 flex items-center justify-between">
                                                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                                    <Calendar size={16} className="text-primary" /> Event Attendance History
                                                                </h4>
                                                            </div>
                                                            <div className="p-0">
                                                                {historyLoading === guest.id ? (
                                                                    <div className="p-8 flex justify-center">
                                                                        <Loader2 className="animate-spin text-primary" size={24} />
                                                                    </div>
                                                                ) : !history[guest.id] || history[guest.id].length === 0 ? (
                                                                    <div className="p-8 text-center text-slate-500 text-sm italic">
                                                                        No event history found for this guest.
                                                                    </div>
                                                                ) : (
                                                                    <table className="w-full text-left">
                                                                        <thead className="bg-black/10">
                                                                            <tr>
                                                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event Name</th>
                                                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Invited</th>
                                                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Accepted</th>
                                                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Attended</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-white/5">
                                                                            {history[guest.id].map((ev, i) => (
                                                                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                                                                    <td className="px-6 py-3 text-sm font-semibold text-white">{ev.name}</td>
                                                                                    <td className="px-6 py-3 text-sm text-slate-400">
                                                                                        {ev.date_start ? new Date(ev.date_start).toLocaleDateString() : '-'}
                                                                                    </td>
                                                                                    <td className="px-6 py-3 text-center">
                                                                                        {ev.invited ? <Check size={16} className="mx-auto text-blue-400" /> : <X size={16} className="mx-auto text-slate-600" />}
                                                                                    </td>
                                                                                    <td className="px-6 py-3 text-center">
                                                                                        {ev.accepted ? <Check size={16} className="mx-auto text-green-400" /> : <X size={16} className="mx-auto text-slate-600" />}
                                                                                    </td>
                                                                                    <td className="px-6 py-3 text-center">
                                                                                        {ev.attended ? <Check size={16} className="mx-auto text-purple-400" /> : <X size={16} className="mx-auto text-slate-600" />}
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
                        {filtered.map(guest => (
                            <div key={guest.id} className="rounded-2xl border border-white/10 p-5 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                        {guest.image ? (
                                            <img src={`${import.meta.env.VITE_API_URL}${getImagePath(guest.image, 'users')}`} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={20} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-base capitalize truncate">{guest.name} {guest.surname}</h3>
                                        <p className="text-xs text-slate-400 truncate mt-0.5">{guest.email}</p>
                                        <p className="text-xs text-slate-300 font-semibold mt-1 capitalize">{guest.role || 'No Role'} • {guest.organization || 'No Org'}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleExpand(guest.id)}
                                        className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-all shrink-0 self-center"
                                        style={{ background: 'rgba(255,255,255,0.03)' }}
                                    >
                                        {expandedId === guest.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                    <div className="text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-500" /> {guest.city || ''}{guest.city && guest.country ? ', ' : ''}{guest.country || '-'}</span>
                                    </div>
                                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-bold border border-blue-500/20 uppercase">
                                        {guest.event_count || 0} Events
                                    </span>
                                </div>

                                {/* Expanded History Section for mobile */}
                                {expandedId === guest.id && (
                                    <div className="border-t border-white/10 pt-4 mt-2 space-y-3">
                                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                            <Calendar size={14} className="text-primary" /> Event Attendance History
                                        </h4>
                                        {historyLoading === guest.id ? (
                                            <div className="py-4 flex justify-center">
                                                <Loader2 className="animate-spin text-primary" size={20} />
                                            </div>
                                        ) : !history[guest.id] || history[guest.id].length === 0 ? (
                                            <p className="text-xs text-slate-500 italic text-center py-2">No event history found.</p>
                                        ) : (
                                            <div className="space-y-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                                {history[guest.id].map((ev, i) => (
                                                    <div key={i} className="flex flex-col gap-1.5 text-xs pb-2 border-b border-white/5 last:border-b-0 last:pb-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-white truncate max-w-[180px]">{ev.name}</span>
                                                            <span className="text-[10px] text-slate-500">{ev.date_start ? new Date(ev.date_start).toLocaleDateString() : '-'}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${ev.invited ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-white/5 text-slate-600 border-white/5'}`}>Invited</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${ev.accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 text-slate-600 border-white/5'}`}>Accepted</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${ev.attended ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-white/5 text-slate-600 border-white/5'}`}>Attended</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                                    <button
                                        onClick={() => handleEdit(guest)}
                                        className="flex-1 max-w-[100px] flex items-center justify-center gap-2 py-2 border border-white/10 rounded-xl hover:text-white hover:bg-white/5 transition-all text-xs font-semibold text-slate-300"
                                    >
                                        <Edit2 size={12} /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(guest.id)}
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

            <GuestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchGuests}
                guestToEdit={guestToEdit}
            />
        </div>
    );
};

export default Guests;
