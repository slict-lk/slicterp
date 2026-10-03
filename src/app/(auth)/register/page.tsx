'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    User, Mail, Lock, Building2, ArrowRight, ArrowLeft, Check, Eye, EyeOff,
    Sparkles, Shield, Zap, ShoppingCart, DollarSign, Users, Package,
    Factory, Briefcase, Megaphone, Headphones, CreditCard, Home, Heart,
    Building, UtensilsCrossed, MessageSquare, Calendar, Brain, Wrench,
    Ship, BookOpen, Code, CheckCircle2, Loader2, AlertCircle
} from 'lucide-react';
import { AVAILABLE_MODULES, MODULE_CATEGORIES } from '@/lib/modules';

// Icon mapping for modules
const iconMap: Record<string, any> = {
    LayoutDashboard: ShoppingCart, ShoppingCart, DollarSign, Users, Package,
    Factory, Briefcase, Megaphone, Headphones, CreditCard, Home, Heart,
    Building, UtensilsCrossed, MessageSquare, Calendar, Brain, Wrench,
    Ship, BookOpen, Code, Settings: Shield, FileText: BookOpen,
    CheckCircle2, UserCheck: Users, Phone: MessageSquare, Gift: Sparkles,
    ClipboardList: BookOpen, GraduationCap: BookOpen, MessagesSquare: MessageSquare,
    Presentation: Code, Workflow: Zap, Puzzle: Code, Store: ShoppingCart,
    FolderKanban: Briefcase, Clock: Calendar, UserPlus: Users,
    Stethoscope: Heart, Pill: Heart, TestTube: Heart, Bed: Heart, HeartPulse: Heart,
};

// Password strength calculator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: 'Strong', color: 'bg-green-500' };
    return { score, label: 'Excellent', color: 'bg-emerald-500' };
}

// Filter to non-core, selectable modules
const SELECTABLE_MODULES = AVAILABLE_MODULES.filter(
    (m) => !['dashboard', 'settings', 'users', 'audit'].includes(m.id)
);

export default function RegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Steps
    const [step, setStep] = useState(1);

    // Step 1: Account
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [companyName, setCompanyName] = useState('');

    // Step 2: Apps
    const [selectedApps, setSelectedApps] = useState<string[]>([]);

    // Step 3
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pre-select apps from URL params (?apps=sales,hr,...)
    useEffect(() => {
        const appsParam = searchParams.get('apps');
        if (appsParam) {
            const ids = appsParam.split(',').filter((id) =>
                SELECTABLE_MODULES.some((m) => m.id === id)
            );
            if (ids.length > 0) setSelectedApps(ids);
        }
    }, [searchParams]);

    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

    const canProceedStep1 = name.trim().length >= 2 && email.includes('@') && password.length >= 8 && companyName.trim().length >= 2;
    const canProceedStep2 = selectedApps.length >= 1;
    const canSubmit = canProceedStep1 && canProceedStep2 && agreedToTerms;

    const toggleApp = (id: string) => {
        setSelectedApps((prev) =>
            prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, companyName, selectedApps }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Registration failed. Please try again.');
                setLoading(false);
                return;
            }

            // Success — redirect to login
            router.push('/login?registered=true');
        } catch {
            setError('An unexpected error occurred. Please try again.');
            setLoading(false);
        }
    };

    // Group modules by category
    const groupedModules = useMemo(() => {
        const groups: { category: string; name: string; modules: typeof SELECTABLE_MODULES }[] = [];
        MODULE_CATEGORIES.forEach((cat) => {
            const mods = SELECTABLE_MODULES.filter((m) => m.category === cat.id);
            if (mods.length > 0) groups.push({ category: cat.id, name: cat.name, modules: mods });
        });
        return groups;
    }, []);

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500" />
            <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" />
            <div className="absolute top-40 right-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }} />

            <div className="relative z-10 w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-6 text-white">
                    <Link href="/" className="inline-block">
                        <h1 className="text-3xl font-bold">
                            <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">SLICT</span> ERP
                        </h1>
                    </Link>
                    <p className="text-white/80 mt-1">Start your 14-day free trial</p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s < step ? 'bg-green-500 text-white' :
                                s === step ? 'bg-white text-blue-600 shadow-lg' :
                                    'bg-white/20 text-white/60'
                                }`}>
                                {s < step ? <Check className="w-4 h-4" /> : s}
                            </div>
                            {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-green-400' : 'bg-white/20'}`} />}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <Card className="shadow-2xl border-0">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Account Details */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CardHeader className="text-center">
                                    <CardTitle className="text-2xl">Create Your Account</CardTitle>
                                    <CardDescription>Enter your details to get started</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {error && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="name">Full Name</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-11" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="company">Company Name</Label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input id="company" placeholder="Acme Corp" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="pl-10 h-11" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input id="email" type="email" placeholder="john@acme.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Min 8 characters"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="pl-10 pr-10 h-11"
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {password.length > 0 && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full ${passwordStrength.color} transition-all`} style={{ width: `${(passwordStrength.score / 5) * 100}%` }} />
                                                </div>
                                                <span className="text-xs text-gray-500">{passwordStrength.label}</span>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={() => { setError(''); setStep(2); }}
                                        disabled={!canProceedStep1}
                                        className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                    >
                                        Continue <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>

                                    <p className="text-center text-sm text-gray-500">
                                        Already have an account?{' '}
                                        <Link href="/login" className="text-blue-600 font-semibold hover:underline">Sign In</Link>
                                    </p>
                                </CardContent>
                            </motion.div>
                        )}

                        {/* Step 2: Select Apps */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CardHeader className="text-center">
                                    <CardTitle className="text-2xl">Select Your Apps</CardTitle>
                                    <CardDescription>Choose the modules you want to explore.</CardDescription>
                                    <Badge variant="outline" className="mt-2">{selectedApps.length} selected</Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="max-h-[400px] overflow-y-auto pr-2 space-y-5">
                                        {groupedModules.map(({ category, name: catName, modules }) => (
                                            <div key={category}>
                                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{catName}</h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {modules.map((mod) => {
                                                        const isSelected = selectedApps.includes(mod.id);
                                                        const IconComp = iconMap[mod.icon || ''] || Package;
                                                        return (
                                                            <button
                                                                key={mod.id}
                                                                onClick={() => toggleApp(mod.id)}
                                                                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all text-sm ${isSelected
                                                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                                                                    }`}
                                                            >
                                                                <IconComp className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                                                                <span className="truncate font-medium">{mod.name}</span>
                                                                {isSelected && <CheckCircle2 className="w-4 h-4 ml-auto text-blue-500 flex-shrink-0" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">
                                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                        </Button>
                                        <Button
                                            onClick={() => setStep(3)}
                                            disabled={!canProceedStep2}
                                            className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                        >
                                            Continue <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </motion.div>
                        )}

                        {/* Step 3: Confirm */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CardHeader className="text-center">
                                    <CardTitle className="text-2xl">Confirm & Start Trial</CardTitle>
                                    <CardDescription>Review your selections before starting</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {error && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    {/* Account Summary */}
                                    <div className="p-4 rounded-lg bg-gray-50 border space-y-2">
                                        <h4 className="font-semibold text-gray-900 text-sm">Account</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{name}</span></div>
                                            <div><span className="text-gray-500">Company:</span> <span className="font-medium">{companyName}</span></div>
                                            <div className="col-span-2"><span className="text-gray-500">Email:</span> <span className="font-medium">{email}</span></div>
                                        </div>
                                    </div>

                                    {/* Selected Apps */}
                                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 space-y-2">
                                        <h4 className="font-semibold text-blue-900 text-sm">Selected Apps ({selectedApps.length})</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedApps.map((id) => {
                                                const mod = AVAILABLE_MODULES.find((m) => m.id === id);
                                                return mod ? (
                                                    <Badge key={id} variant="secondary" className="bg-white text-blue-700 border-blue-200">
                                                        {mod.name}
                                                    </Badge>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>

                                    {/* Trial Terms */}
                                    <div className="p-4 rounded-lg bg-green-50 border border-green-100 space-y-1">
                                        <h4 className="font-semibold text-green-900 text-sm">Trial Terms</h4>
                                        <ul className="text-sm text-green-800 space-y-1">
                                            <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" /> 14 days full access</li>
                                            <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" /> No credit card required</li>
                                            <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" /> Cancel anytime</li>
                                            <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5" /> All features included</li>
                                        </ul>
                                    </div>

                                    {/* Terms Checkbox */}
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={agreedToTerms}
                                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-600">
                                            I agree to the{' '}
                                            <a href="#" className="text-blue-600 underline">Terms of Service</a> and{' '}
                                            <a href="#" className="text-blue-600 underline">Privacy Policy</a>
                                        </span>
                                    </label>

                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11">
                                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                        </Button>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={!canSubmit || loading}
                                            className="flex-1 h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                        >
                                            {loading ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Account...</>
                                            ) : (
                                                <><Sparkles className="w-4 h-4 mr-2" /> Start Free Trial</>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </div>
        </div>
    );
}
