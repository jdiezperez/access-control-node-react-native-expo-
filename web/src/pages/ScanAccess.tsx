import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, XCircle, Camera, Loader2 } from 'lucide-react';

interface Event {
  id: number;
  name: string;
  date: string;
  status: string;
}

interface ScanResult {
  status: 'success' | 'error';
  message: string;
  guestName?: string;
  eventName?: string;
}

const ScanAccess = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'web-qr-reader-view';

  useEffect(() => {
    fetchEvents();
    return () => {
      // Clean up scanner on unmount
      if (qrReaderRef.current) {
        qrReaderRef.current.stop().catch((err) => console.log('Error stopping scanner', err));
      }
    };
  }, []);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/mobile/events', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(response.data);
      if (response.data.length > 0) {
        setSelectedEventId(response.data[0].id.toString());
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to load active events.');
    } finally {
      setLoadingEvents(false);
    }
  };

  const startScanning = async () => {
    if (!selectedEventId) return;
    setIsScanning(true);
    setResult(null);

    // Wait a brief tick for the DOM element to render
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        qrReaderRef.current = html5QrCode;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Handle barcode/QR scanned successfully
            handleBarCodeScanned(decodedText);
          },
          () => {
            // Failure is verbose (checks each frame), no action needed
          }
        );
      } catch (err: any) {
        console.error('Camera initialization failed', err);
        setErrorMessage('Failed to start camera. Please verify camera permissions.');
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanning = async () => {
    if (qrReaderRef.current && qrReaderRef.current.isScanning) {
      try {
        await qrReaderRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner', err);
      }
    }
    setIsScanning(false);
  };

  const handleBarCodeScanned = async (code: string) => {
    // Stop scanning immediately on successful read to avoid multiple API calls
    await stopScanning();

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/mobile/validate', {
        invitationCode: code,
        eventId: parseInt(selectedEventId)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setResult({
        status: 'success',
        message: response.data.message,
        guestName: response.data.guestName,
        eventName: response.data.eventName
      });
    } catch (error: any) {
      setResult({
        status: 'error',
        message: error.response?.data?.message || 'Invalid Badge'
      });
    }
  };

  const handleCloseModal = () => {
    setResult(null);
    // Restart scanning automatically
    startScanning();
  };

  return (
    <div className="max-w-md mx-auto py-4 sm:py-8">
      <div className="glass-card p-6 rounded-[2rem] shadow-xl relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 className="text-2xl font-black text-white mb-6 text-center tracking-tight">Scan Access</h2>

        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-200 p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-3">
            <XCircle className="shrink-0 text-red-400" size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Select Event */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Select Active Event</label>
            {loadingEvents ? (
              <div className="flex items-center gap-2 text-slate-400 py-3 pl-3">
                <Loader2 className="animate-spin" size={18} />
                <span className="text-sm font-semibold">Loading events...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="text-slate-400 text-sm italic py-2 pl-1">
                No active events assigned.
              </div>
            ) : (
              <select
                disabled={isScanning}
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-900/60 border border-white/10 text-white rounded-2xl outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-semibold cursor-pointer disabled:opacity-50"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id} className="bg-slate-900 text-white font-medium">
                    {evt.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Scanner Area */}
          <div className="flex flex-col items-center justify-center">
            {isScanning ? (
              <div className="w-full relative rounded-2xl overflow-hidden bg-black border border-white/15 aspect-square max-w-[320px]">
                <div id={scannerContainerId} className="w-full h-full" />
                <button
                  onClick={stopScanning}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-red-900/30"
                >
                  Cancel Scanner
                </button>
              </div>
            ) : (
              <div className="w-full max-w-[320px] aspect-square rounded-2xl bg-slate-950/40 border border-dashed border-white/10 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
                  <Camera size={32} />
                </div>
                <p className="text-slate-400 text-sm font-semibold mb-6">
                  {selectedEventId ? 'Camera ready to scan badges' : 'Please select an active event first'}
                </p>
                <button
                  disabled={!selectedEventId}
                  onClick={startScanning}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-black px-6 py-3.5 rounded-2xl transition-all shadow-xl shadow-indigo-900/30 flex items-center gap-2"
                >
                  <Camera size={18} />
                  Start Scanner
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result Modal / Overlay */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-8 rounded-[2.5rem] border items-center text-center shadow-2xl animate-in zoom-in duration-300 ${
            result.status === 'success' 
              ? 'bg-[#f0fdf4] border-green-200' 
              : 'bg-[#fef2f2] border-red-200'
          }`}>
            <div className="mb-5 flex justify-center">
              {result.status === 'success' ? (
                <CheckCircle2 size={72} className="text-green-500 animate-bounce" />
              ) : (
                <XCircle size={72} className="text-red-500 animate-pulse" />
              )}
            </div>

            <h3 className={`text-2xl font-black mb-2 tracking-tight ${
              result.status === 'success' ? 'text-[#166534]' : 'text-[#991b1b]'
            }`}>
              {result.status === 'success' ? 'Access Granted' : 'Access Denied'}
            </h3>

            <p className="text-[#475569] text-base mb-6 font-semibold">{result.message}</p>

            {result.status === 'success' && result.guestName && (
              <div className="mb-8 p-4 bg-green-100/60 rounded-2xl border border-green-200">
                <span className="text-[#166534]/70 text-xs font-bold uppercase tracking-wider block mb-1">Guest</span>
                <span className="text-[#166534] text-xl font-black block">{result.guestName}</span>
                {result.eventName && (
                  <span className="text-[#166534]/80 text-sm font-semibold block mt-1">
                    Event: {result.eventName}
                  </span>
                )}
              </div>
            )}

            <button
              onClick={handleCloseModal}
              className={`w-full py-4 rounded-2xl text-white font-extrabold text-base transition-all hover:scale-[1.02] shadow-lg ${
                result.status === 'success'
                  ? 'bg-green-600 hover:bg-green-700 shadow-green-950/20'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-950/20'
              }`}
            >
              Continue Scanning
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanAccess;
