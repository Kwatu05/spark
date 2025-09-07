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

// Get user suggestions based on interests and preferences
router.get('/suggestions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      limit = 20, 
      minAge, 
      maxAge, 
      location, 
      interests, 
      connectionPreference, 
      verifiedOnly 
    } = req.query;

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    // Get current user's profile for matching
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        interests: true,
        location: true,
        age: true,
        connectionPreference: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Build where clause for suggestions
    const where: any = {
      id: { not: currentUserId }, // Exclude current user
    };

    if (minAge || maxAge) {
      where.age = {};
      if (minAge) where.age.gte = parseInt(minAge as string);
      if (maxAge) where.age.lte = parseInt(maxAge as string);
    }

    if (location) {
      where.location = { contains: location as string, mode: 'insensitive' };
    }

    if (connectionPreference) {
      where.connectionPreference = connectionPreference as string;
    }

    if (verifiedOnly === 'true') {
      where.isVerified = true;
    }

    // Get potential matches
    const potentialMatches = await prisma.user.findMany({
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
      take: parseInt(limit as string) * 3, // Get more to filter by interests
      orderBy: { createdAt: 'desc' }
    });

    // Calculate match scores and filter by interests
    const currentUserInterests = currentUser.interests ? JSON.parse(currentUser.interests) : [];
    const requestedInterests = interests ? (interests as string).split(',') : [];

    const scoredMatches = potentialMatches
      .map(user => {
        const userInterests = user.interests ? JSON.parse(user.interests) : [];
        
        // Calculate match score
        let score = 0;
        const matchReasons: string[] = [];

        // Interest matching (60% of score)
        const commonInterests = currentUserInterests.filter((interest: string) => 
          userInterests.includes(interest)
        );
        const interestScore = currentUserInterests.length > 0 
          ? (commonInterests.length / currentUserInterests.length) * 60 
          : 0;
        score += interestScore;

        if (commonInterests.length > 0) {
          matchReasons.push(`Share ${commonInterests.length} interest${commonInterests.length > 1 ? 's' : ''}: ${commonInterests.slice(0, 3).join(', ')}`);
        }

        // Location matching (20% of score)
        if (currentUser.location && user.location) {
          const currentLocation = currentUser.location.toLowerCase();
          const userLocation = user.location.toLowerCase();
          
          if (currentLocation === userLocation) {
            score += 20;
            matchReasons.push('Same location');
          } else if (currentLocation.includes(userLocation.split(',')[0]) || userLocation.includes(currentLocation.split(',')[0])) {
            score += 10;
            matchReasons.push('Nearby location');
          }
        }

        // Age compatibility (20% of score)
        if (currentUser.age && user.age) {
          const ageDiff = Math.abs(currentUser.age - user.age);
          if (ageDiff <= 2) {
            score += 20;
            matchReasons.push('Similar age');
          } else if (ageDiff <= 5) {
            score += 10;
            matchReasons.push('Compatible age');
          }
        }

        // Filter by requested interests if provided
        if (requestedInterests.length > 0) {
          const hasRequestedInterests = requestedInterests.some(interest => 
            userInterests.includes(interest)
          );
          if (!hasRequestedInterests) return null;
        }

        return {
          ...user,
          interests: userInterests,
          matchScore: Math.round(score),
          matchReasons
        };
      })
      .filter(user => user !== null && user.matchScore > 0) // Only show users with some match
      .sort((a, b) => b.matchScore - a.matchScore) // Sort by match score
      .slice(0, parseInt(limit as string)); // Limit results

    res.json({ ok: true, suggestions: scoredMatches });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch suggestions' });
  }
});

// Get trending interests
router.get('/trending-interests', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // Get all user interests and count frequency
    const users = await prisma.user.findMany({
      select: { interests: true }
    });

    const interestCounts: Record<string, number> = {};
    
    users.forEach(user => {
      if (user.interests) {
        const interests = JSON.parse(user.interests);
        interests.forEach((interest: string) => {
          interestCounts[interest] = (interestCounts[interest] || 0) + 1;
        });
      }
    });

    // Sort by frequency and return top interests
    const trendingInterests = Object.entries(interestCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([interest]) => interest);

    res.json({ ok: true, interests: trendingInterests });
  } catch (error) {
    console.error('Get trending interests error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch trending interests' });
  }
});

// Get nearby users (placeholder - would need location data in schema)
router.get('/nearby', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { lat, lng, radius = 50, limit = 20 } = req.query;
    
    // For now, return location-based suggestions using the location field
    // In a real app, you'd use proper geospatial queries
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user?.id },
        location: { not: null }
      },
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
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' }
    });

    // Add mock match scores for nearby users
    const nearbyUsers = users.map(user => ({
      ...user,
      interests: user.interests ? JSON.parse(user.interests) : [],
      matchScore: Math.floor(Math.random() * 40) + 60, // 60-100% match for nearby
      matchReasons: ['Nearby location']
    }));

    res.json({ ok: true, suggestions: nearbyUsers });
  } catch (error) {
    console.error('Get nearby users error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch nearby users' });
  }
});

export default router;


