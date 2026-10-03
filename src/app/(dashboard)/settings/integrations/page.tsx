'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Database,
    Mail,
    CreditCard,
    MessageSquare,
    ShoppingCart,
    Cloud,
    Truck,
    DollarSign,
    Phone,
    FileText,
    Check,
    AlertCircle,
    Settings,
    ExternalLink,
    Zap,
    Activity,
    Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Integration {
    id: string;
    name: string;
    description: string;
    category: string;
    icon: any;
    connected: boolean;
    enabled: boolean;
    color: string;
    features?: string[];
}

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState<Integration[]>([
        {
            id: 'stripe',
            name: 'Stripe',
            description: 'Accept online payments and manage subscriptions',
            category: 'Payment',
            icon: CreditCard,
            connected: true,
            enabled: true,
            color: 'bg-violet-500',
            features: ['Online payments', 'Subscriptions', 'Invoicing'],
        },
        {
            id: 'paypal',
            name: 'PayPal',
            description: 'Alternative payment gateway for global transactions',
            category: 'Payment',
            icon: DollarSign,
            connected: false,
            enabled: false,
            color: 'bg-blue-500',
            features: ['Payment processing', 'Global reach', 'Buyer protection'],
        },
        {
            id: 'razorpay',
            name: 'Razorpay',
            description: 'Payment gateway for India and Southeast Asia',
            category: 'Payment',
            icon: CreditCard,
            connected: false,
            enabled: false,
            color: 'bg-indigo-500',
            features: ['UPI', 'Cards', 'Net banking'],
        },
        {
            id: 'sendgrid',
            name: 'SendGrid',
            description: 'Email delivery and marketing automation',
            category: 'Communication',
            icon: Mail,
            connected: false,
            enabled: false,
            color: 'bg-blue-600',
            features: ['Transactional emails', 'Email marketing', 'Templates'],
        },
        {
            id: 'twilio',
            name: 'Twilio',
            description: 'SMS, voice, and WhatsApp messaging',
            category: 'Communication',
            icon: Phone,
            connected: true,
            enabled: true,
            color: 'bg-red-500',
            features: ['SMS', 'Voice calls', 'WhatsApp Business'],
        },
        {
            id: 'whatsapp',
            name: 'WhatsApp Business',
            description: 'Connect with customers via WhatsApp',
            category: 'Communication',
            icon: MessageSquare,
            connected: false,
            enabled: false,
            color: 'bg-green-500',
            features: ['Direct messaging', 'Automated responses', 'Media sharing'],
        },
        {
            id: 'aws',
            name: 'Amazon S3',
            description: 'Cloud storage for files and documents',
            category: 'Storage',
            icon: Cloud,
            connected: true,
            enabled: true,
            color: 'bg-orange-500',
            features: ['File storage', 'Backups', 'CDN delivery'],
        },
        {
            id: 'shippo',
            name: 'Shippo',
            description: 'Multi-carrier shipping and tracking',
            category: 'Shipping',
            icon: Truck,
            connected: false,
            enabled: false,
            color: 'bg-teal-500',
            features: ['Label printing', 'Rate comparison', 'Tracking'],
        },
        {
            id: 'shopify',
            name: 'Shopify',
            description: 'E-commerce platform integration',
            category: 'E-commerce',
            icon: ShoppingCart,
            connected: false,
            enabled: false,
            color: 'bg-emerald-600',
            features: ['Product sync', 'Order management', 'Inventory sync'],
        },
        {
            id: 'quickbooks',
            name: 'QuickBooks',
            description: 'Accounting software integration',
            category: 'Accounting',
            icon: FileText,
            connected: false,
            enabled: false,
            color: 'bg-green-700',
            features: ['Invoice sync', 'Expense tracking', 'Financial reports'],
        },
        {
            id: 'slack',
            name: 'Slack',
            description: 'Team communication and notifications',
            category: 'Communication',
            icon: MessageSquare,
            connected: false,
            enabled: false,
            color: 'bg-purple-600',
            features: ['Notifications', 'Team chat', 'File sharing'],
        },
        {
            id: 'google-workspace',
            name: 'Google Workspace',
            description: 'Gmail, Drive, Calendar, and more',
            category: 'Productivity',
            icon: Database,
            connected: false,
            enabled: false,
            color: 'bg-red-600',
            features: ['Email integration', 'Calendar sync', 'Drive storage'],
        },
    ]);

    const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
    const [configOpen, setConfigOpen] = useState(false);

    const toggleIntegration = (id: string) => {
        setIntegrations(
            integrations.map((int) =>
                int.id === id ? { ...int, enabled: !int.enabled } : int
            )
        );
    };

    const handleConnectClick = (integration: Integration) => {
        setSelectedIntegration(integration);
        setConfigOpen(true);
    };

    const handleSaveConfig = () => {
        if (!selectedIntegration) return;
        setIntegrations(integrations.map(int =>
            int.id === selectedIntegration.id
                ? { ...int, connected: true, enabled: true }
                : int
        ));
        setConfigOpen(false);
    };

    const categories = Array.from(new Set(integrations.map((int) => int.category)));

    const connectedCount = integrations.filter(i => i.connected).length;
    const activeCount = integrations.filter(i => i.enabled).length;

    return (
        <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
            {/* Gradient Header */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-violet-900 to-indigo-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Integrations Marketplace</h1>
                    <p className="text-indigo-100 text-lg max-w-2xl">
                        Supercharge your ERP by connecting your favorite tools and services.
                        Automate workflows and sync data in real-time.
                    </p>
                </div>
                <div className="flex gap-4 relative z-10">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[120px] text-center border border-white/10">
                        <div className="text-3xl font-bold">{connectedCount}</div>
                        <div className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Connected</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[120px] text-center border border-white/10">
                        <div className="text-3xl font-bold">{activeCount}</div>
                        <div className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Active</div>
                    </div>
                </div>
            </div>

            {/* Integrations Grid */}
            <div className="space-y-10">
                {categories.map((category) => (
                    <div key={category} className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {category}
                            <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {integrations.filter(i => i.category === category).length}
                            </span>
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {integrations
                                .filter((int) => int.category === category)
                                .map((integration) => (
                                    <motion.div
                                        key={integration.id}
                                        whileHover={{ y: -4 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Card className={cn(
                                            "h-full border-slate-200 hover:shadow-xl transition-all duration-300 group overflow-hidden",
                                            integration.connected ? "ring-1 ring-indigo-100 bg-indigo-50/10" : "bg-white"
                                        )}>
                                            <CardHeader className="pb-4">
                                                <div className="flex items-start justify-between">
                                                    <div className={cn(
                                                        "p-3 rounded-xl shadow-sm transition-transform group-hover:scale-110",
                                                        integration.color,
                                                        "text-white"
                                                    )}>
                                                        <integration.icon className="h-6 w-6" />
                                                    </div>
                                                    {integration.connected ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-500">
                                                            Available
                                                        </Badge>
                                                    )}
                                                </div>
                                                <CardTitle className="mt-4 text-lg font-bold text-slate-900">
                                                    {integration.name}
                                                </CardTitle>
                                                <CardDescription className="line-clamp-2 h-10">
                                                    {integration.description}
                                                </CardDescription>
                                            </CardHeader>

                                            <CardContent className="space-y-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {integration.features?.slice(0, 2).map((feature) => (
                                                        <span key={feature} className="text-[10px] font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                                                            {feature}
                                                        </span>
                                                    ))}
                                                    {(integration.features?.length || 0) > 2 && (
                                                        <span className="text-[10px] font-medium px-2 py-1 bg-slate-50 text-slate-400 rounded-md">
                                                            +{integration.features!.length - 2}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="pt-2 flex items-center gap-3">
                                                    {integration.connected ? (
                                                        <>
                                                            <Switch
                                                                checked={integration.enabled}
                                                                onCheckedChange={() => toggleIntegration(integration.id)}
                                                                className="data-[state=checked]:bg-indigo-600"
                                                            />
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex-1 border-slate-200 hover:bg-slate-50 hover:text-indigo-600"
                                                                onClick={() => handleConnectClick(integration)}
                                                            >
                                                                <Settings className="h-4 w-4 mr-2" />
                                                                Configure
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10"
                                                            onClick={() => handleConnectClick(integration)}
                                                        >
                                                            <Zap className="h-4 w-4 mr-2" />
                                                            Connect
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Configuration Dialog */}
            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden">
                    <DialogHeader className="p-6 bg-slate-50 border-b">
                        <div className="flex items-center gap-4">
                            <div className={cn("p-3 rounded-xl text-white shadow-sm", selectedIntegration?.color)}>
                                {selectedIntegration && <selectedIntegration.icon className="h-6 w-6" />}
                            </div>
                            <div>
                                <DialogTitle className="text-xl">{selectedIntegration?.name} Configuration</DialogTitle>
                                <DialogDescription className="mt-1">
                                    Configure authentication and synchronization settings.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                            <Activity className="h-4 w-4 text-blue-600" />
                            <AlertDescription>
                                Securely storing credentials. We use standard OAuth2 flow where supported.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="api-key">API Key / Client ID</Label>
                                <Input id="api-key" type="password" placeholder="pk_test_..." className="font-mono text-sm bg-slate-50" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="api-secret">API Secret / Client Secret</Label>
                                <Input id="api-secret" type="password" placeholder="sk_test_..." className="font-mono text-sm bg-slate-50" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="webhook">Webhook Endpoint</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="webhook"
                                        value={`https://api.slict.com/webhooks/${selectedIntegration?.id}`}
                                        readOnly
                                        className="bg-slate-100 text-slate-500 font-mono text-sm"
                                    />
                                    <Button size="icon" variant="outline" onClick={() => navigator.clipboard.writeText(`https://api.slict.com/webhooks/${selectedIntegration?.id}`)}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-[11px] text-slate-500">Add this URL to your {selectedIntegration?.name} developer settings.</p>
                            </div>
                        </div>

                        {selectedIntegration?.features && (
                            <div className="pt-4 border-t border-slate-100">
                                <Label className="mb-3 block">Enabled Features</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedIntegration.features.map(feature => (
                                        <div key={feature} className="flex items-center space-x-2">
                                            <Switch id={feature} defaultChecked />
                                            <Label htmlFor={feature} className="font-normal text-slate-600 cursor-pointer">{feature}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t items-center sm:justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Globe className="h-3 w-3" />
                            Documentation
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveConfig} className={cn("text-white shadow-lg", selectedIntegration?.color)}>
                                {selectedIntegration?.connected ? 'Save Changes' : 'Connect Integration'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
