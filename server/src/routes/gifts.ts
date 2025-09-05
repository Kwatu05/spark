import { Router } from 'express';

const router = Router();

type Gift = { id: string; name: string; kind: 'sticker' | 'animation'; price: number; assetUrl: string };
const catalog: Gift[] = [
  { id: 'rose', name: 'Rose', kind: 'sticker', price: 1, assetUrl: 'https://placehold.co/80x80?text=🌹' },
  { id: 'sparkle', name: 'Sparkle Burst', kind: 'animation', price: 2, assetUrl: 'https://placehold.co/80x80?text=✨' },
  { id: 'choco', name: 'Chocolate', kind: 'sticker', price: 1, assetUrl: 'https://placehold.co/80x80?text=🍫' },
  { id: 'ring', name: 'Diamond', kind: 'animation', price: 3, assetUrl: 'https://placehold.co/80x80?text=💎' },
];

const sentByUser: Record<string, { id: string; to: string; giftId: string; at: number }[]> = {};

router.get('/catalog', (_req, res) => {
  res.json({ ok: true, gifts: catalog });
});

router.post('/send', (req, res) => {
  const { userId, toUserId, giftId } = req.body || {};
  if (!userId || !toUserId || !giftId) return res.status(400).json({ ok: false, error: 'userId, toUserId, giftId required' });
  const gift = catalog.find(g => g.id === giftId);
  if (!gift) return res.status(400).json({ ok: false, error: 'invalid giftId' });
  const entry = { id: String(Date.now()), to: toUserId, giftId, at: Date.now() };
  sentByUser[userId] = [entry, ...(sentByUser[userId] || [])].slice(0, 50);
  // In a real app, charge user and notify recipient
  res.json({ ok: true, sent: entry });
});

router.get('/history/:userId', (req, res) => {
  const { userId } = req.params;
  res.json({ ok: true, history: sentByUser[userId] || [] });
});

export default router;


