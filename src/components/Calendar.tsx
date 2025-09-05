import React, { useMemo, useState } from 'react';
import { Calendar as CalIcon, Plus, Check, X, Download } from 'lucide-react';

type EventItem = {
  id: string;
  title: string;
  date: string; // ISO date
  time?: string;
  location?: string;
  rsvp: 'going' | 'maybe' | 'no' | 'none';
  createdAt: number;
};

const KEY = 'shared_calendar_events';

function loadEvents(): EventItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function saveEvents(items: EventItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

export const Calendar: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>(() => loadEvents());
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ title: '', date: '', time: '', location: '' });

  const upcoming = useMemo(() => {
    return [...events].sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [events]);

  const addEvent = () => {
    if (!draft.title || !draft.date) return;
    const item: EventItem = {
      id: String(Date.now()),
      title: draft.title,
      date: draft.date,
      time: draft.time || undefined,
      location: draft.location || undefined,
      rsvp: 'none',
      createdAt: Date.now(),
    };
    const next = [item, ...events];
    setEvents(next);
    saveEvents(next);
    setDraft({ title: '', date: '', time: '', location: '' });
    setShowCreate(false);
  };

  const setRsvp = (id: string, rsvp: EventItem['rsvp']) => {
    const next = events.map(e => e.id === id ? { ...e, rsvp } : e);
    setEvents(next);
    saveEvents(next);
  };

  const exportICS = () => {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Spark//Calendar//EN',
    ];
    for (const e of events) {
      const dt = e.date.replace(/[-:]/g, '').replace(/T.*/, '');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${e.id}@spark`);
      lines.push(`DTSTAMP:${dt}T000000Z`);
      lines.push(`DTSTART:${dt}${e.time ? 'T' + e.time.replace(':','') + '00' : 'T090000'}`);
      lines.push(`SUMMARY:${e.title}`);
      if (e.location) lines.push(`LOCATION:${e.location}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spark-calendar.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CalIcon size={22} className="text-coral" />
          <h1 className="text-xl font-semibold">Shared Calendar</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowCreate(true)} className="px-3 py-2 bg-coral text-white rounded-lg text-sm inline-flex items-center"><Plus size={16} className="mr-1"/> Add</button>
          <button onClick={exportICS} className="px-3 py-2 bg-gray-100 rounded-lg text-sm inline-flex items-center"><Download size={16} className="mr-1"/> Export</button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={draft.title} onChange={(e)=>setDraft({...draft, title:e.target.value})} placeholder="Title" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <input value={draft.location} onChange={(e)=>setDraft({...draft, location:e.target.value})} placeholder="Location (optional)" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <input type="date" value={draft.date} onChange={(e)=>setDraft({...draft, date:e.target.value})} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <input type="time" value={draft.time} onChange={(e)=>setDraft({...draft, time:e.target.value})} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div className="flex items-center justify-end space-x-2 mt-3">
            <button onClick={()=>{setShowCreate(false); setDraft({ title:'', date:'', time:'', location:''});}} className="px-3 py-2 bg-gray-100 rounded-lg text-sm inline-flex items-center"><X size={16} className="mr-1"/> Cancel</button>
            <button onClick={addEvent} className="px-3 py-2 bg-coral text-white rounded-lg text-sm inline-flex items-center"><Check size={16} className="mr-1"/> Save</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {upcoming.length === 0 ? (
          <div className="text-center text-gray-600 bg-white border border-gray-200 rounded-xl p-10">No events yet</div>
        ) : upcoming.map(e => (
          <div key={e.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{e.title}</div>
              <div className="text-sm text-gray-600">{e.date}{e.time ? ` • ${e.time}`: ''}{e.location ? ` • ${e.location}`: ''}</div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={()=>setRsvp(e.id, 'going')} className={`px-3 py-1.5 rounded-full text-xs ${e.rsvp==='going'?'bg-green-100 text-green-700':'bg-gray-100'}`}>Going</button>
              <button onClick={()=>setRsvp(e.id, 'maybe')} className={`px-3 py-1.5 rounded-full text-xs ${e.rsvp==='maybe'?'bg-yellow-100 text-yellow-700':'bg-gray-100'}`}>Maybe</button>
              <button onClick={()=>setRsvp(e.id, 'no')} className={`px-3 py-1.5 rounded-full text-xs ${e.rsvp==='no'?'bg-red-100 text-red-700':'bg-gray-100'}`}>No</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;


