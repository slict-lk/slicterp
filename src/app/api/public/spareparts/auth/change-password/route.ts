import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyCustomerToken } from '@/lib/spareparts-jwt';


async function getCustomer(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded: any = verifyCustomerToken(token);
        return decoded; // { id, email, tenantId, ... }
    } catch (error) {
        return null;
    }
}

export async function POST(req: NextRequest) {
    const customerDecoded = await getCustomer(req);
    if (!customerDecoded) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Current and New Password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
        }

        // Get current customer record to check password
        const customer = await prisma.shopCustomer.findUnique({
            where: { id: customerDecoded.id }
        });

        if (!customer || !customer.password) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isValid = await bcrypt.compare(currentPassword, customer.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.shopCustomer.update({
            where: { id: customer.id },
            data: { password: hashedPassword }
        });

        return NextResponse.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
