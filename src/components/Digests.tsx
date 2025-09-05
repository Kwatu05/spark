import React, { useEffect, useState } from 'react';
import { Bell, List } from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../App';

export const Digests: React.FC<{ currentUser?: User | null; onBack?: () => void }> = ({ currentUser, onBack }) => {
  const userId = currentUser?.id || 'u1';
  const [prefs, setPrefs] = useState<{ frequency: 'daily' | 'weekly'; matches: boolean; boards: boolean; events: boolean }>({ frequency: 'daily', matches: true, boards: true, events: false });
  const [items, setItems] = useState<Array<{ type: string; title: string; subtitle?: string }>>([]);

  useEffect(() => {
    api.get<{ ok: boolean; prefs: any }>(`/digests/prefs/${userId}`).then(d => { if (d?.ok) setPrefs(d.prefs); }).catch(() => {});
  }, [userId]);

  const save = async () => { await api.post('/digests/prefs', { userId, prefs }).catch(()=>null); };
  const preview = async () => {
    const d = await api.get<{ ok: boolean; items: any[]; frequency: string }>(`/digests/generate/${userId}`).catch(()=>null);
    if (d?.ok) setItems(d.items);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="text-coral" size={20} />
          <h2 className="text-xl font-semibold">Notification Digests</h2>
        </div>
        {onBack && <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">Back</button>}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <div className="font-medium mb-3">Preferences</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select value={prefs.frequency} onChange={(e)=>setPrefs(p=>({ ...p, frequency: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prefs.matches} onChange={(e)=>setPrefs(p=>({ ...p, matches: e.target.checked }))} /> Matches & sparks</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prefs.boards} onChange={(e)=>setPrefs(p=>({ ...p, boards: e.target.checked }))} /> Saved boards</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prefs.events} onChange={(e)=>setPrefs(p=>({ ...p, events: e.target.checked }))} /> Nearby events</label>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={save} className="px-4 py-2 bg-coral text-white rounded-lg text-sm hover:bg-coral/90">Save</button>
          <button onClick={preview} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"><List size={14}/> Preview</button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="font-medium mb-2">Preview</div>
          <ul className="space-y-2">
            {items.map((it, idx) => (
              <li key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{it.title}</div>
                  {it.subtitle && <div className="text-xs text-gray-600">{it.subtitle}</div>}
                </div>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">{it.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
