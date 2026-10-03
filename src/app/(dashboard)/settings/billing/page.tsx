'use client';

import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    CreditCard, Check, ArrowRight, Shield, Zap, Users, HeadphonesIcon,
    Crown, Sparkles, Building2, Clock, ArrowLeft, Star, Infinity,
    AlertTriangle
} from 'lucide-react';

const PLANS = [
    {
        id: 'starter',
        name: 'Starter',
        price: 29,
        period: '/month',
        description: 'Perfect for small teams getting started',
        icon: Zap,
        color: 'blue',
        features: [
            'Up to 5 users',
            '3 modules included',
            '10 GB storage',
            'Email support',
            'Basic reporting',
            'Standard API access',
        ],
        cta: 'Get Started',
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 79,
        period: '/month',
        description: 'Best for growing businesses',
        icon: Crown,
        color: 'purple',
        popular: true,
        features: [
            'Up to 25 users',
            'All modules included',
            '100 GB storage',
            'Priority email & chat support',
            'Advanced analytics & reporting',
            'Full API access',
            'Custom branding',
            'AI-powered insights',
        ],
        cta: 'Upgrade to Pro',
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,
        period: '',
        description: 'For large organizations with custom needs',
        icon: Building2,
        color: 'emerald',
        features: [
            'Unlimited users',
            'All modules + custom modules',
            'Unlimited storage',
            '24/7 dedicated support',
            'Custom integrations',
            'SLA guarantees',
            'On-premise deployment option',
            'Dedicated account manager',
            'Training & onboarding',
        ],
        cta: 'Contact Sales',
    },
];

export default function BillingPage() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const [selectedPlan, setSelectedPlan] = useState(searchParams.get('plan') || 'professional');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

    const currentPlan = session?.user?.plan || 'trial';
    const trialEnd = session?.user?.trialEnd ? new Date(session.user.trialEnd) : null;
    const isTrialExpired = trialEnd ? trialEnd < new Date() : false;
    const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

    return (
        <div className="p-6 space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link href="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
                    </div>
                    <p className="text-gray-600 ml-8">Manage your plan and payment details</p>
                </div>
            </div>

            {/* Current Plan Status */}
            <Card className={`border-2 ${isTrialExpired ? 'border-red-200 bg-red-50' : currentPlan === 'trial' ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${isTrialExpired ? 'bg-red-100' : currentPlan === 'trial' ? 'bg-amber-100' : 'bg-green-100'}`}>
                                {isTrialExpired ? (
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                ) : currentPlan === 'trial' ? (
                                    <Clock className="w-6 h-6 text-amber-600" />
                                ) : (
                                    <Check className="w-6 h-6 text-green-600" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">
                                    {isTrialExpired ? 'Trial Expired' : currentPlan === 'trial' ? 'Free Trial' : `${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan`}
                                </h3>
                                <p className={`text-sm ${isTrialExpired ? 'text-red-600' : currentPlan === 'trial' ? 'text-amber-700' : 'text-green-700'}`}>
                                    {isTrialExpired
                                        ? 'Your trial has ended. Subscribe to continue using SLICT ERP.'
                                        : currentPlan === 'trial' && trialEnd
                                            ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining — trial ends ${trialEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                                            : 'Your subscription is active'}
                                </p>
                            </div>
                        </div>
                        {currentPlan === 'trial' && !isTrialExpired && (
                            <Badge className="bg-amber-200 text-amber-800 hover:bg-amber-200">
                                <Clock className="w-3 h-3 mr-1" /> {daysLeft} days left
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Billing Toggle */}
            <div className="flex justify-center">
                <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('annual')}
                        className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${billingCycle === 'annual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Annual <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px] px-1.5">Save 20%</Badge>
                    </button>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-6">
                {PLANS.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    const isCurrent = currentPlan === plan.id;
                    const price = plan.price ? (billingCycle === 'annual' ? Math.round(plan.price * 0.8) : plan.price) : null;

                    return (
                        <Card
                            key={plan.id}
                            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:ring-1 hover:ring-gray-200'
                                } ${plan.popular ? 'border-purple-200' : ''}`}
                            onClick={() => setSelectedPlan(plan.id)}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg">
                                        <Star className="w-3 h-3 mr-1" /> Most Popular
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="text-center pt-8 pb-4">
                                <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${plan.color === 'blue' ? 'bg-blue-100' : plan.color === 'purple' ? 'bg-purple-100' : 'bg-emerald-100'
                                    }`}>
                                    <plan.icon className={`w-6 h-6 ${plan.color === 'blue' ? 'text-blue-600' : plan.color === 'purple' ? 'text-purple-600' : 'text-emerald-600'
                                        }`} />
                                </div>
                                <CardTitle className="text-xl">{plan.name}</CardTitle>
                                <CardDescription className="text-sm">{plan.description}</CardDescription>
                                <div className="mt-4">
                                    {price !== null ? (
                                        <div className="flex items-baseline justify-center gap-1">
                                            <span className="text-4xl font-bold text-gray-900">${price}</span>
                                            <span className="text-gray-500">/month</span>
                                        </div>
                                    ) : (
                                        <div className="text-2xl font-bold text-gray-900">Custom Pricing</div>
                                    )}
                                    {billingCycle === 'annual' && price && (
                                        <p className="text-xs text-green-600 mt-1">Billed ${price * 12}/year</p>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4 pb-8">
                                <ul className="space-y-2.5">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                                            <Check className={`w-4 h-4 flex-shrink-0 ${plan.color === 'blue' ? 'text-blue-500' : plan.color === 'purple' ? 'text-purple-500' : 'text-emerald-500'
                                                }`} />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    className={`w-full h-11 font-semibold ${isCurrent
                                            ? 'bg-gray-100 text-gray-500 cursor-default hover:bg-gray-100'
                                            : isSelected
                                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                                                : 'bg-gray-900 hover:bg-gray-800 text-white'
                                        }`}
                                    disabled={isCurrent}
                                >
                                    {isCurrent ? (
                                        <><Check className="w-4 h-4 mr-2" /> Current Plan</>
                                    ) : plan.id === 'enterprise' ? (
                                        <><HeadphonesIcon className="w-4 h-4 mr-2" /> {plan.cta}</>
                                    ) : (
                                        <><CreditCard className="w-4 h-4 mr-2" /> {plan.cta}</>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Features Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">What's Included</CardTitle>
                    <CardDescription>Compare features across all plans</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-medium text-gray-500">Feature</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Starter</th>
                                    <th className="text-center py-3 px-4 font-medium text-purple-600">Professional</th>
                                    <th className="text-center py-3 px-4 font-medium text-gray-500">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {[
                                    { feature: 'Users', starter: '5', pro: '25', enterprise: 'Unlimited' },
                                    { feature: 'Modules', starter: '3', pro: 'All', enterprise: 'All + Custom' },
                                    { feature: 'Storage', starter: '10 GB', pro: '100 GB', enterprise: 'Unlimited' },
                                    { feature: 'API Access', starter: 'Standard', pro: 'Full', enterprise: 'Full + Webhooks' },
                                    { feature: 'Support', starter: 'Email', pro: 'Priority', enterprise: '24/7 Dedicated' },
                                    { feature: 'AI Features', starter: 'Basic', pro: 'Advanced', enterprise: 'Enterprise AI' },
                                    { feature: 'Custom Branding', starter: '—', pro: '✓', enterprise: '✓' },
                                    { feature: 'Audit Logs', starter: '30 days', pro: '1 year', enterprise: 'Unlimited' },
                                    { feature: 'SLA', starter: '—', pro: '99.9%', enterprise: '99.99%' },
                                ].map((row) => (
                                    <tr key={row.feature} className="hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium text-gray-900">{row.feature}</td>
                                        <td className="py-3 px-4 text-center text-gray-600">{row.starter}</td>
                                        <td className="py-3 px-4 text-center text-purple-700 font-medium">{row.pro}</td>
                                        <td className="py-3 px-4 text-center text-gray-600">{row.enterprise}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        {
                            q: 'What happens when my trial ends?',
                            a: 'Your data is securely stored for 30 days. Subscribe to any plan to restore full access instantly.',
                        },
                        {
                            q: 'Can I change plans later?',
                            a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.',
                        },
                        {
                            q: 'Is there a setup fee?',
                            a: 'No setup fees for Starter and Professional plans. Enterprise plans may include custom onboarding.',
                        },
                        {
                            q: 'What payment methods do you accept?',
                            a: 'We accept all major credit cards (Visa, MasterCard, AMEX) and bank transfers for Enterprise plans.',
                        },
                    ].map(({ q, a }) => (
                        <div key={q} className="p-4 rounded-lg bg-gray-50 border">
                            <h4 className="font-semibold text-gray-900 text-sm">{q}</h4>
                            <p className="text-gray-600 text-sm mt-1">{a}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Contact */}
            <div className="text-center py-6 space-y-2">
                <p className="text-gray-500 text-sm">Need help choosing a plan?</p>
                <div className="flex items-center justify-center gap-4">
                    <a href="mailto:sales@slict.lk" className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1">
                        <HeadphonesIcon className="w-4 h-4" /> Talk to Sales
                    </a>
                    <span className="text-gray-300">|</span>
                    <a href="mailto:support@slict.lk" className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1">
                        <Shield className="w-4 h-4" /> Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
}
