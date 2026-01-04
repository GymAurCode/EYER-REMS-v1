/**
 * Secure File Serving Route
 * Serves files from outside web root with authentication
 * Prevents direct access to uploaded files
 */

import express, { Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getSecureUploadDir } from '../utils/file-security';
import logger from '../utils/logger';

const router = (express as any).Router();

/**
 * Serve secure file with authentication
 * GET /api/secure-files/:entityType/:entityId/:filename
 * 
 * This is the centralized file serving endpoint for all secure files.
 * Files are stored outside web root in: {UPLOAD_DIR}/{entityType}/{entityId}/{filename}
 */
router.get('/:entityType/:entityId/:filename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { entityType, entityId, filename } = req.params;

    // Validate parameters
    if (!entityType || !entityId || !filename) {
      return res.status(400).json({ error: 'Invalid file path parameters' });
    }

    // Sanitize filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      logger.warn(`Path traversal attempt detected: ${filename}`);
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Get secure upload directory
    const uploadDir = await getSecureUploadDir();
    const filePath = path.join(uploadDir, entityType, entityId, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      logger.warn(`File not found: ${filePath} (entityType: ${entityType}, entityId: ${entityId}, filename: ${filename})`);
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Determine content type
    const contentType = getContentType(filename);
    
    // Set appropriate headers
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    // Add CORS headers if needed
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Stream file
    const fileStream = await fs.readFile(filePath);
    res.send(fileStream);
  } catch (error) {
    logger.error('Secure file serving error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

/**
 * Get content type from filename
 * Returns appropriate MIME type for proper browser handling
 */
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    // Archives
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
  };

  return contentTypes[ext] || 'application/octet-stream';
}

export default router;

