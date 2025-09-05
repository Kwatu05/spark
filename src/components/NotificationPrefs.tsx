import React, { useEffect, useState } from 'react';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../App';

export const NotificationPrefs: React.FC<{ currentUser?: User | null; onBack?: () => void }> = ({ currentUser, onBack }) => {
  const userId = currentUser?.id || 'u1';
  const [prefs, setPrefs] = useState<{ pushEnabled: boolean; emailEnabled: boolean; quietHoursStart: string; quietHoursEnd: string }>({ pushEnabled: true, emailEnabled: true, quietHoursStart: '22:00', quietHoursEnd: '07:00' });
  const [lastResult, setLastResult] = useState<string>('');

  useEffect(() => {
    api.get<{ ok: boolean; prefs: any }>(`/notifications/prefs/${userId}`).then(d => { if (d?.ok) setPrefs(d.prefs); }).catch(() => {});
  }, [userId]);

  const save = async () => { await api.post('/notifications/prefs', { userId, prefs }).catch(()=>null); };
  const testSend = async (channel: 'push' | 'email') => {
    const d = await api.post('/notifications/send-test', { userId, channel }).catch(()=>null);
    if (d?.ok) setLastResult(d.delivered ? `${channel} delivered` : `blocked: ${d.reason}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="text-coral" size={20} />
          <h2 className="text-xl font-semibold">Notification Preferences</h2>
        </div>
        {onBack && <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">Back</button>}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Smartphone size={18} className="text-coral" /><span className="font-medium">Push Notifications</span></div>
          <input type="checkbox" checked={prefs.pushEnabled} onChange={(e)=>setPrefs(p=>({ ...p, pushEnabled: e.target.checked }))} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Mail size={18} className="text-coral" /><span className="font-medium">Email Notifications</span></div>
          <input type="checkbox" checked={prefs.emailEnabled} onChange={(e)=>setPrefs(p=>({ ...p, emailEnabled: e.target.checked }))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quiet Hours Start</label>
            <input type="time" value={prefs.quietHoursStart} onChange={(e)=>setPrefs(p=>({ ...p, quietHoursStart: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quiet Hours End</label>
            <input type="time" value={prefs.quietHoursEnd} onChange={(e)=>setPrefs(p=>({ ...p, quietHoursEnd: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={save} className="px-4 py-2 bg-coral text-white rounded-lg text-sm hover:bg-coral/90">Save</button>
          <button onClick={()=>testSend('push')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Send Test Push</button>
          <button onClick={()=>testSend('email')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Send Test Email</button>
          {lastResult && <span className="text-xs text-gray-600">{lastResult}</span>}
        </div>
      </div>
    </div>
  );
}
