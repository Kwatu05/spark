import React, { useMemo, useState } from 'react';
import { Heart, ArrowLeft, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Choice = { id: string; label: string; weight: number };
type Question = { id: string; text: string; choices: Choice[]; category: string };

const QUESTIONS: Question[] = [
  { id: 'q1', text: 'Ideal first date?', category: 'lifestyle', choices: [
    { id: 'coffee', label: 'Coffee & walk', weight: 3 },
    { id: 'dinner', label: 'Dinner & talk', weight: 2 },
    { id: 'adventure', label: 'Outdoor adventure', weight: 4 },
    { id: 'movie', label: 'Movie night', weight: 1 },
  ]},
  { id: 'q2', text: 'Weekend vibe?', category: 'lifestyle', choices: [
    { id: 'active', label: 'Active outside', weight: 4 },
    { id: 'chill', label: 'Chill at home', weight: 2 },
    { id: 'social', label: 'Friends & social', weight: 3 },
    { id: 'creative', label: 'Create something', weight: 3 },
  ]},
  { id: 'q3', text: 'Long-term goal?', category: 'values', choices: [
    { id: 'family', label: 'Family first', weight: 4 },
    { id: 'career', label: 'Career growth', weight: 3 },
    { id: 'balance', label: 'Balanced life', weight: 4 },
    { id: 'travel', label: 'See the world', weight: 3 },
  ]},
  { id: 'q4', text: 'Communication style?', category: 'values', choices: [
    { id: 'often', label: 'Frequent check-ins', weight: 3 },
    { id: 'quality', label: 'Quality over quantity', weight: 4 },
    { id: 'space', label: 'Plenty of space', weight: 2 },
    { id: 'spontaneous', label: 'Spontaneous', weight: 2 },
  ]},
];

export const CompatibilityQuiz: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('compat_quiz') || '{}'); } catch { return {}; }
  });

  const current = QUESTIONS[step];

  const progressPct = Math.round(((step) / QUESTIONS.length) * 100);

  const setAnswer = (qid: string, choiceId: string) => {
    setAnswers(prev => ({ ...prev, [qid]: choiceId }));
  };

  const canContinue = Boolean(answers[current?.id]);

  const result = useMemo(() => {
    let total = 0;
    let max = 0;
    for (const q of QUESTIONS) {
      const choice = q.choices.find(c => c.id === answers[q.id]);
      const maxChoice = q.choices.reduce((a, b) => (a.weight > b.weight ? a : b));
      if (choice) total += choice.weight;
      max += maxChoice.weight;
    }
    const score = max > 0 ? Math.round((total / max) * 100) : 0;
    return { score, total, max };
  }, [answers]);

  const finish = () => {
    try { localStorage.setItem('compat_quiz', JSON.stringify(answers)); } catch {}
    try { localStorage.setItem('compat_quiz_score', String(result.score)); } catch {}
    navigate('/discover');
  };

  if (!current) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <Heart size={36} className="mx-auto text-coral mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Great match energy</h1>
          <p className="text-gray-600 mb-4">Your compatibility score is {result.score}%</p>
          <button onClick={finish} className="w-full py-3 bg-coral text-white rounded-xl font-semibold">Start discovering</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-center space-x-3 mb-4">
        <button onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold">Compatibility Quiz</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="h-2 bg-gray-100 rounded-full mb-4">
          <div className="h-2 bg-coral rounded-full" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-gray-900 font-medium mb-4">{current.text}</p>
        <div className="space-y-2">
          {current.choices.map((c) => {
            const active = answers[current.id] === c.id;
            return (
              <button key={c.id} onClick={() => setAnswer(current.id, c.id)} className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${active ? 'border-coral bg-coral/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span>{c.label}</span>
                  {active ? <Check size={18} className="text-coral" /> : <X size={18} className="text-transparent" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-gray-500">{step + 1} / {QUESTIONS.length}</span>
          <button
            disabled={!canContinue}
            onClick={() => setStep(step + 1)}
            className={`px-5 py-2 rounded-lg font-semibold ${canContinue ? 'bg-coral text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompatibilityQuiz;


