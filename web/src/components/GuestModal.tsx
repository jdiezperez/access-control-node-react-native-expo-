import React, { useState, useEffect } from 'react';
import { X, User, Mail, Briefcase, Loader2, Save, Upload, MapPin } from 'lucide-react';
import axios from 'axios';
import CountrySelect from '@/components/CountrySelect';

interface GuestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    guestToEdit?: any;
}

const GuestModal = ({ isOpen, onClose, onSave, guestToEdit }: GuestModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        role: '',
        organization: '',
        city: '',
        country: '',
        gender: '',
        image: ''
    });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (guestToEdit) {
            setFormData({
                name: guestToEdit.name || '',
                surname: guestToEdit.surname || '',
                email: guestToEdit.email || '',
                role: guestToEdit.role || '',
                organization: guestToEdit.organization || '',
                city: guestToEdit.city || '',
                country: guestToEdit.country || '',
                gender: guestToEdit.gender || '',
                image: guestToEdit.image || ''
            });
        } else {
            setFormData({
                name: '',
                surname: '',
                email: '',
                role: '',
                organization: '',
                city: '',
                country: '',
                gender: '',
                image: ''
            });
        }
    }, [guestToEdit, isOpen]);

    if (!isOpen) return null;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        try {
            setUploading(true);
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/upload?folder=users`, formDataUpload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData(prev => ({ ...prev, image: res.data.url }));
        } catch (err: any) {
            setError('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name || !formData.surname || !formData.email) {
            setError('Please fill in all mandatory fields (Name, Surname, Email)');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                type: 'guest'
            };

            if (guestToEdit) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/users/${guestToEdit.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/users`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save guest');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{guestToEdit ? 'Edit Guest' : 'Create New Guest'}</h2>
                            <p className="text-slate-500 text-sm">Enter guest details below.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                            <X size={16} /> {error}
                        </div>
                    )}

                    {/* Image Upload */}
                    <div className="flex justify-center pb-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
                                {formData.image ? (
                                    <img src={`${import.meta.env.VITE_API_URL}${formData.image}`} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="text-slate-300" size={40} />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                        <Loader2 className="animate-spin text-primary" size={20} />
                                    </div>
                                )}
                            </div>
                            <label className="absolute -bottom-1 -right-1 p-2 bg-primary text-white rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
                                <Upload size={14} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                            </label>
                        </div>
                    </div>

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
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Briefcase size={14} /> Role
                            </label>
                            <input
                                type="text"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                placeholder="e.g. CEO, Developer"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Briefcase size={14} /> Organization
                            </label>
                            <input
                                type="text"
                                value={formData.organization}
                                onChange={e => setFormData({ ...formData, organization: e.target.value })}
                                placeholder="Company Name"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <MapPin size={14} /> City
                            </label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <MapPin size={14} /> Country
                            </label>
                            <CountrySelect
                                value={formData.country}
                                onChange={v => setFormData({ ...formData, country: v })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                            <select
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="non binary">Non Binary</option>
                                <option value="other">Other</option>
                                <option value="prefer not to say">Prefer not to say</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end border-t border-slate-100 gap-3">
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
                            {guestToEdit ? 'Update Guest' : 'Create Guest'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GuestModal;
