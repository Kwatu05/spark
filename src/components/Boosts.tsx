import React, { useEffect, useState } from 'react';
import { Zap, Rocket, Gift } from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../App';

export const Boosts: React.FC<{ currentUser?: User | null; onBack?: () => void }> = ({ currentUser, onBack }) => {
  const userId = currentUser?.id || 'u1';
  const [packs, setPacks] = useState<{ id: string; boosts: number; superSparks: number; price: number }[]>([]);
  const [balance, setBalance] = useState<{ boosts: number; superSparks: number; activeBoostUntil?: number }>({ boosts: 0, superSparks: 0 });
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    api.get<{ ok: boolean; packs: any[] }>(`/boosts/packs`).then(d => { if (d?.ok) setPacks(d.packs); }).catch(() => {});
    api.get<{ ok: boolean; balance: any }>(`/boosts/status/${userId}`).then(d => { if (d?.ok) setBalance(d.balance); }).catch(() => {});
  }, [userId]);

  const buy = async (packId: string) => {
    const d = await api.post(`/boosts/buy`, { userId, packId }).catch(() => null);
    if (d?.ok) setBalance(d.balance);
  };

  const activate = async () => {
    const d = await api.post(`/boosts/activate`, { userId, minutes: 15 }).catch(() => null);
    if (d?.ok) setBalance(d.balance);
  };

  const sendSuperSpark = async () => {
    if (!targetId) return;
    const d = await api.post(`/boosts/supersparks/send`, { userId, targetId }).catch(() => null);
    if (d?.ok) setBalance(d.balance);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Rocket className="text-coral" size={20} />
          <h2 className="text-xl font-semibold">Boosts & Super-Sparks</h2>
        </div>
        {onBack && <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">Back</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {packs.map(p => (
          <div key={p.id} className="border border-gray-200 rounded-2xl p-4">
            <div className="font-semibold mb-1 capitalize">{p.id}</div>
            <div className="text-sm text-gray-600 mb-3">{p.boosts} boosts · {p.superSparks} super-sparks</div>
            <button onClick={() => buy(p.id)} className="w-full py-2 rounded-lg bg-coral text-white text-sm hover:bg-coral/90">Buy for ${p.price}</button>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-coral" />
            <div>
              <div className="font-medium">Your Balance</div>
              <div className="text-sm text-gray-600">{balance.boosts} boosts · {balance.superSparks} super-sparks</div>
            </div>
          </div>
          <button onClick={activate} className="px-4 py-2 bg-coral text-white rounded-full text-sm hover:bg-coral/90">Activate 15m Boost</button>
        </div>
        {balance.activeBoostUntil && (
          <p className="text-xs text-gray-500 mt-2">Active until {new Date(balance.activeBoostUntil).toLocaleTimeString()}</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift size={18} className="text-coral" />
          <div className="font-medium">Send a Super-Spark</div>
        </div>
        <div className="flex gap-2">
          <input value={targetId} onChange={(e)=>setTargetId(e.target.value)} placeholder="Target user ID" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={sendSuperSpark} className="px-4 py-2 bg-coral text-white rounded-lg text-sm hover:bg-coral/90">Send</button>
        </div>
      </div>
    </div>
  );
}
