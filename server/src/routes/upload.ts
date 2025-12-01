import express from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Upload image endpoint (accepts base64 or file)
router.post('/image', authenticate, async (req: AuthRequest, res) => {
  try {
    const { image, filename } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required',
      });
    }

    // Handle base64 image
    let imageBuffer: Buffer;
    let fileExtension = 'jpg';
    let fileName = filename || `property-${Date.now()}.jpg`;

    if (image.startsWith('data:image/')) {
      // Base64 image with data URL
      const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image format',
        });
      }

      fileExtension = matches[1] || 'jpg';
      const base64Data = matches[2];
      imageBuffer = Buffer.from(base64Data, 'base64');
      fileName = filename || `property-${Date.now()}.${fileExtension}`;
    } else if (image.startsWith('/9j/') || image.startsWith('iVBORw0KGgo')) {
      // Raw base64 without data URL prefix
      imageBuffer = Buffer.from(image, 'base64');
      fileName = filename || `property-${Date.now()}.jpg`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Please provide base64 encoded image.',
      });
    }

    // Validate file size (max 5MB)
    if (imageBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Image size exceeds 5MB limit',
      });
    }

    // Save file
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, imageBuffer);

    // Return URL (relative to public folder)
    const imageUrl = `/uploads/${fileName}`;

    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: fileName,
      },
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/file', authenticate, async (req: AuthRequest, res) => {
  try {
    const { file, filename } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'File data is required',
      });
    }

    const dataUrlMatch = file.match(/^data:(.+);base64,(.+)$/);
    if (!dataUrlMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file format. Expected base64 data URL.',
      });
    }

    const mimeType = dataUrlMatch[1];
    const base64Data = dataUrlMatch[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds 10MB limit',
      });
    }

    const extension = mimeType.split('/')[1] || 'bin';
    const safeFilename = filename || `attachment-${Date.now()}.${extension}`;
    const filePath = path.join(uploadsDir, safeFilename);

    fs.writeFileSync(filePath, buffer);

    res.json({
      success: true,
      data: {
        url: `/uploads/${safeFilename}`,
        filename: safeFilename,
        mimeType,
        size: buffer.length,
      },
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
    });
  }
});

export default router;

