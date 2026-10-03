import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
// GET /api/cart - Get cart
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    let cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, salePrice: true },
            },
          },
        },
      },
    });

    // Create cart if doesn't exist
    if (!cart) {
      const tenantId = searchParams.get('tenantId');
      if (!tenantId) {
        return NextResponse.json({ error: 'Tenant ID required for new cart' }, { status: 400 });
      }

      cart = await prisma.cart.create({
        data: {
          tenantId,
          sessionId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, salePrice: true },
              },
            },
          },
        },
      });
    }

    return NextResponse.json(cart);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, productId, quantity, price } = body;

    if (!sessionId || !productId || !quantity) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const cart = await prisma.cart.findUnique({ where: { sessionId } });
    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    if (existingItem) {
      // Update quantity
      const item = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: { product: true },
      });
      return NextResponse.json(item);
    } else {
      // Add new item
      const item = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          price,
          tenantId: cart.tenantId,
        },
        include: { product: true },
      });
      return NextResponse.json(item, { status: 201 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
