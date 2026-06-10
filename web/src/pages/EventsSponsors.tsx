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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800">Event Sponsors</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-semibold shadow-sm"
                    >
                        <Plus size={18} /> Add Sponsors
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search sponsors by name, contact, phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-primary" size={40} />
                        <p className="text-slate-500 font-medium">Loading sponsors...</p>
                    </div>
                ) : filteredSponsors.length === 0 ? (
                    <div className="p-12 text-center">
                        <Filter className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-800">No sponsors found</h3>
                        <p className="text-slate-500">No sponsors assigned to this event or matching your search.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Logo</th>
                                    {['name', 'contact', 'contact_email', 'contact_phone', 'country'].map(field => (
                                        <th
                                            key={field}
                                            onClick={() => handleSort(field as keyof Sponsor)}
                                            className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                                        >
                                            <div className="flex items-center gap-1">
                                                {field.replace('_', ' ')}
                                                {sortField === field && (
                                                    sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSponsors.map(sponsor => (
                                    <tr key={sponsor.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            {sponsor.logo ? (
                                                <img src={sponsor.logo} alt={sponsor.name} className="w-10 h-10 object-contain rounded bg-white border border-gray-100" />
                                            ) : (
                                                <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                                                    <Globe size={20} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-700">{sponsor.name}</div>
                                            {sponsor.url && (
                                                <a href={sponsor.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                                                    <Globe size={10} /> {sponsor.url.substring(0, 20)}
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{sponsor.contact || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Mail size={14} className="text-slate-400" />
                                                {sponsor.contact_email || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Phone size={14} className="text-slate-400" />
                                                {sponsor.contact_phone || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{sponsor.country || '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleRemoveSponsor(sponsor.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Remove from event"
                                            >
                                                <Unlink size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Sponsors Modal */}
            {showAddModal && <AddSponsorModal onClose={() => setShowAddModal(false)} onAdded={fetchEventSponsors} eventId={id!} />}
        </div>
    );
};

export default EventsSponsors;
