
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPublicApiAuthorized } from '@/lib/public-api-auth';

export const dynamic = 'force-dynamic';

// GET /api/public/export/customer/dashboard
export async function GET(request: NextRequest) {
    // 1. Auth Check (Basic API Key for public routes)
    const authHeader = request.headers.get('authorization');
    if (!isPublicApiAuthorized(authHeader)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');
    const email = searchParams.get('email');

    if (!subdomain || !email) {
        return NextResponse.json({ error: 'Subdomain and Email required' }, { status: 400 });
    }

    try {
        // 2. Resolve Tenant
        const tenant = await prisma.tenant.findFirst({
            where: {
                OR: [
                    { subdomain: subdomain },
                    { domain: subdomain }
                ]
            },
            select: { id: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // 3. Find Customer
        const customer = await prisma.exportCustomer.findFirst({
            where: {
                tenantId: tenant.id,
                email: email
            }
        });

        if (!customer) {
            // Return empty stats for new/unknown users
            return NextResponse.json({
                stats: {
                    activeBids: 0,
                    pendingOrders: 0,
                    watchlist: 0,
                    completed: 0
                },
                recentActivity: []
            });
        }

        // 4. Calculate Stats
        const [activeBids, pendingOrders, watchlist, completed] = await Promise.all([
            prisma.exportBid.count({
                where: {
                    customerId: customer.id,
                    status: 'PENDING'
                }
            }),
            prisma.exportBid.count({
                where: {
                    customerId: customer.id,
                    status: { in: ['APPROVED', 'WON'] }, // Assuming 'WON' means ordered/in-progress
                    // You might refine this based on vehicle status if needed
                }
            }),
            prisma.exportFavorite.count({
                where: {
                    customerId: customer.id
                }
            }),
            prisma.exportBid.count({
                where: {
                    customerId: customer.id,
                    status: { in: ['WON', 'LOST'] } // Replaced FULFILLED with valid Enum values
                }
            })
        ]);

        // 5. Recent Activity (Bids for now)
        const recentBids = await prisma.exportBid.findMany({
            where: {
                customerId: customer.id
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                vehicle: {
                    select: {
                        make: true,
                        model: true,
                        year: true,
                        photos: {
                            take: 1,
                            select: { url: true }
                        }
                    }
                }
            }
        });

        const recentActivity = recentBids.map(bid => {
            const vehicleName = bid.vehicle
                ? `${bid.vehicle.year} ${bid.vehicle.make} ${bid.vehicle.model}`
                : `${bid.requestedMake} ${bid.requestedModel}`;

            return {
                type: 'BID',
                status: bid.status,
                date: bid.createdAt,
                vehicle: vehicleName,
                details: `Bit Amount: ${bid.currency} ${bid.maxBudget}`
            };
        });

        return NextResponse.json({
            stats: {
                activeBids,
                pendingOrders,
                watchlist,
                completed
            },
            recentActivity
        });

    } catch (error) {
        console.error('Customer dashboard error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
