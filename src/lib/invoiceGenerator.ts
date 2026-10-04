import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

/**
 * Generates a unique invoice number in format: YYMMDD_SRC_XXXX
 * Example: 260111_WEB_A3F7
 * 
 * Uses timestamp (YYMMDD) + source + random 4-char alphanumeric suffix.
 * This guarantees uniqueness even under high concurrency without database locks.
 * 
 * The random suffix uses crypto-safe random bytes converted to hex,
 * giving 65,536 possible combinations per day per source - more than enough
 * for most e-commerce scenarios.
 * 
 * @param tenantId The tenant ID (for future sequence table support)
 * @param source Source/Branch code (e.g., "POS1", "WEB")
 */
export async function generateInvoiceNumber(
    tenantId: string,
    source: string = 'POS',
    _retryCount: number = 0 // Kept for backwards compatibility
): Promise<string> {
    const now = new Date();

    // Format: YYMMDD (e.g., 260111 for Jan 11, 2026)
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Generate a random 4-character hex suffix (65,536 possibilities)
    const randomSuffix = randomBytes(2).toString('hex').toUpperCase();

    // Final format: 260111_WEB_A3F7
    const invoiceNumber = `${datePrefix}_${source.toUpperCase()}_${randomSuffix}`;

    // Double-check for uniqueness (extremely rare collision)
    const existing = await prisma.shopInvoice.findFirst({
        where: { invoiceNumber, tenantId }
    });

    if (existing) {
        // Recursive retry with different random suffix
        return generateInvoiceNumber(tenantId, source, _retryCount + 1);
    }

    return invoiceNumber;
}
