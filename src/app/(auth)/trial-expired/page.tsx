'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CreditCard, LogOut, Headphones, ArrowRight, Shield } from 'lucide-react';

export default function TrialExpiredPage() {
    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 w-full max-w-lg">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Icon */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 mb-4">
                            <Clock className="w-8 h-8 text-amber-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Your Trial Has Ended</h1>
                        <p className="text-gray-400 mt-2">Your 14-day free trial for SLICT ERP has expired</p>
                    </div>

                    <Card className="border-0 shadow-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                        <CardContent className="pt-6 space-y-5">
                            {/* Data retention notice */}
                            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <div className="flex items-start gap-3">
                                    <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-amber-200 font-semibold text-sm">Your data is safe</p>
                                        <p className="text-amber-200/70 text-sm mt-1">
                                            We securely store all your data for 30 days. Subscribe before then to restore everything instantly.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing cards */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { name: 'Starter', price: '$29', desc: 'Up to 5 users', highlight: false },
                                    { name: 'Professional', price: '$79', desc: 'Up to 25 users', highlight: true },
                                    { name: 'Enterprise', price: 'Custom', desc: 'Unlimited', highlight: false },
                                ].map((plan) => (
                                    <div
                                        key={plan.name}
                                        className={`p-3 rounded-lg text-center transition-all ${plan.highlight
                                                ? 'bg-blue-500/20 border border-blue-400/30 ring-1 ring-blue-400/20'
                                                : 'bg-white/5 border border-white/10'
                                            }`}
                                    >
                                        <p className="text-white font-semibold text-sm">{plan.name}</p>
                                        <p className="text-blue-400 text-xl font-bold mt-1">{plan.price}</p>
                                        <p className="text-gray-400 text-xs mt-0.5">{plan.desc}</p>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Buttons */}
                            <Link href="/settings/billing?plan=starter&utm_source=trial_expired" className="block">
                                <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-base shadow-lg">
                                    <CreditCard className="w-5 h-5 mr-2" />
                                    Subscribe Now
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>

                            <div className="grid grid-cols-2 gap-3">
                                <Link href="/contact">
                                    <Button variant="outline" className="w-full h-10 border-white/20 text-gray-300 hover:bg-white/10 hover:text-white">
                                        <Headphones className="w-4 h-4 mr-2" />
                                        Contact Sales
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    onClick={() => signOut({ callbackUrl: '/login' })}
                                    className="w-full h-10 border-white/20 text-gray-300 hover:bg-white/10 hover:text-white"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <p className="text-center text-gray-500 text-xs mt-4">
                        Need help? Email us at <a href="mailto:support@slict.lk" className="text-blue-400 hover:underline">support@slict.lk</a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
