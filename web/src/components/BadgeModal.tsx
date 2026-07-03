import { useRef } from 'react';
import { X, Printer, Download, User, MapPin, Calendar, Building2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Guest } from '@/data/Types';
import { getImagePath } from '@/utils/imagePath';

interface BadgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    guest: Guest & { invitation_code?: string };
    event: {
        id: number;
        name: string;
        city?: string;
        country?: string;
        date_start?: string;
        date_end?: string;
        logo?: string;
    } | null;
}

const BadgeModal = ({ isOpen, onClose, guest, event }: BadgeModalProps) => {
    const badgeRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !event) return null;

    const formattedDate = event.date_start
        ? new Date(event.date_start).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        })
        : null;

    const qrValue = guest.invitation_code || guest.email;

    const handlePrint = () => {
        const printContents = badgeRef.current?.innerHTML;
        if (!printContents) return;
        const win = window.open('', '_blank', 'width=700,height=900');
        if (!win) return;
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Badge – ${guest.name} ${guest.surname}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: system-ui, -apple-system, sans-serif; background: white; display: flex; justify-content: center; align-items: flex-start; padding: 20px; }
                    .badge-wrap { width: 400px; }
                </style>
            </head>
            <body><div class="badge-wrap">${printContents}</div></body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 400);
    };

    const handleSavePDF = () => {
        handlePrint(); // Browser print dialog → Save as PDF
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">Event Badge</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all border border-slate-200"
                        >
                            <Printer size={15} /> Print
                        </button>
                        <button
                            onClick={handleSavePDF}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                        >
                            <Download size={15} /> Save PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Badge Preview */}
                <div className="overflow-y-auto flex-1 p-6 bg-slate-100/50 flex items-center justify-center">
                    <div
                        ref={badgeRef}
                        className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200"
                        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    >
                        {/* Badge Top Band */}
                        <div className="h-3 bg-gradient-to-r from-primary via-primary/80 to-indigo-500" />

                        {/* Event Header */}
                        <div className="px-6 pt-5 pb-4 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {event.logo
                                    ? <img src={getImagePath(event.logo, 'events')} alt={event.name} className="w-full h-full object-cover" />
                                    : <Building2 className="text-white/60" size={24} />
                                }
                            </div>
                            <div className="min-w-0">
                                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Event</p>
                                <h3 className="text-white font-bold text-lg leading-tight truncate">{event.name}</h3>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                    {(event.city || event.country) && (
                                        <span className="flex items-center gap-1 text-white/60 text-xs">
                                            <MapPin size={10} />
                                            {[event.city, event.country].filter(Boolean).join(', ')}
                                        </span>
                                    )}
                                    {formattedDate && (
                                        <span className="flex items-center gap-1 text-white/60 text-xs">
                                            <Calendar size={10} />
                                            {formattedDate}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Guest Section */}
                        <div className="px-6 py-5 flex items-center gap-4 border-b border-slate-100">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {guest.image
                                    ? <img src={getImagePath(guest.image, 'users')} alt={guest.name} className="w-full h-full object-cover" />
                                    : <User className="text-slate-400" size={28} />
                                }
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guest</p>
                                <p className="text-xl font-bold text-slate-800 leading-tight capitalize">
                                    {guest.name} {guest.surname}
                                </p>
                                {/*** Add custom fields */}
                            </div>
                        </div>

                        {/* QR Code Section */}
                        <div className="px-6 py-6 flex flex-col items-center gap-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scan to verify attendance</p>
                            <div className="p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-inner">
                                <QRCodeSVG
                                    value={qrValue}
                                    size={180}
                                    level="H"
                                    includeMargin={false}
                                    fgColor="#1e293b"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono text-center break-all px-2">{qrValue}</p>
                        </div>

                        {/* Badge Bottom Band */}
                        <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-indigo-500" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BadgeModal;
