import { Router } from 'express';

const router = Router();

type Progress = { streakDays: number; badges: string[]; weeklyChallenge: { id: string; title: string; completed: boolean } };
const progressByUser: Record<string, Progress> = {};

const defaultWeekly = { id: 'wk1', title: 'Post 3 moments this week', completed: false };

router.get('/status/:userId', (req, res) => {
  const { userId } = req.params;
  const p = progressByUser[userId] || { streakDays: 0, badges: [], weeklyChallenge: { ...defaultWeekly } };
  res.json({ ok: true, progress: p });
});

router.post('/increment-streak', (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
  const p = progressByUser[userId] || { streakDays: 0, badges: [], weeklyChallenge: { ...defaultWeekly } };
  p.streakDays += 1;
  if (p.streakDays === 7 && !p.badges.includes('7-day-streak')) p.badges.push('7-day-streak');
  progressByUser[userId] = p;
  res.json({ ok: true, progress: p });
});

router.post('/complete-weekly', (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
  const p = progressByUser[userId] || { streakDays: 0, badges: [], weeklyChallenge: { ...defaultWeekly } };
  p.weeklyChallenge.completed = true;
  if (!p.badges.includes('weekly-finisher')) p.badges.push('weekly-finisher');
  progressByUser[userId] = p;
  res.json({ ok: true, progress: p });
});

router.post('/award', (req, res) => {
  const { userId, badge } = req.body || {};
  if (!userId || !badge) return res.status(400).json({ ok: false, error: 'userId and badge required' });
  const p = progressByUser[userId] || { streakDays: 0, badges: [], weeklyChallenge: { ...defaultWeekly } };
  if (!p.badges.includes(badge)) p.badges.push(badge);
  progressByUser[userId] = p;
  res.json({ ok: true, progress: p });
});

export default router;


