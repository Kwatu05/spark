import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

const PROMPTS = [
  'Two truths and a lie about me are…',
  'An unusual skill I have is…',
  'You pick the place, I’ll plan the date…',
  'My perfect Sunday looks like…',
  'A small green flag I look for is…',
];

const QOTD = [
  'What’s a simple thing that made your day better this week?',
  'What’s your go-to comfort meal?',
  'What’s something new you tried recently?',
  'What’s a place you want to revisit and why?',
];

export const PromptsQOTD: React.FC = () => {
  const [promptIndex, setPromptIndex] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('qotd_date');
      const today = new Date().toDateString();
      if (stored !== today) {
        const next = Math.floor(Math.random() * QOTD.length);
        setQIndex(next);
        localStorage.setItem('qotd_date', today);
        localStorage.setItem('qotd_index', String(next));
      } else {
        const idx = Number(localStorage.getItem('qotd_index') || '0');
        setQIndex(idx % QOTD.length);
      }
    } catch {}
  }, []);

  const cyclePrompt = () => setPromptIndex((i) => (i + 1) % PROMPTS.length);

  const submit = () => {
    if (!answer.trim()) return;
    const entry = { at: Date.now(), q: QOTD[qIndex], a: answer };
    try {
      const raw = localStorage.getItem('qotd_answers');
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(entry);
      localStorage.setItem('qotd_answers', JSON.stringify(list.slice(0, 50)));
    } catch {}
    setAnswer('');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Conversation Prompts</h2>
            <button onClick={cyclePrompt} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Next prompt">
              <RefreshCw size={18} />
            </button>
          </div>
          <p className="text-gray-700">{PROMPTS[promptIndex]}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Question of the Day</h2>
          <p className="text-gray-700 mb-3">{QOTD[qIndex]}</p>
          <div className="flex items-center space-x-2">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Share your answer"
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            />
            <button onClick={submit} className="px-3 py-2 bg-coral text-white rounded-lg text-sm inline-flex items-center space-x-1">
              <Sparkles size={16} />
              <span>Post</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptsQOTD;


