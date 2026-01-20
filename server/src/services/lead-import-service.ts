import prisma from '../prisma/client';
import { Readable } from 'stream';
import { parse as csvParse } from 'csv-parse';
import { generateSystemId, validateManualUniqueId, validateTID } from './id-generation-service';
import { z } from 'zod';

export type LeadImportAssignmentMode = 'CSV_DEFINED' | 'AUTO_ASSIGN' | 'UNASSIGNED';

export interface LeadImportUploadContext {
  userId: string;
  fileName: string;
  filePath: string;
  fileHash: string;
  buffer: Buffer;
  assignmentMode: LeadImportAssignmentMode;
  rowLimit: number;
}

export const LEAD_IMPORT_REQUIRED_HEADERS = [
  'Full Name',
  'Phone',
  'Email',
  'CNIC',
  'Lead Source',
  'Source Details',
  'Dealer TID',
  'Dealer Email',
  'Notes',
] as const;

type CsvRow = Record<string, string>;

const leadImportRowSchema = z.object({
  'Full Name': z.string().optional().transform(v => v?.trim() || ''),
  'Phone': z.string().optional().transform(v => v?.trim() || ''),
  'Email': z.string().optional().transform(v => v?.trim() || ''),
  'CNIC': z.string().optional().transform(v => v?.trim() || ''),
  'Lead Source': z.string().optional().transform(v => v?.trim() || ''),
  'Source Details': z.string().optional().transform(v => v?.trim() || ''),
  'Dealer TID': z.string().optional().transform(v => v?.trim() || ''),
  'Dealer Email': z.string().optional().transform(v => v?.trim() || ''),
  'Notes': z.string().optional().transform(v => v?.trim() || ''),
});

export async function parseLeadImportCsv(buffer: Buffer, rowLimit: number): Promise<{ header: string[]; rows: CsvRow[] }> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    let header: string[] | null = null;

    const parser = csvParse({
      bom: true,
      columns: true,
      trim: true,
      skip_empty_lines: true,
    });

    parser.on('headers', (hdrs: string[]) => {
      header = hdrs;
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        rows.push(record);
        if (rows.length > rowLimit) {
          parser.destroy(new Error(`Row limit exceeded (${rowLimit}). Please split the file into smaller batches.`));
          return;
        }
      }
    });

    parser.on('error', (err: Error) => {
      reject(err);
    });

    parser.on('end', () => {
      if (!header) {
        return reject(new Error('Missing header row in CSV file.'));
      }
      resolve({ header, rows });
    });

    Readable.from(buffer).pipe(parser);
  });
}

export async function createLeadImportBatch(ctx: LeadImportUploadContext) {
  const { buffer, rowLimit } = ctx;

  const { header, rows } = await parseLeadImportCsv(buffer, rowLimit);

  // Validate required headers strictly
  const missingHeaders = LEAD_IMPORT_REQUIRED_HEADERS.filter(h => !header.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Invalid CSV headers. Missing: ${missingHeaders.join(', ')}`);
  }

  // Create batch
  const batch = await prisma.leadImportBatch.create({
    data: {
      fileName: ctx.fileName,
      fileHash: ctx.fileHash,
      filePath: ctx.filePath,
      rowCount: rows.length,
      status: 'uploaded',
      createdByUserId: ctx.userId,
    },
  });

  // Insert raw rows
  const rowData = rows.map((raw, index) => {
    const parsed = leadImportRowSchema.parse(raw);
    return {
      batchId: batch.id,
      rowNumber: index + 2, // account for header row
      fullName: parsed['Full Name'] || null,
      phone: parsed['Phone'] || null,
      email: parsed['Email'] || null,
      cnic: parsed['CNIC'] || null,
      leadSource: parsed['Lead Source'] || null,
      sourceDetails: parsed['Source Details'] || null,
      dealerTid: parsed['Dealer TID'] || null,
      dealerEmail: parsed['Dealer Email'] || null,
      notes: parsed['Notes'] || null,
      status: 'PENDING',
      duplicateOfLeadId: null,
      duplicateOfClientId: null,
      resolvedDealerId: null,
      assignmentMode: null,
      createdLeadId: null,
    };
  });

  // Bulk insert in chunks
  const chunkSize = 500;
  for (let i = 0; i < rowData.length; i += chunkSize) {
    const chunk = rowData.slice(i, i + chunkSize);
    await prisma.leadImportRow.createMany({ data: chunk });
  }

  return batch;
}

