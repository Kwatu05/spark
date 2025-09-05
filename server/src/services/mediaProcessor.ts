import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { logInfo, logError, logWarning } from '../utils/logger';
import { config } from '../config/environment';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

export interface MediaProcessingOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
  generateThumbnail?: boolean;
  thumbnailSize?: number;
}

export interface ProcessedMedia {
  originalPath: string;
  processedPath: string;
  thumbnailPath?: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
    duration?: number; // For videos
  };
}

export class MediaProcessor {
  private static instance: MediaProcessor;
  private processingQueue: Map<string, Promise<ProcessedMedia>> = new Map();

  static getInstance(): MediaProcessor {
    if (!MediaProcessor.instance) {
      MediaProcessor.instance = new MediaProcessor();
    }
    return MediaProcessor.instance;
  }

  /**
   * Process an image file with optimization and thumbnail generation
   */
  async processImage(
    inputPath: string,
    outputDir: string,
    options: MediaProcessingOptions = {}
  ): Promise<ProcessedMedia> {
    const cacheKey = `${inputPath}-${JSON.stringify(options)}`;
    
    // Check if already processing
    if (this.processingQueue.has(cacheKey)) {
      return this.processingQueue.get(cacheKey)!;
    }

    const processingPromise = this._processImage(inputPath, outputDir, options);
    this.processingQueue.set(cacheKey, processingPromise);

    try {
      const result = await processingPromise;
      return result;
    } finally {
      this.processingQueue.delete(cacheKey);
    }
  }

  private async _processImage(
    inputPath: string,
    outputDir: string,
    options: MediaProcessingOptions
  ): Promise<ProcessedMedia> {
    try {
      logInfo('Starting image processing', { inputPath, options });

      // Ensure output directory exists
      await fs.promises.mkdir(outputDir, { recursive: true });

      // Get image metadata
      const metadata = await sharp(inputPath).metadata();
      const originalSize = (await fs.promises.stat(inputPath)).size;

      // Determine output format
      const outputFormat = options.format || 'jpeg';
      const outputFilename = `${path.basename(inputPath, path.extname(inputPath))}_processed.${outputFormat}`;
      const outputPath = path.join(outputDir, outputFilename);

      // Process image
      let sharpInstance = sharp(inputPath);

      // Resize if needed
      if (options.maxWidth || options.maxHeight) {
        sharpInstance = sharpInstance.resize(options.maxWidth, options.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Apply format-specific optimizations
      switch (outputFormat) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality: options.quality || config.fileUpload.imageQuality,
            progressive: true,
            mozjpeg: true
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            quality: options.quality || config.fileUpload.imageQuality,
            progressive: true,
            compressionLevel: 9
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({
            quality: options.quality || config.fileUpload.imageQuality,
            effort: 6
          });
          break;
      }

      // Save processed image
      await sharpInstance.toFile(outputPath);

      // Generate thumbnail if requested
      let thumbnailPath: string | undefined;
      if (options.generateThumbnail) {
        thumbnailPath = await this.generateThumbnail(inputPath, outputDir, options.thumbnailSize);
      }

      // Get final metadata
      const finalMetadata = await sharp(outputPath).metadata();
      const finalSize = (await fs.promises.stat(outputPath)).size;

      const result: ProcessedMedia = {
        originalPath: inputPath,
        processedPath: outputPath,
        thumbnailPath,
        metadata: {
          width: finalMetadata.width || 0,
          height: finalMetadata.height || 0,
          size: finalSize,
          format: outputFormat
        }
      };

      logInfo('Image processing completed', {
        originalSize,
        finalSize,
        compressionRatio: ((originalSize - finalSize) / originalSize * 100).toFixed(2) + '%'
      });

      return result;
    } catch (error) {
      logError('Image processing failed', error as Error, { inputPath, options });
      throw error;
    }
  }

  /**
   * Generate a thumbnail for an image
   */
  async generateThumbnail(
    inputPath: string,
    outputDir: string,
    size: number = config.fileUpload.thumbnailSize
  ): Promise<string> {
    try {
      const thumbnailFilename = `${path.basename(inputPath, path.extname(inputPath))}_thumb.jpg`;
      const thumbnailPath = path.join(outputDir, thumbnailFilename);

      await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 85,
          progressive: true
        })
        .toFile(thumbnailPath);

      logInfo('Thumbnail generated', { inputPath, thumbnailPath, size });
      return thumbnailPath;
    } catch (error) {
      logError('Thumbnail generation failed', error as Error, { inputPath, size });
      throw error;
    }
  }

  /**
   * Process a video file with optimization and thumbnail generation
   */
  async processVideo(
    inputPath: string,
    outputDir: string,
    options: MediaProcessingOptions = {}
  ): Promise<ProcessedMedia> {
    const cacheKey = `${inputPath}-${JSON.stringify(options)}`;
    
    // Check if already processing
    if (this.processingQueue.has(cacheKey)) {
      return this.processingQueue.get(cacheKey)!;
    }

    const processingPromise = this._processVideo(inputPath, outputDir, options);
    this.processingQueue.set(cacheKey, processingPromise);

    try {
      const result = await processingPromise;
      return result;
    } finally {
      this.processingQueue.delete(cacheKey);
    }
  }

  private async _processVideo(
    inputPath: string,
    outputDir: string,
    options: MediaProcessingOptions
  ): Promise<ProcessedMedia> {
    try {
      logInfo('Starting video processing', { inputPath, options });

      // Ensure output directory exists
      await fs.promises.mkdir(outputDir, { recursive: true });

      const outputFilename = `${path.basename(inputPath, path.extname(inputPath))}_processed.mp4`;
      const outputPath = path.join(outputDir, outputFilename);

      // Get video metadata
      const metadata = await this.getVideoMetadata(inputPath);
      const originalSize = (await fs.promises.stat(inputPath)).size;

      // Process video with FFmpeg
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg(inputPath)
          .output(outputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .format('mp4')
          .videoBitrate('1000k')
          .audioBitrate('128k')
          .size(`${options.maxWidth || 1280}x${options.maxHeight || 720}`)
          .fps(30)
          .on('start', (commandLine) => {
            logInfo('FFmpeg processing started', { commandLine });
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              logInfo('Video processing progress', { 
                percent: Math.round(progress.percent),
                time: progress.timemark 
              });
            }
          })
          .on('end', () => {
            logInfo('Video processing completed');
            resolve();
          })
          .on('error', (error) => {
            logError('Video processing failed', error);
            reject(error);
          });

        command.run();
      });

      // Generate video thumbnail
      const thumbnailPath = await this.generateVideoThumbnail(inputPath, outputDir);

      // Get final metadata
      const finalSize = (await fs.promises.stat(outputPath)).size;

      const result: ProcessedMedia = {
        originalPath: inputPath,
        processedPath: outputPath,
        thumbnailPath,
        metadata: {
          width: options.maxWidth || 1280,
          height: options.maxHeight || 720,
          size: finalSize,
          format: 'mp4',
          duration: metadata.duration
        }
      };

      logInfo('Video processing completed', {
        originalSize,
        finalSize,
        compressionRatio: ((originalSize - finalSize) / originalSize * 100).toFixed(2) + '%'
      });

      return result;
    } catch (error) {
      logError('Video processing failed', error as Error, { inputPath, options });
      throw error;
    }
  }

  /**
   * Generate a thumbnail for a video
   */
  async generateVideoThumbnail(
    inputPath: string,
    outputDir: string,
    timeOffset: string = '00:00:01'
  ): Promise<string> {
    try {
      const thumbnailFilename = `${path.basename(inputPath, path.extname(inputPath))}_thumb.jpg`;
      const thumbnailPath = path.join(outputDir, thumbnailFilename);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps: [timeOffset],
            filename: thumbnailFilename,
            folder: outputDir,
            size: `${config.fileUpload.thumbnailSize}x${config.fileUpload.thumbnailSize}`
          })
          .on('end', () => {
            logInfo('Video thumbnail generated', { inputPath, thumbnailPath });
            resolve();
          })
          .on('error', (error) => {
            logError('Video thumbnail generation failed', error);
            reject(error);
          });
      });

      return thumbnailPath;
    } catch (error) {
      logError('Video thumbnail generation failed', error as Error, { inputPath, timeOffset });
      throw error;
    }
  }

  /**
   * Get video metadata using FFprobe
   */
  private async getVideoMetadata(inputPath: string): Promise<{ width: number; height: number; duration: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (error, metadata) => {
        if (error) {
          reject(error);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          duration: metadata.format.duration || 0
        });
      });
    });
  }

  /**
   * Optimize an image for web delivery
   */
  async optimizeForWeb(
    inputPath: string,
    outputDir: string,
    maxWidth: number = 1920,
    maxHeight: number = 1080
  ): Promise<ProcessedMedia> {
    return this.processImage(inputPath, outputDir, {
      maxWidth,
      maxHeight,
      quality: 85,
      format: 'webp',
      generateThumbnail: true
    });
  }

  /**
   * Create multiple sizes of an image for responsive design
   */
  async createResponsiveImages(
    inputPath: string,
    outputDir: string,
    sizes: number[] = [320, 640, 1024, 1920]
  ): Promise<ProcessedMedia[]> {
    const results: ProcessedMedia[] = [];

    for (const size of sizes) {
      const result = await this.processImage(inputPath, outputDir, {
        maxWidth: size,
        quality: 85,
        format: 'webp'
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Clean up temporary files
   */
  async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          logInfo('Cleaned up temporary file', { filePath });
        }
      } catch (error) {
        logWarning('Failed to cleanup file', { filePath, error: (error as Error).message });
      }
    }
  }

  /**
   * Get processing queue status
   */
  getQueueStatus(): { active: number; queued: string[] } {
    return {
      active: this.processingQueue.size,
      queued: Array.from(this.processingQueue.keys())
    };
  }
}

// Export singleton instance
export const mediaProcessor = MediaProcessor.getInstance();
