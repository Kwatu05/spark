import { Router } from 'express';

const router = Router();

type Event = { id: string; title: string; date: string; location?: string; hostId: string; guests: string[]; photos: string[] };
const events: Event[] = [];

router.get('/', (_req, res) => {
  res.json({ ok: true, events });
});

router.post('/', (req, res) => {
  const { title, date, location, hostId } = req.body || {};
  if (!title || !date || !hostId) return res.status(400).json({ ok: false, error: 'title, date, hostId required' });
  const e: Event = { id: String(events.length + 1), title, date, location, hostId, guests: [], photos: [] };
  events.unshift(e);
  res.json({ ok: true, event: e });
});

router.post('/:id/rsvp', (req, res) => {
  const { id } = req.params;
  const { userId, attending } = req.body || {};
  const e = events.find(x => x.id === id);
  if (!e) return res.status(404).json({ ok: false, error: 'not found' });
  if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
  if (attending) {
    if (!e.guests.includes(userId)) e.guests.push(userId);
  } else {
    e.guests = e.guests.filter(g => g !== userId);
  }
  res.json({ ok: true, event: e });
});

router.post('/:id/photo', (req, res) => {
  const { id } = req.params;
  const { imageUrl } = req.body || {};
  const e = events.find(x => x.id === id);
  if (!e) return res.status(404).json({ ok: false, error: 'not found' });
  if (imageUrl) e.photos.unshift(imageUrl);
  res.json({ ok: true, event: e });
});

export default router;


