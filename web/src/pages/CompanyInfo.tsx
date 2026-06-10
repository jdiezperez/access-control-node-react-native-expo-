import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Mail, Phone, MapPin, Upload, Loader2, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import CountrySelect from '@/components/CountrySelect';

interface Company {
    name: string;
    logo: string;
    address: string;
    email: string;
    phone: string;
    city: string;
    country: string;
}

const CompanyInfo = () => {
    const [company, setCompany] = useState<Company>({
        name: '',
        logo: '',
        address: '',
        email: '',
        phone: '',
        city: '',
        country: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchCompany();
    }, []);

    const fetchCompany = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/admin/company', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setCompany(prev => ({ ...prev, ...res.data }));
            }
        } catch (err) {
            console.error(err);
            setStatus({ type: 'error', message: 'Failed to load company information' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            setUploading(true);
            const res = await axios.post('/api/admin/upload?folder=company', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`
                }
            });
            setCompany(prev => ({ ...prev, logo: res.data.url }));
            setStatus({ type: 'success', message: 'Logo uploaded successfully' });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.response?.data?.message || 'Logo upload failed' });
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setStatus(null);
            await axios.post('/api/admin/company', company, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus({ type: 'success', message: 'Company information updated successfully!' });
        } catch (err) {
            setStatus({ type: 'error', message: 'Failed to update company information' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-white tracking-tight">Company Information</h1>
                <p className="text-slate-400 font-medium mt-0.5">Manage your organization's public profile and contact details.</p>
            </div>

            {status && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
                    status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                    {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="font-semibold">{status.message}</span>
                </div>
            )}

            {/* Form Container */}
            <div className="rounded-3xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
                <form onSubmit={handleSave} className="p-8 md:p-12 space-y-10">
                    {/* Logo Section */}
                    <div className="flex flex-col md:flex-row items-center gap-8 pb-10 border-b border-white/5">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-3xl bg-white flex items-center justify-center overflow-hidden border border-white/10 p-2">
                                {company.logo ? (
                                    <img src={company.logo} alt="Company Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <Building2 className="text-slate-400" size={48} />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                                        <Loader2 className="animate-spin text-primary" size={24} />
                                    </div>
                                )}
                            </div>
                            <label className="absolute -bottom-2 -right-2 p-2.5 bg-primary text-white rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform">
                                <Upload size={16} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                            </label>
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-1">
                            <h3 className="text-lg font-bold text-white">Company Logo</h3>
                            <p className="text-sm text-slate-400">Update your company logo. Square images work best. PNG, JPG or SVG up to 2MB.</p>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Building2 size={14} className="text-primary" /> Company Name
                            </label>
                            <input
                                type="text"
                                value={company.name}
                                onChange={e => setCompany({ ...company, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                                placeholder="Antigravity Inc."
                                required
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Mail size={14} className="text-primary" /> Official Email
                            </label>
                            <input
                                type="email"
                                value={company.email}
                                onChange={e => setCompany({ ...company, email: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                                placeholder="hello@antigravity.io"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Phone size={14} className="text-primary" /> Phone Number
                            </label>
                            <input
                                type="text"
                                value={company.phone}
                                onChange={e => setCompany({ ...company, phone: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={14} className="text-primary" /> City
                            </label>
                            <input
                                type="text"
                                value={company.city}
                                onChange={e => setCompany({ ...company, city: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                                placeholder="New York"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Globe size={14} className="text-primary" /> Country
                            </label>
                            <CountrySelect
                                value={company.country}
                                onChange={v => setCompany({ ...company, country: v })}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 bg-slate-900"
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                            />
                        </div>

                        <div className="space-y-3 md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={14} className="text-primary" /> Headquarters Address
                            </label>
                            <textarea
                                value={company.address}
                                onChange={e => setCompany({ ...company, address: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 outline-none transition-all text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 min-h-[100px]"
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                                placeholder="123 Tech Avenue, Silicon Valley, CA"
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-white font-bold shadow-xl shadow-blue-500/30 hover:opacity-90 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanyInfo;
