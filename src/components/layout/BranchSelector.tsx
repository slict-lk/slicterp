'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useSession } from 'next-auth/react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Branch {
    id: string;
    name: string;
    code: string;
    isDefault: boolean;
}

export function BranchSelector() {
    const { currentBranchId, setCurrentBranchId } = useSettings();
    const { data: session } = useSession();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchBranches = async () => {
            const tenantId = (session?.user as any)?.tenantId;
            if (!tenantId) return;

            try {
                setLoading(true);
                const res = await fetch('/api/hotel/branches');
                if (res.ok) {
                    const data = await res.json();
                    setBranches(data);

                    // Set default if none selected
                    if (!currentBranchId && data.length > 0) {
                        const defaultBranch = data.find((b: Branch) => b.isDefault) || data[0];
                        setCurrentBranchId(defaultBranch.id);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch branches', error);
            } finally {
                setLoading(false);
            }
        };

        if (session) {
            fetchBranches();
        }
    }, [session, currentBranchId, setCurrentBranchId]);

    // If no branches or loading, or if single branch mode (optional optimization), hide?
    // User wants UI so better show even if 1 branch to confirm context.
    // If 0 branches, hide.
    if (branches.length === 0 && !loading) return null;

    return (
        <div className="hidden md:flex items-center gap-2">
            <Select
                value={currentBranchId || ''}
                onValueChange={(value) => {
                    setCurrentBranchId(value);
                    // window.location.reload(); // Optional: force refresh if context change requires it
                }}
            >
                <SelectTrigger className="w-[200px] border-dashed bg-transparent">
                    <div className="flex items-center gap-2 truncate">
                        <Building2 className="h-4 w-4 opacity-50" />
                        <SelectValue placeholder="Select Branch" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                            <span className="font-medium">{branch.code}</span>
                            <span className="text-muted-foreground ml-2 text-xs">- {branch.name}</span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
