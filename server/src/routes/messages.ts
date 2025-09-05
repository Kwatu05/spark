import { Router } from 'express';

const router = Router();

type Thread = { id: string; userId: string; lastMessage?: string };
let threads: Thread[] = [];

router.post('/start', (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const existing = threads.find(t => t.userId === userId);
  if (existing) return res.json({ ok: true, thread: existing });
  const thread: Thread = { id: String(threads.length + 1), userId };
  threads.push(thread);
  res.json({ ok: true, thread });
});

export default router;


