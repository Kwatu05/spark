import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Grid, Bookmark, Repeat2 } from 'lucide-react';

export const PublicProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<'posts' | 'reposts' | 'saved'>('posts');

  useEffect(() => {
    if (!id) return;
    api.get<{ ok: boolean; user: any }>(`/users/${id}`).then(d => {
      if (d?.ok) setUser(d.user);
    }).catch(() => {});
  }, [id]);

  if (!user) return <div className="max-w-2xl mx-auto px-4 py-6">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 text-coral">Back</button>
      <div className="flex items-center space-x-3 mb-4">
        <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />
        <div>
          <h1 className="text-xl font-semibold">{user.name}</h1>
          <p className="text-sm text-gray-600">{user.location} • {user.profession}</p>
        </div>
      </div>
      <p className="text-gray-800 mb-4">{user.bio || 'No bio yet.'}</p>
      <div className="flex flex-wrap gap-2">
        {(user.interests || []).map((i: string, idx: number) => (
          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{i}</span>
        ))}
      </div>

      <div className="mt-6 border-b border-gray-200">
        <nav className="flex">
          {[
            { id: 'posts', label: 'Posts', icon: Grid },
            { id: 'reposts', label: 'Reposts', icon: Repeat2 },
            { id: 'saved', label: 'Boards', icon: Bookmark },
          ].map((t: any) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium border-b-2 ${tab === t.id ? 'border-coral text-coral bg-coral/5' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <t.icon size={16} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="py-4">
        {tab === 'posts' && (
          <div className="text-sm text-gray-600">User posts will appear here.</div>
        )}
        {tab === 'reposts' && (
          <div className="text-sm text-gray-600">User reposts will appear here.</div>
        )}
        {tab === 'saved' && (
          <div className="text-sm text-gray-600">User public boards will appear here.</div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;


