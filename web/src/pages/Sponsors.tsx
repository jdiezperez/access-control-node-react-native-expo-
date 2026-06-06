import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus, Trash2, Edit2, ChevronDown, ChevronRight,
    Search, Mail, Globe, MapPin, Loader2, Calendar,
    Image as ImageIcon, AlignLeft, Send, Upload
} from 'lucide-react';
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
        <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-primary" size={40} />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Sponsors Management</h2>
                    <p className="text-slate-500 text-sm">Manage global sponsors and their event participation.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-semibold text-slate-600">
                        <Upload size={18} /> Import CSV
                    </button>
                    <button
                        onClick={() => { setSponsorToEdit(null); setIsModalOpen(true); }}
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
                            placeholder="Search sponsors by name, email, or description..."
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
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sponsor</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Events</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(sponsor => (
                                <React.Fragment key={sponsor.id}>
                                    <tr className={`hover:bg-slate-50/50 transition-colors ${expandedId === sponsor.id ? 'bg-slate-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleExpand(sponsor.id)}
                                                className="p-1 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200"
                                            >
                                                {expandedId === sponsor.id ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-200 p-1">
                                                    {sponsor.logo ? (
                                                        <img src={getImagePath(sponsor.logo, 'sponsors')} alt="" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <ImageIcon size={20} className="text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="max-w-xs">
                                                    <div className="font-bold text-slate-700 truncate">{sponsor.name}</div>
                                                    <div className="text-xs text-slate-400 truncate">{sponsor.description || 'No description'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-slate-600">{sponsor.contact || '-'}</div>
                                            <div className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                                                <Mail size={12} /> {sponsor.contact_email || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-600 flex items-center gap-1">
                                                <MapPin size={14} className="text-slate-400" /> {sponsor.country || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold border border-purple-100">
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
                                                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                        title="Website"
                                                    >
                                                        <Globe size={18} />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(sponsor)}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                    title="Edit Sponsor"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSponsor(sponsor.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Delete Sponsor"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedId === sponsor.id && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-0 border-none">
                                                <div className="py-6 pl-16 pr-6 bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                                <Calendar size={16} className="text-primary" /> Event Participation History
                                                            </h4>
                                                        </div>
                                                        <div className="p-0">
                                                            {historyLoading === sponsor.id ? (
                                                                <div className="p-8 flex justify-center">
                                                                    <Loader2 className="animate-spin text-primary" size={24} />
                                                                </div>
                                                            ) : !history[sponsor.id] || history[sponsor.id].length === 0 ? (
                                                                <div className="p-8 text-center text-slate-400 text-sm italic">
                                                                    No event participation found for this sponsor.
                                                                </div>
                                                            ) : (
                                                                <table className="w-full text-left">
                                                                    <thead className="bg-slate-50/50">
                                                                        <tr>
                                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Event Name</th>
                                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Date</th>
                                                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-50">
                                                                        {history[sponsor.id].map((ev, i) => (
                                                                            <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                                                                                <td className="px-6 py-3 text-sm font-semibold text-slate-600">{ev.name}</td>
                                                                                <td className="px-6 py-3 text-sm text-slate-500">
                                                                                    {ev.date ? new Date(ev.date).toLocaleDateString() : '-'}
                                                                                </td>
                                                                                <td className="px-6 py-3">
                                                                                    <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-bold uppercase border border-green-100">
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
