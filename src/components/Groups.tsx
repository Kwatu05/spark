import React, { useEffect, useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../App';

export const Groups: React.FC<{ currentUser?: User | null; onBack?: () => void }> = ({ currentUser, onBack }) => {
  const userId = currentUser?.id || 'u1';
  const [groups, setGroups] = useState<{ id: string; name: string; description?: string; members: string[] }[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = () => api.get<{ ok: boolean; groups: any[] }>(`/groups`).then(d => { if (d?.ok) setGroups(d.groups); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name) return;
    await api.post(`/groups`, { name, description }).catch(() => null);
    setName(''); setDescription('');
    load();
  };

  const join = async (id: string) => { await api.post(`/groups/${id}/join`, { userId }).catch(()=>null); load(); };
  const leave = async (id: string) => { await api.post(`/groups/${id}/leave`, { userId }).catch(()=>null); load(); };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="text-coral" size={20} />
          <h2 className="text-xl font-semibold">Groups</h2>
        </div>
        {onBack && <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">Back</button>}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Plus size={18} className="text-coral" />
          <div className="font-medium">Create a Group</div>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Group name" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Description (optional)" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={create} className="px-4 py-2 bg-coral text-white rounded-lg text-sm hover:bg-coral/90">Create</button>
        </div>
      </div>

      <div className="space-y-3">
        {groups.map(g => {
          const isMember = g.members.includes(userId);
          return (
            <div key={g.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="text-sm text-gray-600">{g.description || 'No description'}</div>
                <div className="text-xs text-gray-500 mt-1">{g.members.length} members</div>
              </div>
              {isMember ? (
                <button onClick={()=>leave(g.id)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Leave</button>
              ) : (
                <button onClick={()=>join(g.id)} className="px-3 py-1.5 bg-coral text-white rounded-lg text-sm hover:bg-coral/90">Join</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
