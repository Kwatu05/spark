import React, { useEffect, useState } from 'react';
import { Flame, Medal, Target } from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../App';

export const Gamification: React.FC<{ currentUser?: User | null; onBack?: () => void }> = ({ currentUser, onBack }) => {
  const userId = currentUser?.id || 'u1';
  const [progress, setProgress] = useState<{ streakDays: number; badges: string[]; weeklyChallenge: { id: string; title: string; completed: boolean } }>({ streakDays: 0, badges: [], weeklyChallenge: { id: 'wk1', title: '', completed: false } });

  const load = () => api.get<{ ok: boolean; progress: any }>(`/gamification/status/${userId}`).then(d => { if (d?.ok) setProgress(d.progress); }).catch(() => {});
  useEffect(() => { load(); }, [userId]);

  const inc = async () => { await api.post('/gamification/increment-streak', { userId }).catch(()=>null); load(); };
  const complete = async () => { await api.post('/gamification/complete-weekly', { userId }).catch(()=>null); load(); };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Medal className="text-coral" size={20} />
          <h2 className="text-xl font-semibold">Achievements</h2>
        </div>
        {onBack && <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">Back</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={18} className="text-orange-500" />
            <div className="font-medium">Daily Streak</div>
          </div>
          <div className="text-3xl font-bold">{progress.streakDays}<span className="text-base font-medium text-gray-600"> days</span></div>
          <button onClick={inc} className="mt-3 px-4 py-2 bg-coral text-white rounded-lg text-sm hover:bg-coral/90">Mark Today</button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={18} className="text-blue-600" />
            <div className="font-medium">Weekly Challenge</div>
          </div>
          <div className="text-sm text-gray-800">{progress.weeklyChallenge.title || 'Post 3 moments this week'}</div>
          <div className="mt-2 text-xs">Status: {progress.weeklyChallenge.completed ? 'Completed' : 'In progress'}</div>
          <button onClick={complete} disabled={progress.weeklyChallenge.completed} className={`mt-3 px-4 py-2 rounded-lg text-sm ${progress.weeklyChallenge.completed ? 'bg-gray-200 text-gray-500' : 'bg-coral text-white hover:bg-coral/90'}`}>Complete</button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-4">
        <div className="font-medium mb-2">Badges</div>
        {progress.badges.length === 0 ? (
          <p className="text-sm text-gray-600">No badges yet. Keep going!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {progress.badges.map(b => (
              <span key={b} className="px-3 py-1 bg-coral/10 text-coral text-sm rounded-full">{b}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
