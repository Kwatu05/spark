import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { commentLimiter } from '../middleware/rateLimiting';
import { webSocketService } from '../services/websocket';

const router = Router();
const prisma = new PrismaClient();

// Create a new post
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { caption, imageUrl, videoUrl, content, audioUrl, location, activityTags, type } = req.body || {};
    
    if (!caption || !caption.trim()) {
      return res.status(400).json({ ok: false, error: 'Caption is required' });
    }

    // Prepare content array
    const contentArray: string[] = Array.isArray(content)
      ? content
      : (imageUrl ? [imageUrl] : (videoUrl ? [videoUrl] : []));

    // Determine post type
    let resolvedType: 'PHOTO' | 'VIDEO' | 'CAROUSEL' = 'PHOTO';
    if (type === 'video' || (videoUrl && !imageUrl)) resolvedType = 'VIDEO';
    if (contentArray.length > 1) resolvedType = 'CAROUSEL';

    // Create post in database
    const post = await prisma.post.create({
      data: {
        userId,
        caption: caption.trim(),
        type: resolvedType,
        content: contentArray.length > 0 ? JSON.stringify(contentArray) : null,
        location: location || null,
        activityTags: Array.isArray(activityTags) && activityTags.length > 0 ? JSON.stringify(activityTags) : null,
      },
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

    res.json({ 
      ok: true, 
      post: {
        ...post,
        content: post.content ? JSON.parse(post.content) : [],
        activityTags: post.activityTags ? JSON.parse(post.activityTags) : [],
        likes: post._count.likes,
        comments: post._count.comments
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create post' });
  }
});

// Get all posts with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
      posts: posts.map(post => ({
        ...post,
        content: post.content ? JSON.parse(post.content) : [],
        activityTags: post.activityTags ? JSON.parse(post.activityTags) : [],
        likes: post._count.likes,
        comments: post._count.comments
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch posts' });
  }
});

// Get a single post by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
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

    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found' });
    }

    res.json({ 
      ok: true, 
      post: {
        ...post,
        content: post.content ? JSON.parse(post.content) : [],
        activityTags: post.activityTags ? JSON.parse(post.activityTags) : [],
        likes: post._count.likes,
        comments: post._count.comments
      }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch post' });
  }
});

// Update a post (only by owner)
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { caption, location, activityTags } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Check if post exists and user owns it
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existingPost) {
      return res.status(404).json({ ok: false, error: 'Post not found' });
    }

    if (existingPost.userId !== userId) {
      return res.status(403).json({ ok: false, error: 'Not authorized to edit this post' });
    }

    // Update post
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        caption: caption || undefined,
        location: location || undefined,
        activityTags: activityTags ? JSON.stringify(activityTags) : undefined,
      },
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

    res.json({ 
      ok: true, 
      post: {
        ...updatedPost,
        content: updatedPost.content ? JSON.parse(updatedPost.content) : [],
        activityTags: updatedPost.activityTags ? JSON.parse(updatedPost.activityTags) : [],
        likes: updatedPost._count.likes,
        comments: updatedPost._count.comments
      }
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update post' });
  }
});

// Delete a post (only by owner)
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Check if post exists and user owns it
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!existingPost) {
      return res.status(404).json({ ok: false, error: 'Post not found' });
    }

    if (existingPost.userId !== userId) {
      return res.status(403).json({ ok: false, error: 'Not authorized to delete this post' });
    }

    // Delete post (cascade will handle related likes, comments, etc.)
    await prisma.post.delete({
      where: { id }
    });

    res.json({ ok: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete post' });
  }
});

// Get comments for a post
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;

    const comments = await prisma.comment.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            isVerified: true
          }
        }
      }
    });

    res.json({ ok: true, comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch comments' });
  }
});

// Create a comment on a post
router.post('/:id/comments', commentLimiter, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { text } = req.body || {};

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ ok: false, error: 'Comment text is required' });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found' });
    }

            // Create comment
        const comment = await prisma.comment.create({
          data: {
            userId,
            postId: id,
            content: text.trim()
          },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            isVerified: true
          }
                    }
          }
        });

        // Broadcast comment update via WebSocket
        await webSocketService.broadcastCommentUpdate(id, comment.id, 'created', comment);

        res.json({ ok: true, comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create comment' });
  }
});

// Get reposted posts by IDs
router.get('/reposted', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { ids } = req.query;
    
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ ok: false, error: 'Post IDs required' });
    }

    const postIds = ids.split(',').filter(id => id.trim());
    
    if (postIds.length === 0) {
      return res.json({ ok: true, posts: [] });
    }

    const posts = await prisma.post.findMany({
      where: {
        id: { in: postIds }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedPosts = posts.map(post => ({
      id: post.id,
      userId: post.userId,
      user: post.user,
      type: post.type.toLowerCase(),
      content: post.content || [],
      caption: post.caption,
      activityTags: post.activityTags ? JSON.parse(post.activityTags) : [],
      likes: post._count.likes,
      comments: post._count.comments,
      createdAt: post.createdAt,
      location: post.location
    }));

    res.json({ ok: true, posts: formattedPosts });
  } catch (error) {
    console.error('Get reposted posts error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch reposted posts' });
  }
});

export default router;


