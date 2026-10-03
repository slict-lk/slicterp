import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { subdomain: 'slict' }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Slict tenant not found' }, { status: 404 });
        }

        const config = await prisma.exportStoreConfig.upsert({
            where: { tenantId: tenant.id },
            create: {
                tenantId: tenant.id,
                storeName: 'Slict Motor Corp',
                tagline: 'Premium Japanese Vehicles Exported Worldwide',
                primaryColor: '#c62828', // Red
                secondaryColor: '#1a1a1a',
                heroSlides: [
                    {
                        id: '1',
                        title: 'Find Your Dream Car',
                        subtitle: 'Direct from Japanese Auctions',
                        imageUrl: '/images/hero-1.jpg',
                        link: '/slict/vehicles'
                    },
                    {
                        id: '2',
                        title: 'Reliable Shipping',
                        subtitle: 'We ship to over 50 countries',
                        imageUrl: '/images/hero-2.jpg',
                        link: '/slict/how-to-buy/stock'
                    }
                ],
                contactEmail: 'sales@slict.com',
                contactPhone: '+81 90 1234 5678',
                whatsappNumber: '+81 90 1234 5678',
                address: '1-2-3 Minato Mirai, Yokohama, Japan',
                companyProfile: {
                    title: 'About Slict Motor Corp',
                    content: 'We are a leading exporter of used Japanese vehicles with over 20 years of experience. Our mission is to provide high-quality vehicles at competitive prices.',
                    foundedYear: '2005',
                    employees: '50+'
                },
                bankDetails: {
                    bankName: 'Bank of Tokyo-Mitsubishi UFJ',
                    accountName: 'Slict Motor Corp',
                    accountNumber: '1234567890',
                    swiftCode: 'BOTKJPJT',
                    branch: 'Yokohama Branch'
                },
                faqItems: [
                    {
                        category: 'General',
                        question: 'How do I place an order?',
                        answer: 'Browse our stock, click "Inquire", and our team will guide you through the process.'
                    },
                    {
                        category: 'Shipping',
                        question: 'How long does shipping take?',
                        answer: 'It depends on your destination, usually 3-5 weeks.'
                    }
                ],
                howToBuyStockSteps: [
                    { step: 1, title: 'Search', description: 'Find your vehicle', icon: 'Search' },
                    { step: 2, title: 'Inquire', description: 'Get a quote', icon: 'Mail' },
                    { step: 3, title: 'Payment', description: 'TT Transfer', icon: 'CreditCard' },
                    { step: 4, title: 'Shipping', description: 'We ship it', icon: 'Ship' },
                    { step: 5, title: 'Receive', description: 'Pick up at port', icon: 'Check' }
                ],
                howToBidSteps: [
                    { step: 1, title: 'Register', description: 'Create account', icon: 'User' },
                    { step: 2, title: 'Deposit', description: 'Security deposit', icon: 'DollarSign' },
                    { step: 3, title: 'Bid', description: 'Place bids real-time', icon: 'Gavel' },
                    { step: 4, title: 'Win', description: 'Pay balance', icon: 'Trophy' }
                ]
            },
            update: {
                storeName: 'Slict Motor Corp',
                tagline: 'Premium Japanese Vehicles Exported Worldwide',
                heroSlides: [
                    {
                        id: '1',
                        title: 'Find Your Dream Car',
                        subtitle: 'Direct from Japanese Auctions',
                        imageUrl: '/images/hero-1.jpg',
                        link: '/slict/vehicles'
                    },
                    {
                        id: '2',
                        title: 'Reliable Shipping',
                        subtitle: 'We ship to over 50 countries',
                        imageUrl: '/images/hero-2.jpg',
                        link: '/slict/how-to-buy/stock'
                    }
                ],
                companyProfile: {
                    title: 'About Slict Motor Corp',
                    content: 'We are a leading exporter of used Japanese vehicles with over 20 years of experience. Our mission is to provide high-quality vehicles at competitive prices.',
                    foundedYear: '2005',
                    employees: '50+'
                },
                bankDetails: {
                    bankName: 'Bank of Tokyo-Mitsubishi UFJ',
                    accountName: 'Slict Motor Corp',
                    accountNumber: '1234567890',
                    swiftCode: 'BOTKJPJT',
                    branch: 'Yokohama Branch'
                },
                faqItems: [
                    {
                        category: 'General',
                        question: 'How do I place an order?',
                        answer: 'Browse our stock, click "Inquire", and our team will guide you through the process.'
                    },
                    {
                        category: 'Shipping',
                        question: 'How long does shipping take?',
                        answer: 'It depends on your destination, usually 3-5 weeks.'
                    }
                ],
                howToBuyStockSteps: [
                    { step: 1, title: 'Search', description: 'Find your vehicle', icon: 'Search' },
                    { step: 2, title: 'Inquire', description: 'Get a quote', icon: 'Mail' },
                    { step: 3, title: 'Payment', description: 'TT Transfer', icon: 'CreditCard' },
                    { step: 4, title: 'Shipping', description: 'We ship it', icon: 'Ship' },
                    { step: 5, title: 'Receive', description: 'Pick up at port', icon: 'Check' }
                ],
                howToBidSteps: [
                    { step: 1, title: 'Register', description: 'Create account', icon: 'User' },
                    { step: 2, title: 'Deposit', description: 'Security deposit', icon: 'DollarSign' },
                    { step: 3, title: 'Bid', description: 'Place bids real-time', icon: 'Gavel' },
                    { step: 4, title: 'Win', description: 'Pay balance', icon: 'Trophy' }
                ]
            }
        });

        return NextResponse.json({ success: true, config });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
    }
}
