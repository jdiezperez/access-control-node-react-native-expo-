import React, { useState, useEffect } from 'react';
import {
    X, Building2, Mail, Phone, MapPin, Globe, User,
    Lock, Eye, EyeOff, Loader2, Save, ShieldCheck, Upload, Image
} from 'lucide-react';
import axios from 'axios';
import { getImagePath } from '@/utils/imagePath';
import CountrySelect from '@/components/CountrySelect';

interface CompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    companyToEdit?: any;
}

const defaultCompanyForm = {
    name: '',
    address: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    logo: '',
};

const defaultAdminForm = {
    name: '',
    surname: '',
    email: '',
    password: '',
    confirmPassword: '',
};

const CompanyModal = ({ isOpen, onClose, onSave, companyToEdit }: CompanyModalProps) => {
    const [companyForm, setCompanyForm] = useState({ ...defaultCompanyForm });
    const [adminForm, setAdminForm] = useState({ ...defaultAdminForm });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const token = localStorage.getItem('token');

    const isEditMode = !!companyToEdit;

    useEffect(() => {
        setError(null);
        setShowPassword(false);
        if (companyToEdit) {
            setCompanyForm({
                name: companyToEdit.name || '',
                address: companyToEdit.address || '',
                email: companyToEdit.email || '',
                phone: companyToEdit.phone || '',
                city: companyToEdit.city || '',
                country: companyToEdit.country || '',
                logo: companyToEdit.logo || '',
            });
            setAdminForm({ ...defaultAdminForm });
        } else {
            setCompanyForm({ ...defaultCompanyForm });
            setAdminForm({ ...defaultAdminForm });
        }
    }, [companyToEdit, isOpen]);

    if (!isOpen) return null;

    /** Resize an image File to max `maxWidth` px wide, returning a JPEG Blob. */
    const resizeImageToBlob = (file: File, maxWidth = 500): Promise<Blob> =>
        new Promise((resolve, reject) => {
            const img = new window.Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const scale = img.width > maxWidth ? maxWidth / img.width : 1;
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
                    'image/jpeg',
                    0.85
                );
            };
            img.onerror = reject;
            img.src = url;
        });

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const resized = await resizeImageToBlob(file);
            const formData = new FormData();
            formData.append('image', resized, file.name.replace(/\.[^.]+$/, '.jpg'));
            const res = await axios.post('/api/superadmin/upload?folder=company', formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCompanyForm(prev => ({ ...prev, logo: res.data.url }));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Logo upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isEditMode) {
            if (!adminForm.password || adminForm.password !== adminForm.confirmPassword) {
                setError("Admin passwords don't match or are empty");
                return;
            }
            if (adminForm.password.length < 6) {
                setError('Admin password must be at least 6 characters');
                return;
            }
        }

        try {
            setLoading(true);
            if (isEditMode) {
                await axios.put(`/api/superadmin/companies/${companyToEdit.id}`, companyForm, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } else {
                await axios.post('/api/superadmin/companies', {
                    ...companyForm,
                    admin: {
                        name: adminForm.name,
                        surname: adminForm.surname,
                        email: adminForm.email,
                        password: adminForm.password,
                    },
                }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save company');
        } finally {
            setLoading(false);
        }
    };

    const logoSrc = getImagePath(companyForm.logo, 'company');

    const inputClass =
        'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all text-slate-700 placeholder:text-slate-300';

    const labelClass = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between"
                    style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <Building2 size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">
                                {isEditMode ? 'Edit Company' : 'Create New Company'}
                            </h2>
                            <p className="text-slate-500 text-sm">
                                {isEditMode ? 'Update company information.' : 'Set up company details and the admin account.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/60 rounded-full transition-colors text-slate-500 hover:text-slate-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                            <X size={16} className="shrink-0" /> {error}
                        </div>
                    )}

                    {/* Logo Upload */}
                    <div className="flex items-center gap-6 pb-5 border-b border-slate-100">
                        <div className="relative group shrink-0">
                            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden transition-all group-hover:border-violet-400">
                                {logoSrc ? (
                                    <img
                                        src={logoSrc}
                                        alt="Company logo"
                                        className="w-full h-full object-contain p-1"
                                    />
                                ) : (
                                    <Image size={28} className="text-slate-300" />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                                        <Loader2 className="animate-spin text-violet-500" size={20} />
                                    </div>
                                )}
                            </div>
                            <label
                                className="absolute -bottom-2 -right-2 p-1.5 rounded-xl shadow-lg cursor-pointer hover:scale-110 transition-transform text-white"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                            >
                                <Upload size={13} />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        <div>
                            <p className="font-bold text-slate-700 text-sm">Company Logo</p>
                            <p className="text-slate-400 text-xs mt-1">Optional. PNG, JPG or SVG. Resized to 500px wide.</p>
                            {companyForm.logo && (
                                <button
                                    type="button"
                                    onClick={() => setCompanyForm(prev => ({ ...prev, logo: '' }))}
                                    className="mt-2 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
                                >
                                    Remove logo
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Company Details */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 size={16} className="text-violet-500" />
                            <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">Company Details</h3>
                            <div className="flex-1 h-px bg-slate-100" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className={labelClass}>Company Name *</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input
                                        required
                                        type="text"
                                        value={companyForm.name}
                                        onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                                        placeholder="Acme Corporation"
                                        className={inputClass + ' pl-10'}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Contact Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input
                                        type="email"
                                        value={companyForm.email}
                                        onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                                        placeholder="info@company.com"
                                        className={inputClass + ' pl-10'}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input
                                        type="text"
                                        value={companyForm.phone}
                                        onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })}
                                        placeholder="+1 555 000 0000"
                                        className={inputClass + ' pl-10'}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>City</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input
                                        type="text"
                                        value={companyForm.city}
                                        onChange={e => setCompanyForm({ ...companyForm, city: e.target.value })}
                                        placeholder="New York"
                                        className={inputClass + ' pl-10'}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Country</label>
                                <CountrySelect
                                    value={companyForm.country}
                                    onChange={v => setCompanyForm({ ...companyForm, country: v })}
                                    className={inputClass + ' bg-white'}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input
                                        type="text"
                                        value={companyForm.address}
                                        onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
                                        placeholder="123 Main Street, Suite 100"
                                        className={inputClass + ' pl-10'}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Admin Account — create mode only */}
                    {!isEditMode && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldCheck size={16} className="text-violet-500" />
                                <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">Admin Account</h3>
                                <div className="flex-1 h-px bg-slate-100" />
                            </div>
                            <p className="text-xs text-slate-400 mb-4">This user will be the administrator for the new company.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>First Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            required
                                            type="text"
                                            value={adminForm.name}
                                            onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
                                            placeholder="John"
                                            className={inputClass + ' pl-10'}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Last Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            required
                                            type="text"
                                            value={adminForm.surname}
                                            onChange={e => setAdminForm({ ...adminForm, surname: e.target.value })}
                                            placeholder="Doe"
                                            className={inputClass + ' pl-10'}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className={labelClass}>Admin Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            required
                                            type="email"
                                            value={adminForm.email}
                                            onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                                            placeholder="admin@company.com"
                                            className={inputClass + ' pl-10'}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Password *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            required
                                            type={showPassword ? 'text' : 'password'}
                                            value={adminForm.password}
                                            onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                                            placeholder="Min. 6 characters"
                                            className={inputClass + ' pl-10 pr-10'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Confirm Password *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            required
                                            type="password"
                                            value={adminForm.confirmPassword}
                                            onChange={e => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                                            placeholder="Repeat password"
                                            className={inputClass + ' pl-10'}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || uploading}
                            className="px-6 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-violet-500/30 hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {isEditMode ? 'Save Changes' : 'Create Company'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanyModal;
