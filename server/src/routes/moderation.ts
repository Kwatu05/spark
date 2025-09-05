import { Router } from 'express';

const router = Router();

type Report = {
  id: string;
  targetId: string;
  kind: 'user' | 'post' | 'comment' | 'moment';
  reason: string;
  details?: string;
  createdAt: string;
  status: 'open' | 'reviewed' | 'dismissed';
};

const reports: Report[] = [];

router.get('/reports', (_req, res) => {
  res.json({ ok: true, reports });
});

router.post('/reports', (req, res) => {
  const { targetId, kind, reason, details } = req.body || {};
  if (!targetId || !kind || !reason) return res.status(400).json({ error: 'invalid report' });
  const report: Report = {
    id: String(reports.length + 1),
    targetId,
    kind,
    reason,
    details,
    createdAt: new Date().toISOString(),
    status: 'open',
  };
  reports.unshift(report);
  res.json({ ok: true, report });
});

router.post('/reports/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const r = reports.find(x => x.id === id);
  if (!r) return res.status(404).json({ error: 'not found' });
  if (!['open','reviewed','dismissed'].includes(status)) return res.status(400).json({ error: 'bad status' });
  r.status = status;
  res.json({ ok: true, report: r });
});

export default router;


