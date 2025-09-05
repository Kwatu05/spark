import React, { useEffect, useState } from 'react';
import { Calendar, Image as ImageIcon, Users } from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../App';

export const Events: React.FC<{ currentUser?: User | null; onBack?: () => void }> = ({ currentUser, onBack }) => {
  const userId = currentUser?.id || 'u1';
  const [events, setEvents] = useState<{ id: string; title: string; date: string; location?: string; hostId: string; guests: string[]; photos: string[] }[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [photoByEventId, setPhotoByEventId] = useState<Record<string, string>>({});

  const load = () => api.get<{ ok: boolean; events: any[] }>(`/events`).then(d => { if (d?.ok) setEvents(d.events); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title || !date) return;
    await api.post(`/events`, { title, date, location, hostId: userId }).catch(() => null);
    setTitle(''); setDate(''); setLocation('');
    load();
  };

  const rsvp = async (id: string, attending: boolean) => { await api.post(`/events/${id}/rsvp`, { userId, attending }).catch(()=>null); load(); };
  const upload = async (id: string) => {
    const url = photoByEventId[id];
    if (!url) return;
    await api.post(`/events/${id}/photo`, { imageUrl: url }).catch(()=>null);
    setPhotoByEventId(p => ({ ...p, [id]: '' }));
    load();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="text-coral" size={20} />
          <h2 className="text-xl font-semibold">Events</h2>
        </div>
        {onBack && <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">Back</button>}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <div className="font-medium mb-3">Create an Event</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Title" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="datetime-local" value={date} onChange={(e)=>setDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Location" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={create} className="px-4 py-2 bg-coral text-white rounded-lg text-sm hover:bg-coral/90">Create</button>
        </div>
      </div>

      <div className="space-y-3">
        {events.map(ev => {
          const going = ev.guests.includes(userId);
          return (
            <div key={ev.id} className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{ev.title}</div>
                  <div className="text-sm text-gray-600">{new Date(ev.date).toLocaleString()} {ev.location ? `• ${ev.location}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  {going ? (
                    <button onClick={()=>rsvp(ev.id, false)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Not going</button>
                  ) : (
                    <button onClick={()=>rsvp(ev.id, true)} className="px-3 py-1.5 bg-coral text-white rounded-lg text-sm hover:bg-coral/90">RSVP</button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 mt-2"><Users size={14} /> {ev.guests.length} going</div>
              <div className="mt-3">
                <div className="flex gap-2">
                  <input value={photoByEventId[ev.id] || ''} onChange={(e)=>setPhotoByEventId(p=>({ ...p, [ev.id]: e.target.value }))} placeholder="Photo URL" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <button onClick={()=>upload(ev.id)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"><ImageIcon size={14} /> Upload</button>
                </div>
                {ev.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {ev.photos.map((p, idx) => (
                      <img key={idx} src={p} alt="" className="w-full h-20 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


