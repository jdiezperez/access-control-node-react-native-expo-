import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft, Plus, Upload, Search, X, Check,
    ChevronUp, ChevronDown, Filter, Loader2, Unlink,
    User, Send, QrCode, Mail, AlertCircle, CheckCircle2,
    Mails
} from 'lucide-react';
import type { Guest } from '@/data/Types';
import AddGuestsModal from '../components/AddGuestModal';
import ImportCSVModal from '../components/ImportCSVModal';
import BadgeModal from '../components/BadgeModal';

interface EventData {
    id: number;
    name: string;
    city?: string;
    country?: string;
    date?: string;
    logo?: string;
    status: string;
    email_template?: string;
}

const EventsGuests = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [event, setEvent] = useState<EventData | null>(null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [genderFilter, setGenderFilter] = useState('');
    const [statusFilters, setStatusFilters] = useState({
        invited: false,
        accepted: false,
        attended: false
    });

    const [sortField, setSortField] = useState<keyof Guest>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Invite All modal
    const [showInviteAllModal, setShowInviteAllModal] = useState(false);
    const [inviteAllLoading, setInviteAllLoading] = useState(false);
    const [inviteAllResult, setInviteAllResult] = useState<{ sent: number; errors: any[] } | null>(null);

    // Single invite
    const [invitingGuestId, setInvitingGuestId] = useState<number | null>(null);

    // Badge modal
    const [badgeGuest, setBadgeGuest] = useState<Guest | null>(null);

    // Toast
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        fetchAll();
    }, [id]);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [eventRes, guestsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events/${id}/guests`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setEvent(eventRes.data);
            setGuests(guestsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEventGuests = async () => {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events/${id}/guests`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setGuests(res.data);
    };

    const handleRemoveGuest = async (userId: number) => {
        if (!window.confirm('Are you sure you want to remove this guest from the event?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/events/${id}/guests/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchEventGuests();
        } catch {
            showToast('Failed to remove guest', 'error');
        }
    };

    const handleSort = (field: keyof Guest) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleInviteSingle = async (guest: Guest) => {
        setInvitingGuestId(guest.id);
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/admin/events/${id}/guests/${guest.id}/invite`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast(`Invitation sent to ${guest.name} ${guest.surname}`);
            fetchEventGuests();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to send invitation', 'error');
        } finally {
            setInvitingGuestId(null);
        }
    };

    const handleInviteAll = async () => {
        setInviteAllLoading(true);
        setInviteAllResult(null);
        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/admin/events/${id}/invite-all`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setInviteAllResult(res.data);
            fetchEventGuests();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to send invitations', 'error');
            setShowInviteAllModal(false);
        } finally {
            setInviteAllLoading(false);
        }
    };

    const canInviteAll = event?.status === 'active' && !!event?.email_template;

    const filteredGuests = guests.filter(g => {
        const searchLower = search.toLowerCase();
        const matchesSearch = !search || [
            g.name, g.surname, g.role, g.organization, g.city, g.country, g.gender, g.email
        ].some(val => val?.toLowerCase().includes(searchLower));

        const matchesGender = !genderFilter || g.gender === genderFilter;
        const matchesInvited = !statusFilters.invited || g.invited;
        const matchesAccepted = !statusFilters.accepted || g.accepted;
        const matchesAttended = !statusFilters.attended || g.attended;

        return matchesSearch && matchesGender && matchesInvited && matchesAccepted && matchesAttended;
    }).sort((a, b) => {
        const valA = a[sortField] || '';
        const valB = b[sortField] || '';
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const renderBooleanCell = (val: boolean, date: string | null) => {
        if (val) {
            return (
                <div className="flex flex-col">
                    <span className="text-green-600 font-bold flex items-center gap-1">
                        <Check size={14} /> Yes
                    </span>
                    {date && <span className="text-[10px] text-slate-400">{new Date(date).toLocaleDateString()}</span>}
                </div>
            );
        }
        return (<X size={18} className="text-red-500" />);
    };

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
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Event Guests</h2>
                        {event && (
                            <p className="text-sm text-slate-500 mt-0.5 font-medium">{event.name}</p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    {/* Invite All */}
                    <button
                        onClick={() => { setShowInviteAllModal(true); setInviteAllResult(null); }}
                        disabled={!canInviteAll}
                        title={
                            !event ? 'Loading...' :
                                event.status !== 'active' ? 'Event must be Active to send invitations' :
                                    !event.email_template ? 'No email template set for this event' :
                                        'Send invitations to all guests'
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Mails size={16} /> Invite All
                    </button>

                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-semibold border border-slate-200"
                    >
                        <Upload size={18} /> Import CSV
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-semibold shadow-sm"
                    >
                        <Plus size={18} /> Add Guests
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, organization, location..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                    </div>
                    <select
                        value={genderFilter}
                        onChange={e => setGenderFilter(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                        <option value="">All Genders</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="non binary">Non Binary</option>
                        <option value="other">Other</option>
                        <option value="prefer not to say">Prefer not to say</option>
                    </select>
                    <div className="flex items-center justify-around bg-slate-50 rounded-lg px-4 border border-gray-100">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={statusFilters.invited} onChange={e => setStatusFilters({ ...statusFilters, invited: e.target.checked })} className="rounded text-primary" /> Invited
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={statusFilters.accepted} onChange={e => setStatusFilters({ ...statusFilters, accepted: e.target.checked })} className="rounded text-primary" /> Accepted
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={statusFilters.attended} onChange={e => setStatusFilters({ ...statusFilters, attended: e.target.checked })} className="rounded text-primary" /> Attended
                        </label>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-primary" size={40} />
                        <p className="text-slate-500 font-medium">Loading guests...</p>
                    </div>
                ) : filteredGuests.length === 0 ? (
                    <div className="p-12 text-center">
                        <Filter className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-800">No guests found</h3>
                        <p className="text-slate-500">No guests invited to this event or matching your filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Image</th>
                                    {['name', 'surname', 'role', 'organization', 'city', 'country', 'gender', 'email', 'invited', 'accepted', 'attended'].map(field => (
                                        <th
                                            key={field}
                                            onClick={() => handleSort(field as keyof Guest)}
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
                                {filteredGuests.map(guest => {
                                    const canShowBadge = guest.accepted && !!guest.accepted_date;
                                    const isSendingInvite = invitingGuestId === guest.id;
                                    return (
                                        <tr key={guest.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                                                    {guest.image
                                                        ? <img src={guest.image} alt={guest.name} className="w-full h-full object-cover" />
                                                        : <User size={16} className="text-slate-400" />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-700 text-sm capitalize">{guest.name}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm capitalize">{guest.surname}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm capitalize">{guest.role || '-'}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm capitalize">{guest.organization || '-'}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm capitalize">{guest.city || '-'}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm capitalize">{guest.country || '-'}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm capitalize">{guest.gender || '-'}</td>
                                            <td className="px-6 py-4 text-slate-600 text-sm">{guest.email}</td>
                                            <td className="px-6 py-4">{renderBooleanCell(guest.invited, guest.invited_date)}</td>
                                            <td className="px-6 py-4">{renderBooleanCell(guest.accepted, guest.accepted_date)}</td>
                                            <td className="px-6 py-4">{renderBooleanCell(guest.attended, guest.attended_date)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* Invite single */}
                                                    <button
                                                        onClick={() => handleInviteSingle(guest)}
                                                        disabled={isSendingInvite || !canInviteAll || guest.accepted}
                                                        title={guest.accepted ? 'Guest already accepted the invitation' : canInviteAll ? `Send invitation to ${guest.name}` : 'Event must be Active with an email template'}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        {isSendingInvite
                                                            ? <Loader2 size={16} className="animate-spin" />
                                                            : <Mail size={16} />}
                                                    </button>

                                                    {/* QR Badge */}
                                                    <button
                                                        onClick={() => canShowBadge && setBadgeGuest(guest)}
                                                        disabled={!canShowBadge}
                                                        title={canShowBadge ? 'Show badge & QR code' : 'Guest must have accepted the invitation'}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <QrCode size={16} />
                                                    </button>

                                                    {/* Remove */}
                                                    <button
                                                        onClick={() => handleRemoveGuest(guest.id)}
                                                        title="Remove from event"
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Unlink size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modals ── */}

            {showAddModal && <AddGuestsModal onClose={() => setShowAddModal(false)} onAdded={fetchEventGuests} eventId={id!} />}
            {showImportModal && <ImportCSVModal onClose={() => setShowImportModal(false)} onImported={fetchEventGuests} eventId={id!} />}

            {/* Badge Modal */}
            {badgeGuest && (
                <BadgeModal
                    isOpen={!!badgeGuest}
                    onClose={() => setBadgeGuest(null)}
                    guest={badgeGuest}
                    event={event}
                />
            )}

            {/* Invite All Confirmation Modal */}
            {showInviteAllModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                                    <Mail size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Invite All Guests</h3>
                            </div>
                            <button onClick={() => setShowInviteAllModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {!inviteAllResult ? (
                                <>
                                    <p className="text-slate-600 text-sm">
                                        This will send an invitation email to{' '}
                                        <span className="font-bold text-slate-800">{guests.length} guest{guests.length !== 1 ? 's' : ''}</span>{' '}
                                        in <span className="font-bold text-slate-800">{event?.name}</span>.
                                    </p>
                                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-medium">
                                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                        Emails will be sent using the template set for this event. Already-invited guests will receive another email.
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setShowInviteAllModal(false)}
                                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleInviteAll}
                                            disabled={inviteAllLoading}
                                            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                                        >
                                            {inviteAllLoading
                                                ? <><Loader2 className="animate-spin" size={16} /> Sending...</>
                                                : <><Mail size={16} /> Send Invitations</>}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center gap-3 py-2">
                                        <div className="p-3 bg-emerald-50 rounded-full">
                                            <CheckCircle2 className="text-emerald-600" size={32} />
                                        </div>
                                        <p className="font-bold text-slate-800 text-lg">Invitations Sent</p>
                                        <p className="text-slate-500 text-sm text-center">
                                            <span className="font-bold text-emerald-600">{inviteAllResult.sent}</span> invitation{inviteAllResult.sent !== 1 ? 's' : ''} sent successfully.
                                            {inviteAllResult.errors.length > 0 && (
                                                <span className="text-red-500"> {inviteAllResult.errors.length} failed.</span>
                                            )}
                                        </p>
                                    </div>
                                    {inviteAllResult.errors.length > 0 && (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                                            {inviteAllResult.errors.map((e, i) => (
                                                <div key={i}><span className="font-semibold">{e.guest}:</span> {e.error}</div>
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setShowInviteAllModal(false)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-md"
                                    >
                                        Done
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default EventsGuests;
