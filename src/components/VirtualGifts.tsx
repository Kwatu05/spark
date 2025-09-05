import React, { useEffect, useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../App';

export const VirtualGifts: React.FC<{ currentUser?: User | null; onBack?: () => void }> = ({ currentUser, onBack }) => {
  const userId = currentUser?.id || 'u1';
  const [gifts, setGifts] = useState<{ id: string; name: string; kind: 'sticker' | 'animation'; price: number; assetUrl: string }[]>([]);
  const [toUserId, setToUserId] = useState('');
  const [history, setHistory] = useState<{ id: string; to: string; giftId: string; at: number }[]>([]);

  useEffect(() => {
    api.get<{ ok: boolean; gifts: any[] }>(`/gifts/catalog`).then(d => { if (d?.ok) setGifts(d.gifts); }).catch(() => {});
    api.get<{ ok: boolean; history: any[] }>(`/gifts/history/${userId}`).then(d => { if (d?.ok) setHistory(d.history); }).catch(() => {});
  }, [userId]);

  const send = async (giftId: string) => {
    if (!toUserId) return;
    const d = await api.post(`/gifts/send`, { userId, toUserId, giftId }).catch(() => null);
    if (d?.ok) setHistory((h) => [d.sent, ...h].slice(0, 50));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Gift className="text-coral" size={20} />
          <h2 className="text-xl font-semibold">Virtual Gifts</h2>
        </div>
        {onBack && <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">Back</button>}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-coral" />
          <div className="font-medium">Send a Gift</div>
        </div>
        <div className="flex gap-2 mb-4">
          <input value={toUserId} onChange={(e)=>setToUserId(e.target.value)} placeholder="Recipient user ID" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gifts.map(g => (
            <button key={g.id} onClick={() => send(g.id)} className="border border-gray-200 rounded-xl p-3 hover:bg-gray-50 text-left">
              <img src={g.assetUrl} alt={g.name} className="w-16 h-16 object-contain mx-auto" />
              <div className="mt-2">
                <div className="font-medium text-sm">{g.name}</div>
                <div className="text-xs text-gray-600">{g.kind} · ${g.price}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="font-medium mb-2">Recent Sent</div>
        {history.length === 0 ? (
          <p className="text-sm text-gray-600">No gifts sent yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map(h => (
              <li key={h.id} className="flex items-center justify-between">
                <span>To {h.to} · {h.giftId}</span>
                <span className="text-gray-500">{new Date(h.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
