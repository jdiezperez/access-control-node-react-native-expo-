import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Check, X, QrCode, Send, Upload, Mail, Users, Plus,
    ChevronDown, ChevronRight, Edit2, Trash2, Calendar,
    Loader2, Search, User, MapPin, Briefcase
} from 'lucide-react';
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
        <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary" size={40} />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Guests Management</h2>
                    <p className="text-slate-500 text-sm">Manage your global guest list and their event history.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-semibold text-slate-600">
                        <Upload size={18} /> Import CSV
                    </button>
                    <button
                        onClick={() => { setGuestToEdit(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-bold shadow-lg shadow-slate-200"
                    >
                        <Plus size={18} /> Add New
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-50 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search guests by name, email, or organization..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 w-10"></th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Guest</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role / Gender</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Events</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(guest => (
                                <React.Fragment key={guest.id}>
                                    <tr className={`hover:bg-slate-50/50 transition-colors ${expandedId === guest.id ? 'bg-slate-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleExpand(guest.id)}
                                                className="p-1 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200"
                                            >
                                                {expandedId === guest.id ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                                    {guest.image ? (
                                                        <img src={`${import.meta.env.VITE_API_URL}${getImagePath(guest.image, `users')}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={20} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-700">{guest.name} {guest.surname}</div>
                                                    <div className="text-xs text-slate-400 font-medium">{guest.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-slate-600">{guest.organization || '-'}</div>
                                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                                <MapPin size={10} /> {guest.city}{guest.city && guest.country ? ', ' : ''}{guest.country || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-600 flex items-center gap-1">
                                                <Briefcase size={14} className="text-slate-400" /> {guest.role || '-'}
                                            </div>
                                            <div className="text-xs text-slate-400 capitalize">{guest.gender || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100">
                                                    {guest.event_count || 0} Events
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(guest)}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                    title="Edit Guest"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(guest.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Delete Guest"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedId === guest.id && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-0 border-none">
                                                <div className="py-6 pl-16 pr-6 bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                                <Calendar size={16} className="text-primary" /> Event Attendance History
                                                            </h4>
                                                        </div>
                                                        <div className="p-0">
                                                            {historyLoading === guest.id ? (
                                                                <div className="p-8 flex justify-center">
                                                                    <Loader2 className="animate-spin text-primary" size={24} />
                                                                </div>
                                                            ) : !history[guest.id] || history[guest.id].length === 0 ? (
                                                                <div className="p-8 text-center text-slate-400 text-sm italic">
                                                                    No event history found for this guest.
                                                                </div>
                                                            ) : (
                                                                <table className="w-full text-left">
                                                                    <thead className="bg-slate-50/50">
                                                                        <tr>
                                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Event Name</th>
                                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Date</th>
                                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">Invited</th>
                                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">Accepted</th>
                                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">Attended</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-50">
                                                                        {history[guest.id].map((ev, i) => (
                                                                            <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                                                                                <td className="px-6 py-3 text-sm font-semibold text-slate-600">{ev.name}</td>
                                                                                <td className="px-6 py-3 text-sm text-slate-500">
                                                                                    {ev.date ? new Date(ev.date).toLocaleDateString() : '-'}
                                                                                </td>
                                                                                <td className="px-6 py-3 text-center">
                                                                                    {ev.invited ? <Check size={16} className="mx-auto text-blue-500" /> : <X size={16} className="mx-auto text-slate-300" />}
                                                                                </td>
                                                                                <td className="px-6 py-3 text-center">
                                                                                    {ev.accepted ? <Check size={16} className="mx-auto text-green-500" /> : <X size={16} className="mx-auto text-slate-300" />}
                                                                                </td>
                                                                                <td className="px-6 py-3 text-center">
                                                                                    {ev.attended ? <Check size={16} className="mx-auto text-purple-500" /> : <X size={16} className="mx-auto text-slate-300" />}
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
