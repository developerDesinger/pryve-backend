const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");

class MediaLibraryService {
  /**
   * Save uploaded file to local storage
   */
  static async saveFile(file, userId, chatId, messageId) {
    try {
      console.log('=== MediaLibraryService.saveFile START ===');
      console.log('File details:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        hasBuffer: !!file.buffer
      });
      console.log('Parameters:', { userId, chatId, messageId });

      // Determine file type and folder
      const fileType = this.getFileType(file.mimetype);
      const folder = this.getFolderPath(fileType);
      const fileName = this.generateFileName(file.originalname, file.mimetype);
      const filePath = path.join(folder, fileName);
      
      console.log('File processing details:', {
        fileType,
        folder,
        fileName,
        filePath
      });
      
      // Check and create directory with proper error handling
      await this.ensureDirectoryExists(folder);
      
      // Save file to disk
      console.log('Saving file to disk...');
      await fs.writeFile(filePath, file.buffer);
      console.log('File saved successfully to disk');
      
      // Generate file URL for API responses
      const fileUrl = `/uploads/media/${fileType}/${fileName}`;
      console.log('Generated file URL:', fileUrl);
      
      // Save file metadata to database
      console.log('Saving to database...');
      const mediaRecord = await prisma.mediaLibrary.create({
        data: {
          userId,
          chatId,
          messageId,
          fileName,
          originalName: file.originalname,
          filePath,
          fileUrl,
          fileType,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
        },
      });
      console.log('Database record created:', mediaRecord.id);
      
      const result = {
        success: true,
        fileUrl,
        fileName,
        fileSize: file.size,
        mimeType: file.mimetype,
        mediaId: mediaRecord.id,
      };
      console.log('=== MediaLibraryService.saveFile SUCCESS ===', result);
      return result;
    } catch (error) {
      console.error('Error saving file:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        path: error.path,
        stack: error.stack
      });
      throw new AppError(`Failed to save file: ${error.message}`, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get all media files for a user
   */
  static async getUserMedia(userId, query) {
    console.log('=== MediaLibraryService.getUserMedia START ===');
    console.log('UserId:', userId);
    console.log('Query params:', query);
    
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = query.type || 'all'; // 'images', 'audio', 'videos', 'documents', 'all'
    const search = query.search || '';

    console.log('Processed params:', { page, limit, skip, type, search });

    // Build where clause
    let where = { userId };
    
    if (type !== 'all') {
      where.fileType = type;
    }
    
    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ];
    }

    console.log('Where clause:', JSON.stringify(where, null, 2));

    try {
      const totalFiles = await prisma.mediaLibrary.count({ where });
      console.log('Total files count:', totalFiles);
      
      const files = await prisma.mediaLibrary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          chat: {
            select: { id: true, name: true }
          }
        }
      });

      console.log('Files found:', files.length);
      console.log('Files data:', files);

      const result = {
        message: "Media files fetched successfully.",
        success: true,
        data: files,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalFiles / limit),
          totalItems: totalFiles,
          limit,
        },
      };
      
      console.log('=== MediaLibraryService.getUserMedia SUCCESS ===', result);
      return result;
    } catch (error) {
      console.error('Error in getUserMedia:', error);
      throw error;
    }
  }

  /**
   * Get media files for a specific chat
   */
  static async getChatMedia(chatId, userId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = query.type || 'all';

    // Verify chat belongs to user
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new AppError("Chat not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Build where clause
    let where = { chatId, userId };
    
    if (type !== 'all') {
      where.fileType = type;
    }

    const totalFiles = await prisma.mediaLibrary.count({ where });
    
    const files = await prisma.mediaLibrary.findMany({
      where,
      skip,
      take: limit,
      orderBy: { uploadedAt: 'desc' },
    });

    return {
      message: "Chat media files fetched successfully.",
      success: true,
      data: files,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalFiles / limit),
        totalItems: totalFiles,
        limit,
      },
    };
  }

  /**
   * Delete a media file
   */
  static async deleteMedia(mediaId, userId) {
    const media = await prisma.mediaLibrary.findFirst({
      where: { id: mediaId, userId },
    });

    if (!media) {
      throw new AppError("Media file not found.", HttpStatusCodes.NOT_FOUND);
    }

    try {
      // Delete file from disk
      await fs.unlink(media.filePath);
      
      // Delete record from database
      await prisma.mediaLibrary.delete({
        where: { id: mediaId },
      });

      return {
        message: "Media file deleted successfully.",
        success: true,
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new AppError('Failed to delete file', HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get media statistics for a user
   */
  static async getMediaStats(userId) {
    const stats = await prisma.mediaLibrary.groupBy({
      by: ['fileType'],
      where: { userId },
      _count: { fileType: true },
      _sum: { fileSize: true },
    });

    const totalFiles = await prisma.mediaLibrary.count({ where: { userId } });
    const totalSize = await prisma.mediaLibrary.aggregate({
      where: { userId },
      _sum: { fileSize: true },
    });

    return {
      message: "Media statistics fetched successfully.",
      success: true,
      data: {
        totalFiles,
        totalSize: totalSize._sum.fileSize || 0,
        byType: stats.map(stat => ({
          type: stat.fileType,
          count: stat._count.fileType,
          size: stat._sum.fileSize || 0,
        })),
      },
    };
  }

  /**
   * Determine file type from MIME type
   */
  static getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'videos';
    return 'documents';
  }

  /**
   * Get folder path for file type
   */
  static getFolderPath(fileType) {
    return path.join(process.cwd(), 'uploads', 'media', fileType);
  }

  /**
   * Generate unique file name
   */
  static generateFileName(originalName, mimeType) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName) || this.getExtensionFromMimeType(mimeType);
    return `${timestamp}-${randomString}${extension}`;
  }

  /**
   * Get file extension from MIME type
   */
  static getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/m4a': '.m4a',
      'audio/ogg': '.ogg',
      'video/mp4': '.mp4',
      'video/avi': '.avi',
      'video/mov': '.mov',
      'video/webm': '.webm',
    };
    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * Ensure directory exists with proper error handling
   */
  static async ensureDirectoryExists(dirPath) {
    try {
      // Check if directory exists
      await fs.access(dirPath);
      console.log(`Directory exists: ${dirPath}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Directory doesn't exist, create it
        console.log(`Creating directory: ${dirPath}`);
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`Directory created successfully: ${dirPath}`);
      } else {
        console.error(`Error accessing directory ${dirPath}:`, error);
        throw new Error(`Cannot access directory ${dirPath}: ${error.message}`);
      }
    }
  }
}

module.exports = MediaLibraryService;
