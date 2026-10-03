import { prisma } from '@/lib/prisma';

const db = prisma as any;

export async function queueProjectNotification(input: {
  tenantId: string;
  recipientId: string;
  eventType: string;
  title: string;
  message: string;
  link?: string;
  payload?: Record<string, unknown>;
}) {
  return db.projectNotificationOutbox.create({ data: input });
}

export async function queueManyProjectNotifications(inputs: Array<Parameters<typeof queueProjectNotification>[0]>) {
  if (!inputs.length) return;
  await db.projectNotificationOutbox.createMany({ data: inputs, skipDuplicates: true });
}

export async function processProjectNotificationOutbox(limit = 50) {
  const pending = await db.projectNotificationOutbox.findMany({
    where: { status: 'PENDING', availableAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  for (const item of pending) {
    try {
      await db.$transaction([
        db.notification.create({
          data: { userId: item.recipientId, title: item.title, message: item.message, type: item.eventType, link: item.link },
        }),
        db.projectNotificationOutbox.update({
          where: { id: item.id },
          data: { status: 'PROCESSED', processedAt: new Date(), attempts: { increment: 1 }, lastError: null },
        }),
      ]);
    } catch (error: any) {
      await db.projectNotificationOutbox.update({
        where: { id: item.id },
        data: {
          attempts: { increment: 1 },
          lastError: String(error?.message || error),
          availableAt: new Date(Date.now() + 60_000),
        },
      });
    }
  }
  return { processed: pending.length };
}

export function extractMentionEmails(body: string) {
  return [...new Set(body.match(/@[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g)?.map((value) => value.slice(1).toLowerCase()) ?? [])];
}
