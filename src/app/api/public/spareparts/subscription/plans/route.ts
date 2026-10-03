import { NextResponse } from 'next/server';

export async function GET() {
    const plans = [
        {
            id: 'standard',
            name: 'Standard',
            price: 0,
            interval: 'month',
            description: 'Essential features for personal use',
            features: ['Basic access', 'Standard support', 'Order tracking'],
            isPopular: false
        },
        {
            id: 'gold',
            name: 'Gold',
            price: 5000,
            interval: 'year',
            description: 'For frequent buyers',
            features: ['3% Discount on all orders', 'Priority support', 'Early access to sales', 'Free shipping on orders > 50k'],
            isPopular: true
        },
        {
            id: 'platinum',
            name: 'Platinum',
            price: 10000,
            interval: 'year',
            description: 'For bulk buyers and businesses',
            features: ['5% Discount on all orders', 'Dedicated account manager', 'Same-day dispatch', 'Unlimited returns'],
            isPopular: false
        }
    ];

    return NextResponse.json(plans);
}
