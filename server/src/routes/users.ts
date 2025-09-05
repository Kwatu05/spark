import { Router } from 'express';

const router = Router();

type SimpleUser = {
  id: string;
  name: string;
  age: number;
  location: string;
  profession: string;
  avatar: string;
  connectionPreference: string;
  interests: string[];
  isVerified?: boolean;
};

const users: SimpleUser[] = [
  {
    id: 'u1', name: 'Alice', age: 26, location: 'London', profession: 'Designer',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    connectionPreference: 'Friends', interests: ['Hiking','Art','Coffee'], isVerified: true,
  },
  {
    id: 'u2', name: 'Bob', age: 29, location: 'Manchester', profession: 'Engineer',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    connectionPreference: 'Long-term', interests: ['Music','Cycling','Cooking']
  },
  {
    id: 'u3', name: 'Cara', age: 24, location: 'Birmingham', profession: 'Marketer',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
    connectionPreference: 'Short-term', interests: ['Dance','Yoga','Travel']
  },
];

router.get('/', (_req, res) => {
  res.json({ ok: true, users });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true, user });
});

export default router;


