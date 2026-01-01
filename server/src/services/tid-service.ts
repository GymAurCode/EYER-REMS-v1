import prisma from '../prisma/client';

export async function generateSequenceNumber(prefix: string): Promise<number> {
  try {
    const sequence = await prisma.sequence.upsert({
      where: { prefix },
      update: { current: { increment: 1 } },
      create: { prefix, current: 1 },
    });
    return sequence.current;
  } catch (error) {
    console.error(`Error generating sequence number for ${prefix}:`, error);
    throw error;
  }
}

/**
 * Generates a unique, immutable Tracking ID (T.ID) using a Sequence table.
 * Format: PREFIX-0001
 * This is atomic and collision-safe.
 * 
 * @param prefix The prefix for the entity (e.g., "EMP", "CLI", "PRO")
 * @param width The width of the numeric part (default 4)
 * @returns The generated T.ID (e.g., "EMP-0001")
 */
export async function generateTrackingId(prefix: string, width: number = 4): Promise<string> {
  const number = await generateSequenceNumber(prefix);
  const numberPart = number.toString().padStart(width, '0');
  return `${prefix}-${numberPart}`;
}
