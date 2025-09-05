import { Router } from 'express';

const router = Router();

type Plan = { id: string; name: string; priceMonthly: number; perks: string[] };
const plans: Plan[] = [
  { id: 'free', name: 'Free', priceMonthly: 0, perks: ['Basic discovery', 'Standard messages'] },
  { id: 'plus', name: 'Spark Plus', priceMonthly: 9, perks: ['Advanced filters', 'Incognito mode', 'Boost 1x/mo'] },
  { id: 'pro', name: 'Spark Pro', priceMonthly: 19, perks: ['All Plus perks', 'Read receipts', '2x boosts/mo'] },
];

// naive in-memory user->plan map for demo
const userPlanById: Record<string, string> = {};

router.get('/plans', (_req, res) => {
  res.json({ ok: true, plans });
});

router.post('/subscribe', (req, res) => {
  const { userId, planId } = req.body || {};
  if (!userId || !planId) return res.status(400).json({ ok: false, error: 'userId and planId required' });
  const exists = plans.find(p => p.id === planId);
  if (!exists) return res.status(400).json({ ok: false, error: 'invalid planId' });
  userPlanById[userId] = planId;
  res.json({ ok: true, planId });
});

router.get('/subscription/:userId', (req, res) => {
  const { userId } = req.params;
  const planId = userPlanById[userId] || 'free';
  res.json({ ok: true, planId });
});

export default router;


