'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Settings,
    Database,
    Shield,
    Clock,
    Globe,
    HardDrive,
    Mail,
    AlertCircle,
    Save,
} from 'lucide-react';
import Link from 'next/link';

export default function SystemSettingsPage() {
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // General Settings
    const [systemName, setSystemName] = useState('SLICT ERP 2025');
    const [timezone, setTimezone] = useState('Asia/Kolkata');
    const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
    const [currency, setCurrency] = useState('INR');

    // Security Settings
    const [sessionTimeout, setSessionTimeout] = useState('30');
    const [passwordExpiry, setPasswordExpiry] = useState('90');
    const [twoFactorAuth, setTwoFactorAuth] = useState(false);
    const [ipWhitelist, setIpWhitelist] = useState(false);

    // Database Settings
    const [autoBackup, setAutoBackup] = useState(true);
    const [backupFrequency, setBackupFrequency] = useState('daily');
    const [retentionDays, setRetentionDays] = useState('30');

    // Email Settings
    const [smtpHost, setSmtpHost] = useState('');
    const [smtpPort, setSmtpPort] = useState('587');
    const [smtpUser, setSmtpUser] = useState('');
    const [smtpFrom, setSmtpFrom] = useState('');

    // Performance Settings
    const [cacheEnabled, setCacheEnabled] = useState(true);
    const [cacheTTL, setCacheTTL] = useState('3600');
    const [apiRateLimit, setApiRateLimit] = useState('100');

    useEffect(() => {
        // Load settings from localStorage or API
        const loadSettings = () => {
            const saved = localStorage.getItem('systemSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                setSystemName(settings.systemName || systemName);
                setTimezone(settings.timezone || timezone);
                setDateFormat(settings.dateFormat || dateFormat);
                setCurrency(settings.currency || currency);
                setSessionTimeout(settings.sessionTimeout || sessionTimeout);
                setPasswordExpiry(settings.passwordExpiry || passwordExpiry);
                setTwoFactorAuth(settings.twoFactorAuth || false);
                setIpWhitelist(settings.ipWhitelist || false);
                setAutoBackup(settings.autoBackup !== false);
                setBackupFrequency(settings.backupFrequency || backupFrequency);
                setRetentionDays(settings.retentionDays || retentionDays);
                setCacheEnabled(settings.cacheEnabled !== false);
                setCacheTTL(settings.cacheTTL || cacheTTL);
                setApiRateLimit(settings.apiRateLimit || apiRateLimit);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const settings = {
                systemName,
                timezone,
                dateFormat,
                currency,
                sessionTimeout,
                passwordExpiry,
                twoFactorAuth,
                ipWhitelist,
                autoBackup,
                backupFrequency,
                retentionDays,
                cacheEnabled,
                cacheTTL,
                apiRateLimit,
            };

            // Save to localStorage (in production, this would be an API call)
            localStorage.setItem('systemSettings', JSON.stringify(settings));

            setSuccess('System settings saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                    <p className="text-gray-600">Configure advanced system settings and preferences</p>
                </div>
                <Link href="/settings">
                    <Button variant="outline">Back to Settings</Button>
                </Link>
            </div>

            {success && (
                <Alert className="bg-green-50 text-green-700 border-green-200">
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* General Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        General Settings
                    </CardTitle>
                    <CardDescription>Basic system configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="systemName">System Name</Label>
                            <Input
                                id="systemName"
                                value={systemName}
                                onChange={(e) => setSystemName(e.target.value)}
                                placeholder="Enter system name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="timezone">Timezone</Label>
                            <Select value={timezone} onValueChange={setTimezone}>
                                <SelectTrigger id="timezone">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Asia/Colombo">Asia/Colombo (SLST)</SelectItem>
                                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                                    <SelectItem value="UTC">UTC</SelectItem>
                                    <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dateFormat">Date Format</Label>
                            <Select value={dateFormat} onValueChange={setDateFormat}>
                                <SelectTrigger id="dateFormat">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="currency">Default Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger id="currency">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LKR">LKR - Sri Lankan Rupee</SelectItem>
                                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Security Settings
                    </CardTitle>
                    <CardDescription>Configure security and authentication settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                            <Input
                                id="sessionTimeout"
                                type="number"
                                value={sessionTimeout}
                                onChange={(e) => setSessionTimeout(e.target.value)}
                                min="5"
                                max="1440"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                            <Input
                                id="passwordExpiry"
                                type="number"
                                value={passwordExpiry}
                                onChange={(e) => setPasswordExpiry(e.target.value)}
                                min="0"
                                max="365"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                                <p className="text-sm text-gray-500">Require 2FA for all users</p>
                            </div>
                            <Switch
                                id="twoFactorAuth"
                                checked={twoFactorAuth}
                                onCheckedChange={setTwoFactorAuth}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="ipWhitelist">IP Whitelisting</Label>
                                <p className="text-sm text-gray-500">Restrict access to specific IP addresses</p>
                            </div>
                            <Switch
                                id="ipWhitelist"
                                checked={ipWhitelist}
                                onCheckedChange={setIpWhitelist}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Database & Backup Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Database & Backup
                    </CardTitle>
                    <CardDescription>Configure database backup and retention policies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="autoBackup">Automatic Backups</Label>
                            <p className="text-sm text-gray-500">Enable scheduled database backups</p>
                        </div>
                        <Switch
                            id="autoBackup"
                            checked={autoBackup}
                            onCheckedChange={setAutoBackup}
                        />
                    </div>

                    {autoBackup && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="backupFrequency">Backup Frequency</Label>
                                <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                                    <SelectTrigger id="backupFrequency">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hourly">Hourly</SelectItem>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="retentionDays">Retention Period (days)</Label>
                                <Input
                                    id="retentionDays"
                                    type="number"
                                    value={retentionDays}
                                    onChange={(e) => setRetentionDays(e.target.value)}
                                    min="1"
                                    max="365"
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Email Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Configuration
                    </CardTitle>
                    <CardDescription>SMTP settings for outgoing emails</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Configure your SMTP server details to enable email notifications and communication.
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="smtpHost">SMTP Host</Label>
                            <Input
                                id="smtpHost"
                                value={smtpHost}
                                onChange={(e) => setSmtpHost(e.target.value)}
                                placeholder="smtp.gmail.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="smtpPort">SMTP Port</Label>
                            <Input
                                id="smtpPort"
                                value={smtpPort}
                                onChange={(e) => setSmtpPort(e.target.value)}
                                placeholder="587"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="smtpUser">SMTP Username</Label>
                            <Input
                                id="smtpUser"
                                value={smtpUser}
                                onChange={(e) => setSmtpUser(e.target.value)}
                                placeholder="your-email@gmail.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="smtpFrom">From Email Address</Label>
                            <Input
                                id="smtpFrom"
                                type="email"
                                value={smtpFrom}
                                onChange={(e) => setSmtpFrom(e.target.value)}
                                placeholder="noreply@yourcompany.com"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Performance Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5" />
                        Performance & Caching
                    </CardTitle>
                    <CardDescription>Optimize system performance and API usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="cacheEnabled">Enable Caching</Label>
                            <p className="text-sm text-gray-500">Use Redis/memory cache for better performance</p>
                        </div>
                        <Switch
                            id="cacheEnabled"
                            checked={cacheEnabled}
                            onCheckedChange={setCacheEnabled}
                        />
                    </div>

                    {cacheEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cacheTTL">Cache TTL (seconds)</Label>
                                <Input
                                    id="cacheTTL"
                                    type="number"
                                    value={cacheTTL}
                                    onChange={(e) => setCacheTTL(e.target.value)}
                                    min="60"
                                    max="86400"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="apiRateLimit">API Rate Limit (requests/minute)</Label>
                                <Input
                                    id="apiRateLimit"
                                    type="number"
                                    value={apiRateLimit}
                                    onChange={(e) => setApiRateLimit(e.target.value)}
                                    min="10"
                                    max="1000"
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                >
                    Reset
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Settings
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
