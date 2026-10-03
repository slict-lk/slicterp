'use client';

import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { X, Clock, ArrowRight } from 'lucide-react';

/**
 * TrialBanner — shows a persistent top banner when user is on a trial plan.
 * Color escalation: blue (7+ days) → amber (3-6 days) → red (1-2 days)
 * Dismissable per session but reappears on page reload.
 */
export default function TrialBanner() {
    const { data: session } = useSession();
    const [dismissed, setDismissed] = useState(false);

    const trialInfo = useMemo(() => {
        if (!session?.user?.plan || session.user.plan !== 'trial' || !session.user.trialEnd) {
            return null;
        }

        const trialEnd = new Date(session.user.trialEnd);
        const now = new Date();
        const diffMs = trialEnd.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        if (daysLeft <= 0) return null; // Middleware handles expired trials

        let variant: 'blue' | 'amber' | 'red';
        if (daysLeft <= 2) variant = 'red';
        else if (daysLeft <= 6) variant = 'amber';
        else variant = 'blue';

        return { daysLeft, variant };
    }, [session]);

    if (!trialInfo || dismissed) return null;

    const styles = {
        blue: {
            bg: 'bg-blue-600',
            text: 'text-blue-50',
            btn: 'bg-white/20 hover:bg-white/30 text-white',
            close: 'text-blue-200 hover:text-white',
        },
        amber: {
            bg: 'bg-amber-500',
            text: 'text-amber-50',
            btn: 'bg-white/20 hover:bg-white/30 text-white',
            close: 'text-amber-200 hover:text-white',
        },
        red: {
            bg: 'bg-red-600',
            text: 'text-red-50',
            btn: 'bg-white/20 hover:bg-white/30 text-white',
            close: 'text-red-200 hover:text-white',
        },
    };

    const s = styles[trialInfo.variant];

    return (
        <div className={`${s.bg} ${s.text} px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium relative z-50`}>
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>
                {trialInfo.daysLeft === 1
                    ? 'Your free trial ends tomorrow!'
                    : `You have ${trialInfo.daysLeft} days left in your free trial`}
            </span>
            <Link
                href="/settings/billing?plan=starter&utm_source=trial_banner"
                className={`${s.btn} px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1`}
            >
                Upgrade <ArrowRight className="w-3 h-3" />
            </Link>
            <button onClick={() => setDismissed(true)} className={`${s.close} absolute right-3 transition-colors`}>
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
