import React, { useEffect, useRef, useState } from 'react';
import { Shield, Share2, Clock, MapPin, AlertTriangle } from 'lucide-react';

type TrustedContact = { id: string; name: string; phone: string };

const CONTACTS_KEY = 'trusted_contacts';

function loadContacts(): TrustedContact[] {
  try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]'); } catch { return []; }
}
function saveContacts(items: TrustedContact[]) {
  try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(items)); } catch {}
}

export const SafetyToolkit: React.FC = () => {
  const [contacts, setContacts] = useState<TrustedContact[]>(() => loadContacts());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [checkInMins, setCheckInMins] = useState(30);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sos, setSos] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => { saveContacts(contacts); }, [contacts]);
  useEffect(() => {
    if (!isSharing) return;
    const id = navigator.geolocation.watchPosition((pos) => {
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    });
    return () => { navigator.geolocation.clearWatch(id); };
  }, [isSharing]);

  useEffect(() => {
    if (countdown === null) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c === null) return c;
        if (c <= 1) { window.clearInterval(intervalRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [countdown]);

  const add = () => {
    if (!name || !phone) return;
    setContacts([{ id: String(Date.now()), name, phone }, ...contacts]);
    setName(''); setPhone('');
  };

  const share = () => {
    setIsSharing((s) => !s);
  };

  const startCheckIn = () => {
    setCountdown(checkInMins * 60);
  };

  const smsLink = () => {
    const text = encodeURIComponent(`Spark safety check-in${coords ? ` at ${coords.lat.toFixed(5)},${coords.lon.toFixed(5)}` : ''}`);
    return `sms:&body=${text}`;
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Shield size={22} className="text-coral" />
          <h1 className="text-xl font-semibold text-gray-900">Safety Toolkit</h1>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Trusted contact name" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Phone" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
          </div>
          <button onClick={add} className="px-3 py-2 bg-coral text-white rounded-lg text-sm">Add Contact</button>
          <div className="space-y-2">
            {contacts.length === 0 ? (
              <div className="text-sm text-gray-600">No trusted contacts yet.</div>
            ) : contacts.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2">
                <div className="text-sm text-gray-800">{c.name} • {c.phone}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <button onClick={share} className={`w-full py-3 rounded-xl font-semibold inline-flex items-center justify-center ${isSharing ? 'bg-red-500 text-white':'bg-coral text-white'}`}>
            <Share2 size={18} className="mr-2" />
            {isSharing ? 'Stop Sharing Live Location' : 'Share Live Location'}
          </button>
          {coords && (
            <div className="text-xs text-gray-600 flex items-center space-x-2"><MapPin size={14}/><span>{coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}</span></div>
          )}
          <div className="text-xs text-gray-500 flex items-center space-x-1"><Clock size={12}/><span>Location updates periodically while sharing is on.</span></div>
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2"><Clock size={14}/><span className="text-sm font-medium text-gray-800">Check-in Timer</span></div>
            <div className="flex items-center space-x-2">
              <input type="number" min={5} max={180} value={checkInMins} onChange={(e)=>setCheckInMins(parseInt(e.target.value)||30)} className="w-20 px-2 py-1 border border-gray-300 rounded text-sm" />
              <button onClick={startCheckIn} className="px-3 py-1.5 bg-gray-100 rounded text-sm">Start</button>
              {typeof countdown === 'number' && (<span className="text-sm text-gray-700">{Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}</span>)}
            </div>
          </div>
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2"><AlertTriangle size={14} className="text-red-600"/><span className="text-sm font-medium text-gray-800">SOS</span></div>
            <button onClick={()=>setSos(!sos)} className={`w-full py-2 rounded ${sos ? 'bg-red-600 text-white' : 'bg-white'}`}>{sos ? 'SOS ON' : 'Activate SOS'}</button>
            <a href={smsLink()} className="block mt-2 text-center text-sm text-coral">Send SMS update</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyToolkit;


