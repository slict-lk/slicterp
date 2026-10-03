'use client';

import { useState } from 'react';
import { Search, FileText, CreditCard, Wrench, Lightbulb, Phone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';
import { ContactForm } from '@/components/help/contact-form';
import { FAQ_DATA } from '@/components/help/faq-data';

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFAQs = FAQ_DATA.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const quickActions = [
        { icon: FileText, title: 'Getting Started', desc: 'Guide to set up your account' },
        { icon: CreditCard, title: 'Account & Billing', desc: 'Manage payments and plans' },
        { icon: Wrench, title: 'Technical Issues', desc: 'Troubleshoot common errors' },
        { icon: Lightbulb, title: 'Feature Request', desc: 'Suggest new features' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-16 px-4">
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">How can we help you today?</h1>
                    <div className="relative max-w-2xl mx-auto">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                        <Input
                            className="pl-12 h-12 bg-white/95 border-0 text-lg shadow-xl focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-white/50"
                            placeholder="Search for answers (e.g. 'export', 'password')..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-5xl px-4 -mt-8">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                    {quickActions.map((action, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -5 }}
                            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                                <action.icon className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-slate-900">{action.title}</h3>
                            <p className="text-xs text-slate-500 mt-1">{action.desc}</p>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content (FAQ) */}
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                Frequently Asked Questions
                                {searchQuery && (
                                    <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                        Filtering by "{searchQuery}"
                                    </span>
                                )}
                            </h2>

                            <Card className="border-slate-200 shadow-sm overflow-hidden">
                                <Accordion type="single" collapsible className="w-full">
                                    {filteredFAQs.length > 0 ? (
                                        filteredFAQs.map((faq) => (
                                            <AccordionItem key={faq.id} value={faq.id} className="px-6 border-b border-slate-100 last:border-0">
                                                <AccordionTrigger className="text-slate-700 hover:text-blue-600 hover:no-underline font-medium py-4">
                                                    {faq.question}
                                                </AccordionTrigger>
                                                <AccordionContent className="text-slate-500 leading-relaxed pb-4">
                                                    {faq.answer}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-slate-400">
                                            <p>No results found for "{searchQuery}"</p>
                                            <p className="text-sm mt-2">Try searching for something else or contact support.</p>
                                        </div>
                                    )}
                                </Accordion>
                            </Card>
                        </div>

                        <ContactForm />
                    </div>

                    {/* Sidebar (Contact Info) */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-900 mb-4">Contact Support</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-3 bg-blue-50 rounded-lg">
                                    <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-blue-900">Call Us</p>
                                        <p className="text-sm text-blue-700">+94 11 234 5678</p>
                                        <p className="text-xs text-blue-600 mt-1">Mon-Fri, 9am - 6pm</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                                    <Mail className="h-5 w-5 text-slate-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Email Us</p>
                                        <p className="text-sm text-slate-600">team@slict.lk</p>
                                        <p className="text-xs text-slate-500 mt-1">Response within 24h</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl shadow-md text-white">
                            <h3 className="font-bold mb-2">Premium Support</h3>
                            <p className="text-sm text-slate-300 mb-4">
                                Need faster response times and dedicated assistance? Upgrade to our Premium Support plan.
                            </p>
                            <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors border border-white/20">
                                View Plans
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
