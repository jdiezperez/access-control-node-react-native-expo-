import React, { useState, useEffect } from 'react';
import { X, Globe, Mail, Phone, Loader2, Save, Upload, MapPin, Image as ImageIcon, AlignLeft } from 'lucide-react';
import axios from 'axios';

interface SponsorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    sponsorToEdit?: any;
}

const SponsorModal = ({ isOpen, onClose, onSave, sponsorToEdit }: SponsorModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        logo: '',
        url: '',
        contact: '',
        contact_email: '',
        contact_phone: '',
        country: ''
    });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (sponsorToEdit) {
            setFormData({
                name: sponsorToEdit.name || '',
                description: sponsorToEdit.description || '',
                logo: sponsorToEdit.logo || '',
                url: sponsorToEdit.url || '',
                contact: sponsorToEdit.contact || '',
                contact_email: sponsorToEdit.contact_email || '',
                contact_phone: sponsorToEdit.contact_phone || '',
                country: sponsorToEdit.country || ''
            });
        } else {
            setFormData({
                name: '',
                description: '',
                logo: '',
                url: '',
                contact: '',
                contact_email: '',
                contact_phone: '',
                country: ''
            });
        }
    }, [sponsorToEdit, isOpen]);

    if (!isOpen) return null;

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        try {
            setUploading(true);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/upload?folder=sponsors`, formDataUpload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData(prev => ({ ...prev, logo: res.data.url }));
        } catch (err: any) {
            setError('Failed to upload logo');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name) {
            setError('Please fill in the Sponsor Name');
            return;
        }

        try {
            setLoading(true);
            if (sponsorToEdit) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/sponsors/${sponsorToEdit.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/sponsors`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save sponsor');
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
                            <ImageIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{sponsorToEdit ? 'Edit Sponsor' : 'Create New Sponsor'}</h2>
                            <p className="text-slate-500 text-sm">Enter sponsor details below.</p>
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

                    {/* Logo Upload */}
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-100 rounded-2xl hover:border-primary transition-colors bg-slate-50/50 group">
                        {formData.logo ? (
                            <div className="relative w-32 h-32">
                                <img src={`${import.meta.env.VITE_API_URL}${formData.logo}`} alt="Logo Preview" className="w-full h-full object-contain rounded-lg" />
                                <button 
                                    type="button"
                                    onClick={() => setFormData({ ...formData, logo: '' })}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                    {uploading ? <Loader2 className="animate-spin text-primary" size={32} /> : <ImageIcon className="text-slate-400" size={32} />}
                                </div>
                                <div className="text-center">
                                    <label className="text-sm font-bold text-primary cursor-pointer hover:underline">
                                        Click to upload logo
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                                    </label>
                                    <p className="text-xs text-slate-500 mt-1">PNG, JPG or SVG up to 2MB</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Sponsor Name *</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Company Name"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Globe size={14} /> Website URL
                            </label>
                            <input
                                type="text"
                                value={formData.url}
                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                                placeholder="https://..."
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <AlignLeft size={14} /> Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the sponsor..."
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Contact Person</label>
                            <input
                                type="text"
                                value={formData.contact}
                                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                placeholder="Full Name"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Mail size={14} /> Contact Email
                            </label>
                            <input
                                type="email"
                                value={formData.contact_email}
                                onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                                placeholder="email@example.com"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Phone size={14} /> Contact Phone
                            </label>
                            <input
                                type="text"
                                value={formData.contact_phone}
                                onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                                placeholder="+1 234 567 890"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <MapPin size={14} /> Country
                            </label>
                            <input
                                type="text"
                                value={formData.country}
                                onChange={e => setFormData({ ...formData, country: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
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
                            {sponsorToEdit ? 'Update Sponsor' : 'Create Sponsor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SponsorModal;
