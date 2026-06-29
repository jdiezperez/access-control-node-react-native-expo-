import React, { useState, useEffect, useRef } from 'react';
import { X, User, Mail, Shield, Briefcase, Eye, EyeOff, Loader2, Save } from 'lucide-react';
import axios from 'axios';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    userToEdit?: any;
    companyInfo: any;
}

const UserModal = ({ isOpen, onClose, onSave, userToEdit, companyInfo }: UserModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
        type: 'user',
    });
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUserType, setCurrentUserType] = useState<string>('');
    const [editingProfile, setEditingProfile] = useState<boolean>(false);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        const currentUserStr = localStorage.getItem('user');
        if (currentUserStr) {
            const currentUser = JSON.parse(currentUserStr);
            setCurrentUserType(currentUser.type);
            if (userToEdit && currentUser.id == userToEdit.id) {
                setEditingProfile(true);
            }
        }

        if (userToEdit) {
            setFormData({
                name: userToEdit.name || '',
                surname: userToEdit.surname || '',
                email: userToEdit.email || '',
                password: '',
                confirmPassword: '',
                role: userToEdit.role || '',
                type: userToEdit.type || 'user',
            });
        } else {
            setFormData({
                name: '',
                surname: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: '',
                type: 'user',
            });
        }
    }, [userToEdit, isOpen]);

    // Scroll form to top whenever an error message appears
    useEffect(() => {
        if (error && formRef.current) {
            formRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [error]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (userToEdit) {
            if (formData.password && formData.password !== formData.confirmPassword) {
                setError("Passwords don't match");
                return;
            }
        } else {
            if (!formData.password || formData.password !== formData.confirmPassword) {
                setError("Passwords don't match or are empty");
                return;
            }
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            // Only send fields that exist in the users table
            const payload: Record<string, string> = {
                name: formData.name,
                surname: formData.surname,
                email: formData.email,
                type: formData.type,
                role: formData.role,
            };

            // Only include password if it was actually filled in
            if (formData.password) {
                payload.password = formData.password;
            }

            if (userToEdit) {
                await axios.put(`/api/admin/users/${userToEdit.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/api/admin/users', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save user');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" >
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{userToEdit ? 'Edit User' : 'Create New User'}</h2>
                            <p className="text-slate-500 text-sm">Fill in the details to manage company access.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                <form ref={formRef} onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                            <X size={16} /> {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">First Name *</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Surname *</label>
                            <input
                                required
                                type="text"
                                value={formData.surname}
                                onChange={e => setFormData({ ...formData, surname: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Email Address *</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">
                                {userToEdit ? 'New Password' : 'Password *'}
                            </label>
                            <div className="relative">
                                <input
                                    required={!userToEdit}
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={userToEdit ? 'Leave blank to keep current' : ''}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">
                                {userToEdit ? 'Confirm New Password' : 'Confirm Password *'}
                            </label>
                            <input
                                required={!userToEdit && !!formData.password}
                                type="password"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Briefcase size={14} /> Role *
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                placeholder="e.g. Manager, Coordinator"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Shield size={14} /> Account Permission *
                            </label>
                            <select
                                required
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                disabled={!!((userToEdit && currentUserType === 'manager') || editingProfile)}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <option value="manager">Manager</option>
                                <option value="user">Scanner Staff</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end border-t border-slate-100">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                {userToEdit ? 'Update User' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default UserModal;
