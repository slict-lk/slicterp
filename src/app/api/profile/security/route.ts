import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { hash, compare } from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return new NextResponse('Current and new passwords are required', { status: 400 });
        }

        if (newPassword.length < 8) {
            return new NextResponse('Password must be at least 8 characters', { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user || !user.password) {
            return new NextResponse('User not found', { status: 404 });
        }

        // Verify current password
        const isValid = await compare(currentPassword, user.password);

        if (!isValid) {
            return new NextResponse('Incorrect current password', { status: 400 });
        }

        // Hash new password
        const hashedPassword = await hash(newPassword, 10);

        // Update user password
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
            },
        });

        return NextResponse.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('[PROFILE_SECURITY_POST]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}
