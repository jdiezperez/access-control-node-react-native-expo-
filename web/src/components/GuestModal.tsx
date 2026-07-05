import React, { useState, useEffect } from 'react';
import { X, User, Loader2, Save, Upload } from 'lucide-react';
import axios from 'axios';

interface Field {
    id: number;
    event_id: number;
    field_name: string;
    field_type: 'text' | 'number' | 'yes/no' | 'options' | 'date';
    field_values?: string;
    field_order: number;
    required: number | boolean;
}

interface GuestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    guestToEdit?: any;
    eventId?: string | number;
}

const GuestModal = ({ isOpen, onClose, onSave, guestToEdit, eventId }: GuestModalProps) => {
    const [fields, setFields] = useState<Field[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFields = async () => {
            if (eventId) {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/fields`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setFields(res.data);
                } catch (err) {
                    console.error('Failed to fetch event fields', err);
                }
            } else {
                console.error('Event cannot be empty');
            }
        };

        if (isOpen) {
            fetchFields();
        }
    }, [eventId, isOpen]);

    useEffect(() => {
        if (isOpen) {
            const initialData: Record<string, any> = {};
            fields.forEach(f => {
                initialData[f.field_name] = guestToEdit ? (guestToEdit[f.field_name] || '') : '';
            });
            initialData.image = guestToEdit ? (guestToEdit.image || '') : '';
            setFormData(initialData);
        }
    }, [guestToEdit, fields, isOpen]);

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

        // Validation: find first missing required field
        const missingRequired = fields.find(f => {
            const isReq = f.required === 1 || f.required === true;
            return isReq && !formData[f.field_name];
        });

        if (missingRequired) {
            setError(`Please fill in all mandatory fields (${missingRequired.field_name})`);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            if (eventId) {
                if (guestToEdit) {
                    const customData = fields.map(f => ({
                        field_id: f.id,
                        field_value: formData[f.field_name]
                    }));
                    await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/guests/${guestToEdit.id}/customdata`, {
                        customData
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } else {
                    await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/guests/create`, {
                        guestData: formData
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }
            } else {
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
            }
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save guest');
        } finally {
            setLoading(false);
        }
    };

    const sortedFields = [...fields].sort((a, b) => a.field_order - b.field_order);

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
                        {sortedFields.map(field => {
                            const value = formData[field.field_name] || '';
                            const onChange = (val: any) => setFormData(prev => ({ ...prev, [field.field_name]: val }));
                            const isRequired = field.required === 1 || field.required === true;
                            const labelText = `${field.field_name.charAt(0).toUpperCase() + field.field_name.slice(1)}${isRequired ? ' *' : ''}`;

                            switch (field.field_type) {
                                case 'number':
                                    return (
                                        <div key={field.id} className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                {labelText}
                                            </label>
                                            <input
                                                required={isRequired}
                                                type="number"
                                                value={value}
                                                onChange={e => onChange(e.target.value)}
                                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                            />
                                        </div>
                                    );
                                case 'yes/no':
                                    return (
                                        <div key={field.id} className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                                                {labelText}
                                            </label>
                                            <div className="flex gap-6 items-center py-2">
                                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={field.field_name}
                                                        value="yes"
                                                        checked={value === 'yes'}
                                                        onChange={() => onChange('yes')}
                                                        required={isRequired}
                                                        className="w-4 h-4 text-primary focus:ring-primary"
                                                    />
                                                    Yes
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={field.field_name}
                                                        value="no"
                                                        checked={value === 'no'}
                                                        onChange={() => onChange('no')}
                                                        required={isRequired}
                                                        className="w-4 h-4 text-primary focus:ring-primary"
                                                    />
                                                    No
                                                </label>
                                            </div>
                                        </div>
                                    );
                                case 'options':
                                    return (
                                        <div key={field.id} className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                {labelText}
                                            </label>
                                            <select
                                                required={isRequired}
                                                value={value}
                                                onChange={e => onChange(e.target.value)}
                                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                                            >
                                                <option value="">Select option</option>
                                                {field.field_values?.split('|').map(v => v.trim()).filter(Boolean).map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                case 'date':
                                    return (
                                        <div key={field.id} className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                {labelText}
                                            </label>
                                            <input
                                                required={isRequired}
                                                type="date"
                                                value={value}
                                                onChange={e => onChange(e.target.value)}
                                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                            />
                                        </div>
                                    );
                                case 'text':
                                default:
                                    return (
                                        <div key={field.id} className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                                {labelText}
                                            </label>
                                            <input
                                                required={isRequired}
                                                type="text"
                                                value={value}
                                                onChange={e => onChange(e.target.value)}
                                                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                            />
                                        </div>
                                    );
                            }
                        })}
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
