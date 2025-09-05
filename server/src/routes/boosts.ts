import { Router } from 'express';

const router = Router();

type Packs = {
  boosts: number;
  superSparks: number;
};

const store = {
  packs: [
    { id: 'starter', boosts: 1, superSparks: 0, price: 2 },
    { id: 'value', boosts: 3, superSparks: 1, price: 5 },
    { id: 'power', boosts: 5, superSparks: 3, price: 10 },
  ],
};

const balanceByUser: Record<string, Packs & { activeBoostUntil?: number }> = {};

router.get('/status/:userId', (req, res) => {
  const { userId } = req.params;
  const bal = balanceByUser[userId] || { boosts: 0, superSparks: 0 };
  res.json({ ok: true, balance: bal });
});

router.get('/packs', (_req, res) => {
  res.json({ ok: true, packs: store.packs });
});

router.post('/buy', (req, res) => {
  const { userId, packId } = req.body || {};
  if (!userId || !packId) return res.status(400).json({ ok: false, error: 'userId and packId required' });
  const pack = store.packs.find(p => p.id === packId);
  if (!pack) return res.status(400).json({ ok: false, error: 'invalid pack' });
  const current = balanceByUser[userId] || { boosts: 0, superSparks: 0 };
  balanceByUser[userId] = {
    ...current,
    boosts: current.boosts + pack.boosts,
    superSparks: current.superSparks + pack.superSparks,
  };
  res.json({ ok: true, balance: balanceByUser[userId] });
});

router.post('/activate', (req, res) => {
  const { userId, minutes } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
  const current = balanceByUser[userId] || { boosts: 0, superSparks: 0 };
  if ((current.boosts || 0) <= 0) return res.status(400).json({ ok: false, error: 'no boosts available' });
  const durationMs = Math.max(5, Math.min(60, Number(minutes) || 15)) * 60 * 1000;
  const until = Date.now() + durationMs;
  balanceByUser[userId] = { ...current, boosts: current.boosts - 1, activeBoostUntil: until };
  res.json({ ok: true, activeBoostUntil: until, balance: balanceByUser[userId] });
});

router.post('/supersparks/send', (req, res) => {
  const { userId, targetId } = req.body || {};
  if (!userId || !targetId) return res.status(400).json({ ok: false, error: 'userId and targetId required' });
  const current = balanceByUser[userId] || { boosts: 0, superSparks: 0 };
  if ((current.superSparks || 0) <= 0) return res.status(400).json({ ok: false, error: 'no super-sparks available' });
  balanceByUser[userId] = { ...current, superSparks: current.superSparks - 1 };
  // In a real app, notify targetId user
  res.json({ ok: true, delivered: true, balance: balanceByUser[userId] });
});

export default router;


