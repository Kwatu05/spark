import { Router } from 'express';

const router = Router();

type Connection = {
  id: string;
  user: { id: string; name: string; avatar: string; age?: number; location?: string; profession?: string; interests?: string[]; isVerified?: boolean };
  status: 'pending' | 'connected' | 'sparked';
  mutualSpark?: boolean;
  sparkContext?: string;
};

const connections: Connection[] = [
  { id: 'c1', user: { id: 'u2', name: 'Bob', avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' }, status: 'pending', sparkContext: 'Liked your hiking post' },
  { id: 'c2', user: { id: 'u3', name: 'Cara', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop' }, status: 'connected', mutualSpark: true, sparkContext: 'Both liked Jazz bar' },
];

router.get('/', (_req, res) => {
  res.json({ ok: true, connections });
});

router.post('/:id/accept', (req, res) => {
  const { id } = req.params;
  const c = connections.find(x => x.id === id);
  if (!c) return res.status(404).json({ error: 'not found' });
  c.status = 'connected';
  c.mutualSpark = true;
  res.json({ ok: true, connection: c });
});

router.post('/:id/decline', (req, res) => {
  const { id } = req.params;
  const idx = connections.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  connections.splice(idx, 1);
  res.json({ ok: true });
});

export default router;


