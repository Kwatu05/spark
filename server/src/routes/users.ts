import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all users (for discovery/feed)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = search ? {
      OR: [
        { name: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } },
        { bio: { contains: search as string, mode: 'insensitive' } }
      ]
    } : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        avatar: true,
        interests: true,
        connectionPreference: true,
        isVerified: true,
        createdAt: true
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    });

    // Parse interests from JSON strings
    const usersWithParsedInterests = users.map(user => ({
      ...user,
      interests: user.interests ? JSON.parse(user.interests) : []
    }));

    res.json({ ok: true, users: usersWithParsedInterests });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        avatar: true,
        interests: true,
        connectionPreference: true,
        isVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Parse interests from JSON string
    const userWithParsedInterests = {
      ...user,
      interests: user.interests ? JSON.parse(user.interests) : []
    };

    res.json({ ok: true, user: userWithParsedInterests });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch user' });
  }
});

export default router;


