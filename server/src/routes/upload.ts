import { Router } from 'express';
import { upload, processImage, processAvatar, getFileUrl, deleteFile } from '../middleware/upload';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

// Extend AuthenticatedRequest to include multer file properties
interface UploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

const router = Router();

// Upload single image
router.post('/image', requireAuth, upload.single('image'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!(req as any).file) {
      return res.status(400).json({ ok: false, error: 'No image file provided' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const originalPath = (req as any).file.path;
    
    // Process image for optimization
    const processedPath = await processImage(originalPath, 'uploads/images', {
      width: 1200,
      height: 1200,
      quality: 80
    });

    // Delete original file
    deleteFile(originalPath);

    const fileUrl = getFileUrl(processedPath);

    res.json({
      ok: true,
      file: {
        filename: path.basename(processedPath),
        originalName: (req as any).file.originalname,
        size: (req as any).file.size,
        mimetype: (req as any).file.mimetype,
        url: fileUrl,
        path: processedPath
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ ok: false, error: 'Failed to upload image' });
  }
});

// Upload multiple images
router.post('/images', requireAuth, upload.array('images', 10), async (req: AuthenticatedRequest, res) => {
  try {
    if (!(req as any).files || !Array.isArray((req as any).files) || (req as any).files.length === 0) {
      return res.status(400).json({ ok: false, error: 'No image files provided' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const processedFiles = [];

    for (const file of (req as any).files) {
      const originalPath = file.path;
      const processedPath = originalPath.replace(/(\.[^.]+)$/, '_processed$1');
      
      // Process image for optimization
      await processImage(originalPath, processedPath, {
        width: 1200,
        height: 1200,
        quality: 80
      });

      // Delete original file
      deleteFile(originalPath);

      const fileUrl = getFileUrl(processedPath);

      processedFiles.push({
        filename: path.basename(processedPath),
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: fileUrl,
        path: processedPath
      });
    }

    res.json({
      ok: true,
      files: processedFiles
    });
  } catch (error) {
    console.error('Images upload error:', error);
    res.status(500).json({ ok: false, error: 'Failed to upload images' });
  }
});

// Upload video
router.post('/video', requireAuth, upload.single('video'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!(req as any).file) {
      return res.status(400).json({ ok: false, error: 'No video file provided' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const fileUrl = getFileUrl((req as any).file.path);

    res.json({
      ok: true,
      file: {
        filename: (req as any).file.filename,
        originalName: (req as any).file.originalname,
        size: (req as any).file.size,
        mimetype: (req as any).file.mimetype,
        url: fileUrl,
        path: (req as any).file.path
      }
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ ok: false, error: 'Failed to upload video' });
  }
});

// Upload avatar
router.post('/avatar', requireAuth, upload.single('avatar'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!(req as any).file) {
      return res.status(400).json({ ok: false, error: 'No avatar file provided' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const originalPath = (req as any).file.path;
    
    // Process avatar for optimization
    const processedPath = await processAvatar(originalPath, 'uploads/avatars');

    // Delete original file
    deleteFile(originalPath);

    const fileUrl = getFileUrl(processedPath);

    res.json({
      ok: true,
      file: {
        filename: path.basename(processedPath),
        originalName: (req as any).file.originalname,
        size: (req as any).file.size,
        mimetype: (req as any).file.mimetype,
        url: fileUrl,
        path: processedPath
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ ok: false, error: 'Failed to upload avatar' });
  }
});

// Delete file
router.delete('/:filename', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Find file in uploads directory
    const uploadDirs = ['uploads/images', 'uploads/videos', 'uploads/avatars'];
    let filePath = '';

    for (const dir of uploadDirs) {
      const fullPath = path.join(dir, filename);
      if (fs.existsSync(fullPath)) {
        filePath = fullPath;
        break;
      }
    }

    if (!filePath) {
      return res.status(404).json({ ok: false, error: 'File not found' });
    }

    const deleted = deleteFile(filePath);

    if (deleted) {
      res.json({ ok: true, message: 'File deleted successfully' });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to delete file' });
    }
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete file' });
  }
});

export default router;
