import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Loader2, User, Mail, MapPin, AlertCircle, Camera, Upload } from 'lucide-react';
import { getImagePath } from '@/utils/imagePath';
import CountrySelect from '../components/CountrySelect';

interface Field {
    id: number;
    event_id: number;
    field_name: string;
    field_type: 'text' | 'number' | 'yes/no' | 'options' | 'date' | 'country' | 'image';
    field_values?: string;
    field_order: number;
    required: number | boolean;
}

const PublicConfirmation = () => {
    const { code } = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [event, setEvent] = useState<any>(null);
    const [fields, setFields] = useState<Field[]>([]);
    const [guest, setGuest] = useState<Record<string, any>>({});
    const [email, setEmail] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, [code]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/public/confirmation/${code}`);
            const data = res.data;
            setEvent({
                name: data.event_name,
                city: data.city,
                country: data.country,
                date_start: data.date_start,
                date_end: data.date_end,
                date: data.date,
                logo: data.logo
            });
            setEmail(data.email || '');
            setFields(data.fields || []);

            // Initialize form state using event fields definitions and backend-returned values
            const initialData: Record<string, any> = {};
            if (data.fields) {
                data.fields.forEach((f: Field) => {
                    initialData[f.field_name] = data.guestData?.[f.field_name] || '';
                });
            }
            // Always ensure image is initialized
            if (data.guestData?.image !== undefined) {
                initialData.image = data.guestData.image;
            } else {
                initialData.image = '';
            }
            setGuest(initialData);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid or expired invitation link.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        const missingRequired = fields.find(f => {
            const isReq = f.required === 1 || f.required === true;
            return isReq && !guest[f.field_name];
        });

        if (missingRequired) {
            setError(`Please fill in all mandatory fields (${missingRequired.field_name})`);
            return;
        }

        try {
            setSubmitting(true);
            await axios.post(`${import.meta.env.VITE_API_URL}/api/public/confirm`, {
                code: code,
                userData: guest
            });
            setConfirmed(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to confirm attendance.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            setUploading(true);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/upload?folder=users`, formData);
            setGuest(prev => ({ ...prev, image: res.data.url }));
        } catch (err) {
            alert('Error uploading image');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary" size={48} />
                    <p className="text-slate-600 font-medium">Validating invitation...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Oops!</h2>
                        <p className="text-slate-500 mt-2">{error}</p>
                    </div>
                    <p className="text-sm text-slate-400">If you believe this is an error, please contact the event administrator.</p>
                </div>
            </div>
        );
    }

    if (confirmed) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 size={40} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Confirmed!</h2>
                        <p className="text-slate-500 mt-2">Thank you for confirming your attendance to <strong>{event.name}</strong>.</p>
                    </div>
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 text-sm text-emerald-800">
                        We've sent your digital badge and QR code to your email. Please have it ready for entry.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                    {/* Event Banner */}
                    <div className="bg-slate-900 p-8 text-white">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                {event.logo && (
                                    <img src={getImagePath(event.logo, 'events')} alt={event.name} className="h-20 object-cover" />
                                )}
                            </div>
                            <div>
                                <p className="text-primary font-bold text-sm uppercase tracking-widest mb-1">Event Invitation</p>
                                <h1 className="text-3xl font-bold leading-tight">{event.name}</h1>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex-shrink-0">
                                <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                                    <MapPin size={14} /> {event.city}, {event.country}
                                </div>
                                <div className="text-white font-bold">
                                    {new Date(event.date_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Complete Your Profile</h2>
                            <p className="text-slate-500 text-center text-sm">Please verify and complete your information to receive your digital badge.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Profile Image (if image field exists) */}
                            {fields.find(f => f.field_type === 'image') && (
                                <div className="flex flex-col items-center gap-4 mb-8">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-3xl bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center">
                                            {guest.image ? (
                                                <img src={getImagePath(guest.image, 'users')} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={48} className="text-slate-300" />
                                            )}
                                            {uploading && (
                                                <div className="absolute inset-0 bg-white/85 flex items-center justify-center">
                                                    <Loader2 className="animate-spin text-primary" size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute -right-2 -bottom-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-all border-4 border-white">
                                            <Camera size={18} />
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                        </label>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Profile Photo</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {fields
                                    .filter(f => f.field_type !== 'image')
                                    .sort((a, b) => a.field_order - b.field_order)
                                    .map(field => {
                                        const value = guest[field.field_name] || '';
                                        const onChange = (val: any) => setGuest(prev => ({ ...prev, [field.field_name]: val }));
                                        const isRequired = field.required === 1 || field.required === true;
                                        const labelText = `${field.field_name.charAt(0).toUpperCase() + field.field_name.slice(1)}`;

                                        return (
                                            <div key={field.id} className="space-y-2">
                                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                    {labelText} {isRequired && <span className="text-red-500">*</span>}
                                                </label>
                                                {(() => {
                                                    switch (field.field_type) {
                                                        case 'number':
                                                            return (
                                                                <input
                                                                    required={isRequired}
                                                                    type="number"
                                                                    value={value}
                                                                    onChange={e => onChange(e.target.value)}
                                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-700"
                                                                />
                                                            );
                                                        case 'yes/no':
                                                            return (
                                                                <div className="flex gap-6 items-center py-2">
                                                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`confirm-${field.field_name}`}
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
                                                                            name={`confirm-${field.field_name}`}
                                                                            value="no"
                                                                            checked={value === 'no'}
                                                                            onChange={() => onChange('no')}
                                                                            required={isRequired}
                                                                            className="w-4 h-4 text-primary focus:ring-primary"
                                                                        />
                                                                        No
                                                                    </label>
                                                                </div>
                                                            );
                                                        case 'options':
                                                            return (
                                                                <select
                                                                    required={isRequired}
                                                                    value={value}
                                                                    onChange={e => onChange(e.target.value)}
                                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-700 bg-white"
                                                                >
                                                                    <option value="">Select option</option>
                                                                    {field.field_values?.split('|').map(v => v.trim()).filter(Boolean).map(opt => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                            );
                                                        case 'date':
                                                            return (
                                                                <input
                                                                    required={isRequired}
                                                                    type="date"
                                                                    value={value}
                                                                    onChange={e => onChange(e.target.value)}
                                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-700"
                                                                />
                                                            );
                                                        case 'country':
                                                            return (
                                                                <CountrySelect
                                                                    value={value}
                                                                    onChange={onChange}
                                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-700 bg-white"
                                                                />
                                                            );
                                                        case 'text':
                                                        default:
                                                            return (
                                                                <input
                                                                    required={isRequired}
                                                                    type="text"
                                                                    value={value}
                                                                    onChange={e => onChange(e.target.value)}
                                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-700"
                                                                />
                                                            );
                                                    }
                                                })()}
                                            </div>
                                        );
                                    })}
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || uploading}
                                className="w-full mt-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <><Loader2 className="animate-spin" /> Confirming...</>
                                ) : (
                                    <>Confirm My Attendance</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicConfirmation;
