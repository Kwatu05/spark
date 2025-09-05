import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { mediaProcessor } from '../services/mediaProcessor';
import { config } from '../config/environment';

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = ['uploads/images', 'uploads/videos', 'uploads/avatars'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: Function) => {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'avatar') {
      uploadPath += 'avatars/';
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else {
      uploadPath += 'images/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: Function) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const filename = `${name}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
  // Allow images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: fileFilter
});

// Image processing middleware
export const processImage = async (filePath: string, outputDir: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
} = {}) => {
  try {
    const result = await mediaProcessor.processImage(filePath, outputDir, {
      maxWidth: options.width || 1200,
      maxHeight: options.height || 1200,
      quality: options.quality || 80,
      format: options.format || 'jpeg',
      generateThumbnail: true
    });
    return result.processedPath;
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
};

// Avatar processing middleware using enhanced media processor
export const processAvatar = async (filePath: string, outputDir: string) => {
  try {
    const result = await mediaProcessor.processImage(filePath, outputDir, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 90,
      format: 'jpeg',
      generateThumbnail: true
    });
    return result.processedPath;
  } catch (error) {
    console.error('Avatar processing error:', error);
    throw error;
  }
};

// Generate file URL
export const getFileUrl = (filePath: string, baseUrl: string = 'http://localhost:4000') => {
  return `${baseUrl}/${filePath.replace(/\\/g, '/')}`;
};

// Delete file
export const deleteFile = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
};
