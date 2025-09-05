import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { cacheFeed, invalidatePostCache } from '../middleware/cache';
import { webSocketService } from '../services/websocket';

const router = Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, cacheFeed(), async (req: AuthenticatedRequest, res) => {
  try {
    const mode = String(req.query.mode || 'recency');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    let orderBy: any = { createdAt: 'desc' };

    // Apply different sorting based on mode
    if (mode === 'explore') {
      // Sort by engagement (likes + comments)
      orderBy = [
        { likes: { _count: 'desc' } },
        { comments: { _count: 'desc' } },
        { createdAt: 'desc' }
      ];
    } else if (mode === 'nearby') {
      // For now, just use recency (can be enhanced with location data later)
      orderBy = { createdAt: 'desc' };
    } else if (mode === 'graph') {
      // For now, just use recency (can be enhanced with social graph data later)
      orderBy = { createdAt: 'desc' };
    }

    const posts = await prisma.post.findMany({
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            isVerified: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      }
    });

    const total = await prisma.post.count();

    res.json({ 
      ok: true, 
      mode, 
      posts: posts.map(post => ({
        id: post.id,
        user: post.user,
        caption: post.caption,
        type: post.type,
        content: post.content ? JSON.parse(post.content) : [],
        activityTags: post.activityTags ? JSON.parse(post.activityTags) : [],
        location: post.location,
        likes: post._count.likes,
        comments: post._count.comments,
        isLiked: false, // Will be updated based on user's likes
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch feed' });
  }
});

router.post('/:id/like', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found' });
    }

    // Check if user already liked this post
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId: id
        }
      }
    });

    if (existingLike) {
      // Unlike the post
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId,
            postId: id
          }
        }
      });

      const likeCount = await prisma.like.count({
        where: { postId: id }
      });

      // Invalidate post cache
      await invalidatePostCache(id);

      // Broadcast like update via WebSocket
      await webSocketService.broadcastLikeUpdate(id, userId, 'unliked');

      res.json({ ok: true, isLiked: false, likes: likeCount });
    } else {
      // Like the post
      await prisma.like.create({
        data: {
          userId,
          postId: id
        }
      });

      const likeCount = await prisma.like.count({
        where: { postId: id }
      });

      // Invalidate post cache
      await invalidatePostCache(id);

      // Broadcast like update via WebSocket
      await webSocketService.broadcastLikeUpdate(id, userId, 'liked');

      res.json({ ok: true, isLiked: true, likes: likeCount });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ ok: false, error: 'Failed to like post' });
  }
});

router.post('/:id/repost', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found' });
    }

    // For now, just return success (repost functionality can be enhanced later)
    res.json({ ok: true, message: 'Post reposted successfully' });
  } catch (error) {
    console.error('Repost error:', error);
    res.status(500).json({ ok: false, error: 'Failed to repost' });
  }
});

export default router;


