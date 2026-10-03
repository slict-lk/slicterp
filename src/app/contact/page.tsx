
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setLoading(false);
        setSuccess(true);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b py-4">
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
                        <span className="text-xl font-bold text-gray-900">SLICT<span className="text-blue-600">ERP</span></span>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost">Back to Home</Button>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Have questions about pricing, features, or enterprise solutions?
                            Our team is here to help you transform your business.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Contact Info */}
                        <div className="space-y-6">
                            <Card className="border-none shadow-md">
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                                        <Mail className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Email Us</h3>
                                        <p className="text-sm text-gray-500 mb-1">For general inquiries</p>
                                        <a href="mailto:team@slict.lk" className="text-blue-600 font-medium hover:underline">team@slict.lk</a>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-md">
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 bg-green-100 rounded-lg text-green-600">
                                        <Phone className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">WhatsApp</h3>
                                        <p className="text-sm text-gray-500 mb-1">Instant support</p>
                                        <a href="https://wa.me/94752539988" className="text-green-600 font-medium hover:underline">+94 75 253 9988</a>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-md">
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                                        <MapPin className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Headquarters</h3>
                                        <p className="text-sm text-gray-500">
                                            Colombo, Sri Lanka<br />
                                            Global Operations Center
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Contact Form */}
                        <div className="md:col-span-2">
                            <Card className="border-none shadow-lg">
                                <CardHeader>
                                    <CardTitle>Send us a Message</CardTitle>
                                    <CardDescription>We usually respond within 24 hours.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {success ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                                <CheckCircle className="h-8 w-8 text-green-600" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-900">Message Sent!</h3>
                                            <p className="text-gray-600 mt-2">Thank you for reaching out. We'll get back to you shortly.</p>
                                            <Button className="mt-6" onClick={() => setSuccess(false)}>Send Another</Button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</label>
                                                    <Input id="name" placeholder="John Doe" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</label>
                                                    <Input id="email" type="email" placeholder="john@company.com" required />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label htmlFor="subject" className="text-sm font-medium text-gray-700">Subject</label>
                                                <Input id="subject" placeholder="How can we help?" required />
                                            </div>

                                            <div className="space-y-2">
                                                <label htmlFor="message" className="text-sm font-medium text-gray-700">Message</label>
                                                <Textarea id="message" placeholder="Tell us about your project..." className="min-h-[150px]" required />
                                            </div>

                                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="mr-2 h-4 w-4" />
                                                        Send Message
                                                    </>
                                                )}
                                            </Button>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
