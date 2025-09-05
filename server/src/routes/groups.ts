import { Router } from 'express';

const router = Router();

type Group = { id: string; name: string; description?: string; members: string[] };
const groups: Group[] = [];

router.get('/', (_req, res) => {
  res.json({ ok: true, groups });
});

router.post('/', (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: 'name required' });
  const g: Group = { id: String(groups.length + 1), name, description, members: [] };
  groups.unshift(g);
  res.json({ ok: true, group: g });
});

router.post('/:id/join', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body || {};
  const g = groups.find(x => x.id === id);
  if (!g) return res.status(404).json({ ok: false, error: 'not found' });
  if (userId && !g.members.includes(userId)) g.members.push(userId);
  res.json({ ok: true, group: g });
});

router.post('/:id/leave', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body || {};
  const g = groups.find(x => x.id === id);
  if (!g) return res.status(404).json({ ok: false, error: 'not found' });
  if (userId) g.members = g.members.filter(m => m !== userId);
  res.json({ ok: true, group: g });
});

export default router;


