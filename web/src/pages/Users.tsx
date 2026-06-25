import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users as UsersIcon, Plus, Search, Mail, Shield, User, Trash2, Edit2, Loader2, Building2, CalendarPlus } from 'lucide-react';
import UserModal from '@/components/UserModal';
import UserAssignEventsModal from '@/components/UserAssignEventsModal';

const UsersManagement = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [assignUser, setAssignUser] = useState<any>(null);
    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserType = currentUser.type || '';
    const currentUserId = currentUser.id;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, companyRes] = await Promise.all([
                axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/company', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null }))
            ]);
            // Filter only admins, managers, and users (exclude guests)
            setUsers(usersRes.data.filter((u: any) => u.type === 'admin' || u.type === 'manager' || u.type === 'user'));
            setCompanyInfo(companyRes.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await axios.delete(`/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users.filter(u => u.id !== id));
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    const filteredUsers = users.filter(u =>
        [u.name, u.surname, u.email, u.role].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div
                        className="p-3 sm:p-4 rounded-3xl shadow-lg shadow-blue-500/20"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                        <UsersIcon size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Users</h1>
                        <p className="text-slate-400 font-medium mt-0.5 text-sm">Manage your team members and their access levels.</p>
                    </div>
                </div>
                <button
                    onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl text-white font-bold shadow-xl shadow-blue-500/30 hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all text-sm sm:text-base"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                    <Plus size={18} /> Add User
                </button>
            </div>

            {/* Top Cards Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-4 top-1/3 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, email or role..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                    />
                </div>
                <div className="rounded-2xl px-6 py-4 flex items-center gap-4 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <Building2 className="text-slate-400" />
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Organization</p>
                        <p className="font-bold text-white mt-0.5">{companyInfo?.name || 'Company Name'}</p>
                    </div>
                </div>
            </div>

            {/* Table — desktop */}
            <div className="hidden lg:block rounded-3xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/10">
                            <tr>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">User Details</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Role &amp; Permissions</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Assigned Events</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-slate-500 font-medium">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : filteredUsers.map(user => {
                                const isSelf = user.id === currentUserId;
                                const canEdit = currentUserType === 'admin' || (currentUserType === 'manager' && user.type === 'user');
                                const canAssignEvents = currentUserType === 'admin' || currentUserType === 'manager';
                                return (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 overflow-hidden border border-white/10">
                                                    {user.image ? <img src={user.image} className="w-full h-full object-cover" /> : <User size={24} />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">
                                                        {user.name} {user.surname}
                                                        {isSelf && <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20">You</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                                                        <Mail size={12} /> {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1.5">
                                                <div className="text-sm font-bold text-slate-300">{user.role || 'No Role Assigned'}</div>
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${user.type === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                                    user.type === 'manager' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    }`}>
                                                    {user.type === 'admin' ? <Shield size={10} /> : <User size={10} />}
                                                    {user.type}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-sm text-slate-300 max-w-[250px]">
                                                {user.assignedEvents && user.assignedEvents.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.assignedEvents.map((eventName: string, i: number) => (
                                                            <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-md">
                                                                {eventName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 italic text-xs">No events assigned</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-center gap-2">
                                                {canAssignEvents && (
                                                    <button onClick={() => setAssignUser(user)} title="Assign to events"
                                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/10 transition-all">
                                                        <CalendarPlus size={16} />
                                                    </button>
                                                )}
                                                {canEdit && (
                                                    <button onClick={() => { setSelectedUser(user); setIsModalOpen(true); }} title="Edit user"
                                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/10 transition-all">
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {canEdit && !isSelf && (
                                                    <button onClick={() => handleDelete(user.id)} title="Delete user"
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/10 transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                {!canEdit && (
                                                    <span className="text-xs text-slate-500 font-semibold italic">Protected</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cards — mobile & tablet */}
            <div className="lg:hidden space-y-3">
                {filteredUsers.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 p-8 text-center text-slate-500 font-medium" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        No users found matching your search.
                    </div>
                ) : filteredUsers.map(user => {
                    const isSelf = user.id === currentUserId;
                    const canEdit = currentUserType === 'admin' || (currentUserType === 'manager' && user.type === 'user');
                    const canAssignEvents = currentUserType === 'admin' || currentUserType === 'manager';
                    return (
                        <div key={user.id} className="rounded-2xl border border-white/10 p-4 flex items-start gap-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 overflow-hidden border border-white/10 flex-shrink-0">
                                {user.image ? <img src={user.image} className="w-full h-full object-cover" /> : <User size={24} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-white text-sm">
                                    {user.name} {user.surname}
                                    {isSelf && <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20">You</span>}
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="text-xs text-slate-300 font-semibold">{user.role || 'No Role'}</span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${user.type === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                        user.type === 'manager' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        }`}>{user.type}</span>
                                </div>
                                <div className="mt-2 text-xs text-slate-300">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Assigned Events</span>
                                    {user.assignedEvents && user.assignedEvents.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {user.assignedEvents.map((eventName: string, i: number) => (
                                                <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold rounded-md">
                                                    {eventName}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-slate-500 italic text-[10px]">No events assigned</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 flex-shrink-0">
                                {canAssignEvents && (
                                    <button onClick={() => setAssignUser(user)} title="Assign to events"
                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/10 transition-all">
                                        <CalendarPlus size={15} />
                                    </button>
                                )}
                                {canEdit && (
                                    <button onClick={() => { setSelectedUser(user); setIsModalOpen(true); }} title="Edit"
                                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/10 transition-all">
                                        <Edit2 size={15} />
                                    </button>
                                )}
                                {canEdit && !isSelf && (
                                    <button onClick={() => handleDelete(user.id)} title="Delete"
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/10 transition-all">
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchData}
                userToEdit={selectedUser}
                companyInfo={companyInfo}
            />

            <UserAssignEventsModal
                isOpen={!!assignUser}
                onClose={() => setAssignUser(null)}
                user={assignUser}
            />
        </div>
    );
};

export default UsersManagement;
