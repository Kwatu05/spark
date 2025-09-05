import { Router } from 'express';

const router = Router();

type Prefs = { frequency: 'daily' | 'weekly'; matches: boolean; boards: boolean; events: boolean };
const prefsByUser: Record<string, Prefs> = {};

router.get('/prefs/:userId', (req, res) => {
  const { userId } = req.params;
  const prefs = prefsByUser[userId] || { frequency: 'daily', matches: true, boards: true, events: false };
  res.json({ ok: true, prefs });
});

router.post('/prefs', (req, res) => {
  const { userId, prefs } = req.body || {};
  if (!userId || !prefs) return res.status(400).json({ ok: false, error: 'userId and prefs required' });
  const normalized: Prefs = {
    frequency: prefs.frequency === 'weekly' ? 'weekly' : 'daily',
    matches: !!prefs.matches,
    boards: !!prefs.boards,
    events: !!prefs.events,
  };
  prefsByUser[userId] = normalized;
  res.json({ ok: true, prefs: normalized });
});

router.get('/generate/:userId', (req, res) => {
  const { userId } = req.params;
  const prefs = prefsByUser[userId] || { frequency: 'daily', matches: true, boards: true, events: false };
  const items: Array<{ type: string; title: string; subtitle?: string }> = [];
  if (prefs.matches) items.push({ type: 'match', title: 'You have 2 new sparks', subtitle: 'Say hi and keep the streak!' });
  if (prefs.boards) items.push({ type: 'board', title: '3 new saves to your boards', subtitle: 'Check out what friends are curating' });
  if (prefs.events) items.push({ type: 'event', title: 'This weekend: coffee & creatives', subtitle: '12 nearby attending' });
  res.json({ ok: true, items, frequency: prefs.frequency });
});

export default router;


