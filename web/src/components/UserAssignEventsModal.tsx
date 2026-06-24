import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, CalendarDays, MapPin, Loader2, CheckCircle2,
    Circle, Search, Zap, Clock, Save
} from 'lucide-react';
import { getImagePath } from '@/utils/imagePath';


interface Event {
    id: number;
    name: string;
    city?: string;
    country?: string;
    date?: string;
    status: 'active' | 'not active';
    logo?: string;
    assigned: 0 | 1;
}

interface UserAssignEventsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

const statusConfig = {
    'active': {
        label: 'Active',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
    },
    'not active': {
        label: 'Not Active',
        cls: 'bg-slate-100 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
    },
};

const UserAssignEventsModal = ({ isOpen, onClose, user }: UserAssignEventsModalProps) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'not active'>('all');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (isOpen && user) {
            fetchEvents();
            setSearch('');
            setFilter('all');
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 2500);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/admin/users/${user.id}/events`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEvents(res.data);
        } catch {
            setToast({ msg: 'Failed to load events', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (event: Event) => {
        setSaving(event.id);
        try {
            if (event.assigned) {
                await axios.delete(`/api/admin/users/${user.id}/events/${event.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setToast({ msg: `Unassigned from "${event.name}"`, type: 'success' });
            } else {
                await axios.post(`/api/admin/users/${user.id}/events/${event.id}`, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setToast({ msg: `Assigned to "${event.name}"`, type: 'success' });
            }
            setEvents(prev =>
                prev.map(e => e.id === event.id ? { ...e, assigned: event.assigned ? 0 : 1 } : e)
            );
        } catch {
            setToast({ msg: 'Something went wrong. Please try again.', type: 'error' });
        } finally {
            setSaving(null);
        }
    };

    if (!isOpen) return null;

    const filtered = events.filter(e => {
        const matchSearch = [e.name, e.city, e.country].some(v =>
            v?.toLowerCase().includes(search.toLowerCase())
        );
        const matchFilter = filter === 'all' || e.status === filter;
        return matchSearch && matchFilter;
    });

    const assignedCount = events.filter(e => e.assigned).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white flex items-start justify-between gap-4 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            <CalendarDays size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Assign Events</h2>
                            <p className="text-sm text-slate-500 mt-0.5">
                                <span className="font-semibold text-slate-700">{user?.name} {user?.surname}</span>
                                {' · '}
                                <span className="font-medium text-primary">{assignedCount}</span> event{assignedCount !== 1 ? 's' : ''} assigned
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700 mt-0.5 flex-shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-8 pt-5 pb-4 flex flex-col gap-3 flex-shrink-0 border-b border-slate-50">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search events by name or location..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'active', 'not active'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${filter === f
                                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                                    }`}
                            >
                                {f === 'all' ? 'All Events' : f === 'active' ? 'Active' : 'Not Active'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Event List */}
                <div className="overflow-y-auto flex-1 px-4 py-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <CalendarDays size={40} className="mb-3 opacity-40" />
                            <p className="font-medium text-sm">No events found</p>
                        </div>
                    ) : (
                        <div className="space-y-2 py-1">
                            {filtered.map(event => {
                                const cfg = statusConfig[event.status] ?? statusConfig['not active'];
                                const isAssigned = event.assigned === 1;
                                const isSaving = saving === event.id;

                                return (
                                    <button
                                        key={event.id}
                                        onClick={() => !isSaving && handleToggle(event)}
                                        disabled={isSaving}
                                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all text-left group ${isAssigned
                                            ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                                            } ${isSaving ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                                    >
                                        {/* Checkbox Icon */}
                                        <div className="flex-shrink-0">
                                            {isSaving ? (
                                                <Loader2 className="animate-spin text-primary" size={22} />
                                            ) : isAssigned ? (
                                                <CheckCircle2 className="text-primary" size={22} />
                                            ) : (
                                                <Circle className="text-slate-300 group-hover:text-slate-400 transition-colors" size={22} />
                                            )}
                                        </div>

                                        {/* Event Logo */}
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200">
                                            {event.logo ? (
                                                <img src={getImagePath(event.logo, 'events')} alt={event.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <CalendarDays className="text-slate-400" size={18} />
                                            )}
                                        </div>

                                        {/* Event Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 truncate">{event.name}</div>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                {(event.city || event.country) && (
                                                    <span className="flex items-center gap-1 text-xs text-slate-500">
                                                        <MapPin size={11} />
                                                        {[event.city, event.country].filter(Boolean).join(', ')}
                                                    </span>
                                                )}
                                                {event.date && (
                                                    <span className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Clock size={11} />
                                                        {new Date(event.date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${cfg.cls}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                            {event.status === 'active'
                                                ? <><Zap size={9} /> {cfg.label}</>
                                                : cfg.label
                                            }
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                    <p className="text-xs text-slate-400 font-medium">
                        {filtered.length} event{filtered.length !== 1 ? 's' : ''} shown
                    </p>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all text-sm"
                    >
                        <Save size={16} /> Done
                    </button>
                </div>

                {/* Toast */}
                {toast && (
                    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 transition-all ${toast.type === 'success'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-500 text-white'
                        }`}>
                        {toast.type === 'success' ? <CheckCircle2 size={16} /> : <X size={16} />}
                        {toast.msg}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserAssignEventsModal;
