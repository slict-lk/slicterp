'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Bell,
    Mail,
    Smartphone,
    MessageSquare,
    ShoppingCart,
    Users,
    DollarSign,
    AlertCircle,
    CheckCircle,
    Clock,
    Volume2,
} from 'lucide-react';
import Link from 'next/link';

interface NotificationChannel {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
}

interface NotificationPreference {
    id: string;
    title: string;
    description: string;
    icon: any;
    channels: NotificationChannel;
}

export default function NotificationsPage() {
    const [preferences, setPreferences] = useState<NotificationPreference[]>([
        {
            id: 'sales',
            title: 'Sales & Orders',
            description: 'New orders, order updates, and sales notifications',
            icon: ShoppingCart,
            channels: { email: true, push: true, sms: false, inApp: true },
        },
        {
            id: 'customers',
            title: 'Customer Activity',
            description: 'New customers, inquiries, and feedback',
            icon: Users,
            channels: { email: true, push: false, sms: false, inApp: true },
        },
        {
            id: 'payments',
            title: 'Payments',
            description: 'Payment received, failed payments, and refunds',
            icon: DollarSign,
            channels: { email: true, push: true, sms: true, inApp: true },
        },
        {
            id: 'inventory',
            title: 'Inventory Alerts',
            description: 'Low stock, out of stock, and restock notifications',
            icon: AlertCircle,
            channels: { email: true, push: true, sms: false, inApp: true },
        },
        {
            id: 'team',
            title: 'Team Updates',
            description: 'Team member activities, assignments, and mentions',
            icon: Users,
            channels: { email: false, push: true, sms: false, inApp: true },
        },
        {
            id: 'system',
            title: 'System Notifications',
            description: 'Updates, maintenance, and system alerts',
            icon: Bell,
            channels: { email: true, push: true, sms: false, inApp: true },
        },
    ]);

    const [emailDigest, setEmailDigest] = useState('daily');
    const [quietHours, setQuietHours] = useState(false);
    const [quietStart, setQuietStart] = useState('22:00');
    const [quietEnd, setQuietEnd] = useState('08:00');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [desktopNotifications, setDesktopNotifications] = useState(false);

    useEffect(() => {
        // Load preferences from localStorage
        const savedPreferences = localStorage.getItem('notificationPreferences');
        if (savedPreferences) {
            setPreferences(JSON.parse(savedPreferences));
        }

        const savedEmailDigest = localStorage.getItem('emailDigest') || 'daily';
        const savedQuietHours = localStorage.getItem('quietHours') === 'true';
        const savedQuietStart = localStorage.getItem('quietStart') || '22:00';
        const savedQuietEnd = localStorage.getItem('quietEnd') || '08:00';
        const savedSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        const savedDesktopNotifications = localStorage.getItem('desktopNotifications') === 'true';

        setEmailDigest(savedEmailDigest);
        setQuietHours(savedQuietHours);
        setQuietStart(savedQuietStart);
        setQuietEnd(savedQuietEnd);
        setSoundEnabled(savedSoundEnabled);
        setDesktopNotifications(savedDesktopNotifications);
    }, []);

    const updateChannel = (preferenceId: string, channel: keyof NotificationChannel, value: boolean) => {
        const updated = preferences.map((pref) =>
            pref.id === preferenceId
                ? { ...pref, channels: { ...pref.channels, [channel]: value } }
                : pref
        );
        setPreferences(updated);
        localStorage.setItem('notificationPreferences', JSON.stringify(updated));
    };

    const requestDesktopPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setDesktopNotifications(true);
                localStorage.setItem('desktopNotifications', 'true');
                new Notification('Desktop notifications enabled!', {
                    body: 'You will now receive notifications on this device.',
                    icon: '/favicon.ico',
                });
            }
        }
    };

    const handleEmailDigestChange = (value: string) => {
        setEmailDigest(value);
        localStorage.setItem('emailDigest', value);
    };

    const handleQuietHoursChange = (enabled: boolean) => {
        setQuietHours(enabled);
        localStorage.setItem('quietHours', enabled.toString());
    };

    const handleSoundEnabledChange = (enabled: boolean) => {
        setSoundEnabled(enabled);
        localStorage.setItem('soundEnabled', enabled.toString());
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-600">Manage how and when you receive notifications</p>
                </div>
                <Link href="/settings">
                    <Button variant="outline">Back to Settings</Button>
                </Link>
            </div>

            {/* Desktop Notifications */}
            {typeof window !== 'undefined' && 'Notification' in window && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5" />
                            Desktop Notifications
                        </CardTitle>
                        <CardDescription>
                            Receive notifications even when the browser is minimized
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!desktopNotifications ? (
                            <Button onClick={requestDesktopPermission}>
                                Enable Desktop Notifications
                            </Button>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>Desktop notifications enabled</span>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setDesktopNotifications(false);
                                        localStorage.setItem('desktopNotifications', 'false');
                                    }}
                                >
                                    Disable
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Notification Channels */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notification Preferences
                    </CardTitle>
                    <CardDescription>
                        Choose how you want to be notified for different types of events
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {/* Headers */}
                        <div className="grid grid-cols-5 gap-4 pb-3 border-b">
                            <div className="col-span-1"></div>
                            <div className="text-center">
                                <Mail className="h-5 w-5 mx-auto text-gray-600" />
                                <p className="text-xs text-gray-600 mt-1">Email</p>
                            </div>
                            <div className="text-center">
                                <Smartphone className="h-5 w-5 mx-auto text-gray-600" />
                                <p className="text-xs text-gray-600 mt-1">Push</p>
                            </div>
                            <div className="text-center">
                                <MessageSquare className="h-5 w-5 mx-auto text-gray-600" />
                                <p className="text-xs text-gray-600 mt-1">SMS</p>
                            </div>
                            <div className="text-center">
                                <Bell className="h-5 w-5 mx-auto text-gray-600" />
                                <p className="text-xs text-gray-600 mt-1">In-App</p>
                            </div>
                        </div>

                        {/* Preferences */}
                        {preferences.map((pref) => (
                            <div key={pref.id} className="grid grid-cols-5 gap-4 items-center">
                                <div className="col-span-1">
                                    <div className="flex items-center gap-3">
                                        <pref.icon className="h-5 w-5 text-gray-600" />
                                        <div>
                                            <p className="font-medium text-sm">{pref.title}</p>
                                            <p className="text-xs text-gray-500">{pref.description}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center">
                                    <Switch
                                        checked={pref.channels.email}
                                        onCheckedChange={(val) => updateChannel(pref.id, 'email', val)}
                                    />
                                </div>
                                <div className="flex justify-center">
                                    <Switch
                                        checked={pref.channels.push}
                                        onCheckedChange={(val) => updateChannel(pref.id, 'push', val)}
                                    />
                                </div>
                                <div className="flex justify-center">
                                    <Switch
                                        checked={pref.channels.sms}
                                        onCheckedChange={(val) => updateChannel(pref.id, 'sms', val)}
                                    />
                                </div>
                                <div className="flex justify-center">
                                    <Switch
                                        checked={pref.channels.inApp}
                                        onCheckedChange={(val) => updateChannel(pref.id, 'inApp', val)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Email Digest */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Digest
                    </CardTitle>
                    <CardDescription>
                        Get a summary of notifications via email instead of individual messages
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="emailDigest">Digest Frequency</Label>
                        <Select value={emailDigest} onValueChange={handleEmailDigestChange}>
                            <SelectTrigger id="emailDigest">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="realtime">Real-time (No digest)</SelectItem>
                                <SelectItem value="hourly">Hourly</SelectItem>
                                <SelectItem value="daily">Daily (8:00 AM)</SelectItem>
                                <SelectItem value="weekly">Weekly (Monday 8:00 AM)</SelectItem>
                                <SelectItem value="never">Never</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Quiet Hours */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Quiet Hours
                    </CardTitle>
                    <CardDescription>
                        Pause notifications during specific hours
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="quietHours">Enable Quiet Hours</Label>
                            <p className="text-sm text-gray-500">
                                No notifications during your quiet time
                            </p>
                        </div>
                        <Switch
                            id="quietHours"
                            checked={quietHours}
                            onCheckedChange={handleQuietHoursChange}
                        />
                    </div>

                    {quietHours && (
                        <>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="quietStart">Start Time</Label>
                                    <input
                                        id="quietStart"
                                        type="time"
                                        value={quietStart}
                                        onChange={(e) => {
                                            setQuietStart(e.target.value);
                                            localStorage.setItem('quietStart', e.target.value);
                                        }}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="quietEnd">End Time</Label>
                                    <input
                                        id="quietEnd"
                                        type="time"
                                        value={quietEnd}
                                        onChange={(e) => {
                                            setQuietEnd(e.target.value);
                                            localStorage.setItem('quietEnd', e.target.value);
                                        }}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Sound Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Volume2 className="h-5 w-5" />
                        Sound Settings
                    </CardTitle>
                    <CardDescription>
                        Control notification sounds
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="soundEnabled">Enable Notification Sounds</Label>
                            <p className="text-sm text-gray-500">
                                Play a sound when you receive notifications
                            </p>
                        </div>
                        <Switch
                            id="soundEnabled"
                            checked={soundEnabled}
                            onCheckedChange={handleSoundEnabledChange}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex justify-between items-center pt-4">
                <Button
                    variant="outline"
                    onClick={() => {
                        const allEnabled = preferences.map((pref) => ({
                            ...pref,
                            channels: { email: true, push: true, sms: false, inApp: true },
                        }));
                        setPreferences(allEnabled);
                        localStorage.setItem('notificationPreferences', JSON.stringify(allEnabled));
                    }}
                >
                    Enable All
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        const allDisabled = preferences.map((pref) => ({
                            ...pref,
                            channels: { email: false, push: false, sms: false, inApp: false },
                        }));
                        setPreferences(allDisabled);
                        localStorage.setItem('notificationPreferences', JSON.stringify(allDisabled));
                    }}
                >
                    Disable All
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        localStorage.removeItem('notificationPreferences');
                        localStorage.removeItem('emailDigest');
                        localStorage.removeItem('quietHours');
                        localStorage.removeItem('quietStart');
                        localStorage.removeItem('quietEnd');
                        localStorage.removeItem('soundEnabled');
                        window.location.reload();
                    }}
                >
                    Reset to Defaults
                </Button>
            </div>
        </div>
    );
}
