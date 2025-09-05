import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { cacheUserProfile, invalidateUserCache } from '../middleware/cache';

const router = Router();
const prisma = new PrismaClient();

// Get current user's profile
router.get('/', requireAuth, cacheUserProfile(), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        avatar: true,
        interests: true,
        connectionPreference: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Parse interests from JSON string
    const parsedInterests = user.interests ? JSON.parse(user.interests) : [];

    res.json({ 
      ok: true, 
      profile: {
        ...user,
        interests: parsedInterests
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch profile' });
  }
});

// Update current user's profile
router.put('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { name, age, bio, location, profession, avatar, interests, connectionPreference } = req.body;

    // Validate age if provided
    if (age && (age < 18 || age > 100)) {
      return res.status(400).json({ ok: false, error: 'Age must be between 18 and 100' });
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = age;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (profession !== undefined) updateData.profession = profession;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (connectionPreference !== undefined) updateData.connectionPreference = connectionPreference;
    if (interests !== undefined) updateData.interests = JSON.stringify(interests);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        avatar: true,
        interests: true,
        connectionPreference: true,
        isVerified: true,
        updatedAt: true
      }
    });

    // Parse interests from JSON string
    const parsedInterests = updatedUser.interests ? JSON.parse(updatedUser.interests) : [];

    // Invalidate user cache
    await invalidateUserCache(userId);

    res.json({ 
      ok: true, 
      profile: {
        ...updatedUser,
        interests: parsedInterests
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update profile' });
  }
});

// Get public profile by user ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
    const parsedInterests = user.interests ? JSON.parse(user.interests) : [];

    res.json({ 
      ok: true, 
      profile: {
        ...user,
        interests: parsedInterests
      }
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch profile' });
  }
});

export default router;


