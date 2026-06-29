import { useState } from 'react';
import axios from 'axios';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReportData {
    importedCount: number;
    matchedFields: string[];
    unmatchedFields: string[];
    errors: string[];
}

const ImportCSVModal = ({ onClose, onImported, eventId }: { onClose: () => void, onImported: () => void, eventId: string }) => {
    const token = localStorage.getItem('token');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [report, setReport] = useState<ReportData | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    const handleImport = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);

        try {
            setUploading(true);
            setErrors([]);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/guests/import`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            setReport({
                importedCount: res.data.importedCount,
                matchedFields: res.data.matchedFields || [],
                unmatchedFields: res.data.unmatchedFields || [],
                errors: res.data.errors || []
            });
        } catch (err: any) {
            setErrors([err.response?.data?.message || 'Import failed']);
        } finally {
            setUploading(false);
        }
    };

    const handleFinish = () => {
        onImported();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-bold text-slate-800">
                        {report ? 'Import Report' : 'Import Guests from CSV'}
                    </h3>
                    <button onClick={report ? handleFinish : onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {report ? (
                    <div className="p-8 space-y-6">
                        <div className="flex flex-col items-center gap-2 text-center py-2">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                                <CheckCircle2 size={32} />
                            </div>
                            <h4 className="font-bold text-slate-800 text-lg">Import Completed</h4>
                            <p className="text-slate-500 text-sm">
                                Successfully imported <span className="font-bold text-slate-800">{report.importedCount}</span> guests.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Matched Fields (Saved to Database)
                                </h5>
                                <div className="flex flex-wrap gap-1.5">
                                    {report.matchedFields.length > 0 ? (
                                        report.matchedFields.map(f => (
                                            <span key={f} className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg border border-emerald-100">
                                                {f}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">None</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Unmatched Fields (Ignored)
                                </h5>
                                <div className="flex flex-wrap gap-1.5">
                                    {report.unmatchedFields.length > 0 ? (
                                        report.unmatchedFields.map(f => (
                                            <span key={f} className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-lg border border-amber-100">
                                                {f}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">None</span>
                                    )}
                                </div>
                            </div>

                            {report.errors.length > 0 && (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-2">
                                    <p className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                                        <AlertCircle size={14} /> The following records had errors:
                                    </p>
                                    <ul className="text-[10px] text-red-500 list-disc list-inside max-h-24 overflow-auto space-y-0.5">
                                        {report.errors.map((e, idx) => (
                                            <li key={idx}>{e}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleFinish}
                                className="w-full py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all text-center"
                            >
                                Finish
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
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

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Expected Event Fields:</p>
                                <p className="text-xs text-slate-600 font-mono">
                                    CSV columns should match your event's fields (e.g. name, surname, email, country, etc.) but can be in any order.
                                </p>
                            </div>

                            {errors.length > 0 && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 space-y-2">
                                    <p className="text-xs font-bold text-red-600">Failed to start import:</p>
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
                    </>
                )}
            </div>
        </div>
    );
};

export default ImportCSVModal;