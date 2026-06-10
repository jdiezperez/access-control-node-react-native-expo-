import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Building2, Plus, Search, Users, CalendarDays,
    Edit2, Trash2, Loader2, MapPin, Mail, Phone,
    ShieldCheck, AlertTriangle, X
} from 'lucide-react';
import CompanyModal from '@/components/CompanyModal';
import { getImagePath } from '@/utils/imagePath';

interface Company {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
    address: string | null;
    logo: string | null;
    user_count: number;
    event_count: number;
}

const Companies = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<Company | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/superadmin/companies', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCompanies(res.data);
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await axios.delete(`/api/superadmin/companies/${deleteConfirm.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDeleteConfirm(null);
            fetchCompanies();
        } catch (err: any) {
            setDeleteError(err.response?.data?.message || 'Failed to delete company');
        } finally {
            setDeleting(false);
        }
    };

    const filteredCompanies = companies.filter(c =>
        [c.name, c.email, c.city, c.country].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div
                        className="p-4 rounded-3xl shadow-lg shadow-violet-500/20"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                        <Building2 size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Companies</h1>
                        <p className="text-slate-400 font-medium mt-0.5">
                            {companies.length} {companies.length === 1 ? 'company' : 'companies'} registered
                        </p>
                    </div>
                </div>
                <button
                    id="btn-create-company"
                    onClick={() => { setCompanyToEdit(null); setIsModalOpen(true); }}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white font-bold shadow-xl shadow-violet-500/30 hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                    <Plus size={20} /> New Company
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Companies', value: companies.length, icon: Building2 },
                    { label: 'Total Staff Users', value: companies.reduce((s, c) => s + (c.user_count || 0), 0), icon: Users },
                    { label: 'Total Events', value: companies.reduce((s, c) => s + (c.event_count || 0), 0), icon: CalendarDays },
                    { label: 'Active Admins', value: companies.length, icon: ShieldCheck },
                ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-2xl p-5 border border-white/10 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="flex items-center gap-3 mb-2">
                            <Icon size={16} className="text-violet-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
                        </div>
                        <p className="text-3xl font-black text-white">{value}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                    id="search-companies"
                    type="text"
                    placeholder="Search by name, email, city or country..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="animate-spin text-violet-400" size={40} />
                </div>
            ) : filteredCompanies.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 rounded-3xl border border-white/10 p-12" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="p-5 rounded-3xl" style={{ background: 'rgba(99,102,241,0.15)' }}>
                        <Building2 size={40} className="text-violet-400" />
                    </div>
                    <div className="text-center">
                        <p className="text-white font-bold text-lg">No companies found</p>
                        <p className="text-slate-500 text-sm mt-1">
                            {search ? 'Try a different search term.' : 'Create your first company to get started.'}
                        </p>
                    </div>
                    {!search && (
                        <button
                            onClick={() => { setCompanyToEdit(null); setIsModalOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                        >
                            <Plus size={18} /> Create Company
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredCompanies.map(company => (
                        <div
                            key={company.id}
                            className="rounded-3xl border border-white/10 p-6 flex flex-col gap-5 hover:border-violet-500/30 transition-all group"
                            style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
                        >
                            {/* Company Header */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                                    >
                                        {company.logo ? (
                                            <img
                                                src={getImagePath(company.logo, 'company')}
                                                alt={company.name}
                                                className="w-full h-full object-contain p-1 bg-white"
                                            />
                                        ) : (
                                            <Building2 size={22} className="text-white" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-white text-lg leading-tight truncate">{company.name}</h3>
                                        {(company.city || company.country) && (
                                            <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                                                <MapPin size={11} />
                                                <span className="truncate">{[company.city, company.country].filter(Boolean).join(', ')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-2">
                                {company.email && (
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <Mail size={13} className="text-slate-500 shrink-0" />
                                        <span className="truncate">{company.email}</span>
                                    </div>
                                )}
                                {company.phone && (
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <Phone size={13} className="text-slate-500 shrink-0" />
                                        <span>{company.phone}</span>
                                    </div>
                                )}
                                {!company.email && !company.phone && (
                                    <p className="text-slate-600 text-xs italic">No contact info</p>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="flex gap-4 pt-1 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.15)' }}>
                                        <Users size={13} className="text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm leading-none">{company.user_count}</p>
                                        <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Staff</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.15)' }}>
                                        <CalendarDays size={13} className="text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm leading-none">{company.event_count}</p>
                                        <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Events</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    id={`btn-edit-company-${company.id}`}
                                    onClick={() => { setCompanyToEdit(company); setIsModalOpen(true); }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-violet-500/40 hover:bg-violet-500/10 text-sm font-semibold transition-all"
                                >
                                    <Edit2 size={15} /> Edit
                                </button>
                                <button
                                    id={`btn-delete-company-${company.id}`}
                                    onClick={() => { setDeleteError(null); setDeleteConfirm(company); }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 text-sm font-semibold transition-all"
                                >
                                    <Trash2 size={15} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Company Create/Edit Modal */}
            <CompanyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchCompanies}
                companyToEdit={companyToEdit}
            />

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-red-100 rounded-2xl">
                                    <AlertTriangle size={24} className="text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">Delete Company</h3>
                                    <p className="text-slate-500 text-sm">This action cannot be undone.</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                                <p className="font-bold text-slate-800">{deleteConfirm.name}</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    All associated users, events, sponsors, guests, and invitations will be permanently deleted.
                                </p>
                            </div>

                            {deleteError && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium mb-4 flex items-center gap-2">
                                    <X size={14} /> {deleteError}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    id={`btn-confirm-delete-${deleteConfirm.id}`}
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-500/30 hover:bg-red-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                                >
                                    {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                    Delete Everything
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Companies;
