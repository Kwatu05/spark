import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { mediaProcessor } from '../services/mediaProcessor';
import { logUserActionEvent } from '../middleware/observability';
import { logInfo, logError } from '../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for media uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!') as any, false);
    }
  }
});

// Process uploaded media with advanced options
router.post('/process', requireAuth, upload.single('media'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!(req as any).file) {
      return res.status(400).json({ ok: false, error: 'No media file provided' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const { 
      quality = 85, 
      maxWidth, 
      maxHeight, 
      format = 'auto',
      generateThumbnail = true,
      createResponsive = false 
    } = req.body;

    const originalPath = (req as any).file.path;
    const isVideo = (req as any).file.mimetype.startsWith('video/');
    const outputDir = `uploads/processed/${userId}`;

    logUserActionEvent('media_process', req, {
      fileType: isVideo ? 'video' : 'image',
      options: { quality, maxWidth, maxHeight, format, generateThumbnail, createResponsive }
    });

    let result;

    if (isVideo) {
      // Process video
      result = await mediaProcessor.processVideo(originalPath, outputDir, {
        quality: parseInt(quality),
        maxWidth: maxWidth ? parseInt(maxWidth) : undefined,
        maxHeight: maxHeight ? parseInt(maxHeight) : undefined,
        generateThumbnail: generateThumbnail === 'true'
      });
    } else {
      // Process image
      const formatOption = format === 'auto' ? undefined : format as 'jpeg' | 'png' | 'webp';
      
      if (createResponsive === 'true') {
        // Create responsive images
        const results = await mediaProcessor.createResponsiveImages(originalPath, outputDir);
        result = results[0]; // Return the largest size as main result
      } else {
        result = await mediaProcessor.processImage(originalPath, outputDir, {
          quality: parseInt(quality),
          maxWidth: maxWidth ? parseInt(maxWidth) : undefined,
          maxHeight: maxHeight ? parseInt(maxHeight) : undefined,
          format: formatOption,
          generateThumbnail: generateThumbnail === 'true'
        });
      }
    }

    // Clean up temporary file
    await fs.promises.unlink(originalPath);

    res.json({
      ok: true,
      processed: {
        url: `/uploads/processed/${userId}/${path.basename(result.processedPath)}`,
        thumbnailUrl: result.thumbnailPath ? `/uploads/processed/${userId}/${path.basename(result.thumbnailPath)}` : null,
        metadata: result.metadata
      }
    });
  } catch (error) {
    logError('Media processing failed', error as Error, {
      userId: req.user?.userId,
      file: (req as any).file?.originalname
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to process media'
    });
  }
});

// Get processing queue status
router.get('/queue/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const status = mediaProcessor.getQueueStatus();
    
    res.json({
      ok: true,
      queue: status
    });
  } catch (error) {
    logError('Failed to get queue status', error as Error);
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get queue status'
    });
  }
});

// Optimize existing media
router.post('/optimize/:mediaId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { mediaId } = req.params;
    const { 
      quality = 85, 
      maxWidth, 
      maxHeight, 
      format = 'auto' 
    } = req.body;

    // In a real implementation, you would:
    // 1. Look up the media file in the database
    // 2. Get the file path
    // 3. Process it with the new settings
    // 4. Update the database with new file info

    res.json({
      ok: true,
      message: 'Media optimization queued',
      mediaId,
      options: { quality, maxWidth, maxHeight, format }
    });
  } catch (error) {
    logError('Media optimization failed', error as Error, {
      userId: req.user?.userId,
      mediaId: req.params.mediaId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to optimize media'
    });
  }
});

// Get media processing statistics
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // In a real implementation, you would track processing statistics
    const stats = {
      totalProcessed: 0,
      totalSizeSaved: 0,
      averageCompressionRatio: 0,
      processingTime: {
        average: 0,
        fastest: 0,
        slowest: 0
      }
    };

    res.json({
      ok: true,
      stats
    });
  } catch (error) {
    logError('Failed to get media stats', error as Error);
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get media statistics'
    });
  }
});

// Clean up old processed files
router.post('/cleanup', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { olderThanDays = 30 } = req.body;

    // In a real implementation, you would:
    // 1. Find files older than the specified days
    // 2. Delete them from storage
    // 3. Update database records

    logUserActionEvent('media_cleanup', req, { olderThanDays });

    res.json({
      ok: true,
      message: 'Cleanup completed',
      olderThanDays
    });
  } catch (error) {
    logError('Media cleanup failed', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to cleanup media files'
    });
  }
});

export default router;
