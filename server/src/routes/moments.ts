import { Router } from 'express';

const router = Router();

type Moment = {
  id: string;
  videoUrl: string;
  likes: number;
  isLiked: boolean;
  coAuthorId?: string;
};

const moments: Moment[] = [
  { id: 'm1', videoUrl: 'https://example.com/video1.mp4', likes: 10, isLiked: false },
  { id: 'm2', videoUrl: 'https://example.com/video2.mp4', likes: 4, isLiked: false },
];

router.get('/', (_req, res) => {
  res.json({ ok: true, moments });
});

router.post('/', (req, res) => {
  const { videoUrl, coAuthorId } = req.body || {};
  if (!videoUrl) return res.status(400).json({ error: 'videoUrl required' });
  const m: Moment = { id: String(moments.length + 1), videoUrl, likes: 0, isLiked: false, coAuthorId };
  moments.unshift(m);
  res.json({ ok: true, moment: m });
});

router.post('/:id/like', (req, res) => {
  const { id } = req.params;
  const m = moments.find(x => x.id === id);
  if (!m) return res.status(404).json({ error: 'not found' });
  m.isLiked = !m.isLiked;
  m.likes += m.isLiked ? 1 : -1;
  res.json({ ok: true, moment: m });
});

router.post('/:id/report', (req, res) => {
  const { id } = req.params;
  const m = moments.find(x => x.id === id);
  if (!m) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

export default router;


