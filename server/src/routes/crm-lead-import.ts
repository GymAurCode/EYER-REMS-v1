import express, { Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma/client';
import { requireAuth, AuthenticatedRequest, requirePermission } from '../middleware/rbac';
import { createLeadImportBatch } from '../services/lead-import-service';

const router = (express as any).Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_LEAD_IMPORT_ROWS = 2000;

function ensureUploadDir(): string {
  const dir = path.join(process.cwd(), 'uploads', 'lead-imports');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Upload CSV/Excel and create staging batch
router.post(
  '/leads/import/upload',
  requireAuth,
  requirePermission('crm.leads.create'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const originalName = req.file.originalname;
      const ext = path.extname(originalName).toLowerCase();

      if (ext !== '.csv') {
        return res.status(400).json({ error: 'Only .csv files are supported in this version' });
      }

      const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
      const uploadDir = ensureUploadDir();
      const filePath = path.join(uploadDir, `${Date.now()}-${originalName}`);
      fs.writeFileSync(filePath, req.file.buffer);

      const batch = await createLeadImportBatch({
        userId: req.user!.id,
        fileName: originalName,
        filePath,
        fileHash: hash,
        buffer: req.file.buffer,
        assignmentMode: 'CSV_DEFINED',
        rowLimit: MAX_LEAD_IMPORT_ROWS,
      });

      return res.status(201).json({
        batchId: batch.id,
        rowCount: batch.rowCount,
        status: batch.status,
      });
    } catch (error: any) {
      console.error('Lead import upload error:', error);
      return res.status(500).json({ error: error.message || 'Failed to upload lead import file' });
    }
  }
);

export default router;

