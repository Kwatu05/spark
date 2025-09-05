import React, { useMemo, useState } from 'react';
import { Calendar as CalIcon, MapPin, Search, DollarSign, Clock, Shield, Car, Utensils } from 'lucide-react';

export const DateBuilder: React.FC = () => {
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [budget, setBudget] = useState(50);
  const [duration, setDuration] = useState(90);
  const [origin, setOrigin] = useState('Home');
  const [destination, setDestination] = useState('');
  const [safetyEta, setSafetyEta] = useState(60);

  const etaTime = useMemo(() => {
    if (!date || !time) return '';
    const [h, m] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m + safetyEta, 0, 0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [date, time, safetyEta]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center space-x-3">
          <CalIcon size={22} className="text-coral" />
          <h1 className="text-lg font-semibold">Build a Date</h1>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Where to?</label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search places (coffee, park, sushi, museum...)"
                className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2 text-sm"
              />
            </div>
            <button className="px-3 py-2 bg-gray-100 rounded-md text-sm"><MapPin size={16} className="inline mr-1" />Use map</button>
          </div>
          <div className="text-xs text-gray-500">Map search coming soon.</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3"><DollarSign size={16} className="text-green-600"/><h3 className="font-medium">Budget</h3></div>
            <input type="range" min={0} max={300} value={budget} onChange={e=>setBudget(parseInt(e.target.value))} className="w-full" />
            <div className="text-sm text-gray-700 mt-1">Estimated spend: ${budget}</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3"><Clock size={16} className="text-blue-600"/><h3 className="font-medium">Duration & Travel</h3></div>
            <div className="flex items-center space-x-2">
              <Car size={16} className="text-gray-600"/>
              <span className="text-sm text-gray-700">From</span>
              <input value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Origin" className="px-2 py-1 border border-gray-300 rounded text-sm"/>
              <span className="text-sm text-gray-700">to</span>
              <input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Destination" className="px-2 py-1 border border-gray-300 rounded text-sm"/>
            </div>
            <div className="mt-2">
              <label className="block text-xs text-gray-600 mb-1">Planned duration (mins)</label>
              <input type="number" min={15} max={600} value={duration} onChange={e=>setDuration(parseInt(e.target.value)||90)} className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"/>
            </div>
            <div className="text-xs text-gray-500 mt-1">Travel estimates coming soon.</div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3"><Shield size={16} className="text-red-600"/><h3 className="font-medium">Safety ETA Check-in</h3></div>
          <label className="block text-xs text-gray-600 mb-1">Auto check-in after (mins)</label>
          <input type="number" min={15} max={240} value={safetyEta} onChange={e=>setSafetyEta(parseInt(e.target.value)||60)} className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"/>
          <div className="text-sm text-gray-700 mt-1">We’ll remind you to check in around {etaTime || '—'}.</div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3"><Utensils size={16} className="text-purple-600"/><h3 className="font-medium">Booking</h3></div>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-2 bg-gray-100 rounded-md text-sm">Open in Maps</button>
            <button className="px-3 py-2 bg-gray-100 rounded-md text-sm">Rideshare</button>
            <button className="px-3 py-2 bg-gray-100 rounded-md text-sm">Reserve (OpenTable)</button>
            <button className="px-3 py-2 bg-gray-100 rounded-md text-sm">Google Reserve</button>
          </div>
          <div className="text-xs text-gray-500 mt-1">Integrations are stubs for now.</div>
        </div>

        <button className="w-full py-2 bg-coral text-white rounded-md font-medium">Save Plan</button>
      </div>
    </div>
  );
};

export default DateBuilder;


