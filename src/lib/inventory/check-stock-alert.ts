import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function checkAndAlertLowStock(productId: string, tenantId: string, type: 'product' | 'sparepart' = 'product') {
  const item = type === 'sparepart'
    ? await (prisma as any).sparePart.findUnique({ where: { id: productId }, select: { name: true, stockQty: true, minStockQty: true } })
    : await prisma.product.findUnique({ where: { id: productId }, select: { name: true, stockQty: true, minStockQty: true } });

  if (!item) return;
  if (Number(item.stockQty) > Number(item.minStockQty)) return;

  const admin = await prisma.user.findFirst({
     where: { tenantId, role: 'ADMIN' },
    select: { email: true },
  });
  if (!admin?.email) return;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: true,
    auth: { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_PASSWORD },
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: admin.email,
      subject: `Low Stock Alert - ${item.name}`,
      text: `${item.name} has dropped to ${item.stockQty} units (minimum: ${item.minStockQty}). Please reorder soon.`,
    });
    console.log(`Low stock alert sent for ${item.name}`);
  } catch (err: any) {
    console.error('Failed to send low stock email:', err.message);
  }
}
