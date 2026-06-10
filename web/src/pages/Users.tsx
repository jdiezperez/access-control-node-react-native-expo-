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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-primary/10 text-primary rounded-3xl">
                        <UsersIcon size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Users Management</h1>
                        <p className="text-slate-500 font-medium">Manage your team members and their access levels.</p>
                    </div>
                </div>
                <button
                    onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/30 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Plus size={20} /> Add User
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email or role..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 bg-white shadow-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                    />
                </div>
                <div className="bg-slate-100/50 rounded-2xl px-6 py-4 flex items-center gap-4 border border-slate-200/50">
                    <Building2 className="text-slate-400" />
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Organization</p>
                        <p className="font-bold text-slate-700">{companyInfo?.name || 'Company Name'}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">User Details</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Role & Permissions</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-medium">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : filteredUsers.map(user => {
                                // Managers cannot modify admin users
                                const canEdit = currentUserType === 'admin' || user.type !== 'admin';
                                // Cannot edit yourself via this table (self-edit has no password change support)
                                const isSelf = user.id === currentUserId;

                                return (
                                <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200">
                                                {user.image ? <img src={user.image} className="w-full h-full object-cover" /> : <User size={24} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">
                                                    {user.name} {user.surname}
                                                    {isSelf && <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-md">You</span>}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <Mail size={12} /> {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1">
                                            <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                {user.role || 'No Role Assigned'}
                                            </div>
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                user.type === 'admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                                user.type === 'manager' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                }`}>
                                                {user.type === 'admin' ? <Shield size={10} /> : <User size={10} />}
                                                {user.type}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-center gap-2">
                                            {canEdit && (
                                                <button
                                                    onClick={() => setAssignUser(user)}
                                                    title="Assign to events"
                                                    className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                                                >
                                                    <CalendarPlus size={18} />
                                                </button>
                                            )}
                                            {canEdit && (
                                                <button
                                                    onClick={() => { setSelectedUser(user); setIsModalOpen(true); }}
                                                    title="Edit user"
                                                    className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            )}
                                            {canEdit && !isSelf && (
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    title="Delete user"
                                                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all border border-transparent hover:border-red-100"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                            {!canEdit && (
                                                <span className="text-xs text-slate-300 font-medium italic">Admin — protected</span>
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
