import { useState } from 'react';
import axios from 'axios';
import { X, Loader2 } from 'lucide-react';

const ImportCSVModal = ({ onClose, onImported, eventId }: { onClose: () => void, onImported: () => void, eventId: string }) => {
    const token = localStorage.getItem('token');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [addToEvent, setAddToEvent] = useState(true);
    const [errors, setErrors] = useState<string[]>([]);

    const handleImport = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('addToEvent', String(addToEvent));

        try {
            setUploading(true);
            setErrors([]);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/guests/import`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.data.errors?.length > 0) {
                setErrors(res.data.errors);
            } else {
                onImported();
                onClose();
            }
        } catch (err) {
            alert('Import failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-bold text-slate-800">Import Guests from CSV</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Select CSV File</label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={e => setFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 transition-all cursor-pointer"
                        />
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => setAddToEvent(!addToEvent)}>
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${addToEvent ? 'bg-primary border-primary' : 'bg-white border-slate-300'}`}>
                            {addToEvent && <div className="w-3 h-3 bg-white rounded-sm" />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-700">Add Guests to this Event</p>
                            <p className="text-xs text-slate-500">Enable to automatically link these guests to the current event.</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Fields (* = required):</p>
                        <p className="text-xs text-slate-600 font-mono">name*, surname*, email*, role, organization, city, country, gender</p>
                    </div>

                    {errors.length > 0 && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100 space-y-2">
                            <p className="text-xs font-bold text-red-600">These guests could not be imported:</p>
                            <ul className="text-[10px] text-red-500 list-disc list-inside max-h-32 overflow-auto">
                                {errors.map((e, idx) => <li key={idx}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-gray-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 px-6 py-2 text-slate-600 font-semibold hover:text-slate-800 transition-colors">Cancel</button>
                    <button
                        onClick={handleImport}
                        disabled={!file || uploading}
                        className="flex-1 px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {uploading ? <Loader2 className="animate-spin" size={18} /> : 'Start Import'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportCSVModal;