'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface SystemSettings {
    systemName: string;
    timezone: string;
    dateFormat: string;
    currency: string;
    sessionTimeout: string;
    passwordExpiry: string;
    twoFactorAuth: boolean;
    ipWhitelist: boolean;
    autoBackup: boolean;
    backupFrequency: string;
    retentionDays: string;
    cacheEnabled: boolean;
    cacheTTL: string;
    apiRateLimit: string;
}

interface SettingsContextType {
    settings: SystemSettings;
    updateSettings: (newSettings: Partial<SystemSettings>) => void;
    formatCurrency: (amount: number) => string;
    formatDate: (date: Date | string) => string;
    currentBranchId: string | null;
    setCurrentBranchId: (id: string) => void;
}

const defaultSettings: SystemSettings = {
    systemName: 'SLICT ERP 2025',
    timezone: 'Asia/Colombo',
    dateFormat: 'DD/MM/YYYY',
    currency: 'LKR',
    sessionTimeout: '30',
    passwordExpiry: '90',
    twoFactorAuth: false,
    ipWhitelist: false,
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: '30',
    cacheEnabled: true,
    cacheTTL: '3600',
    apiRateLimit: '100',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
    const [currentBranchId, setCurrentBranchIdState] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load settings from localStorage on mount
        const loadSettings = () => {
            try {
                const saved = localStorage.getItem('systemSettings');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setSettings({ ...defaultSettings, ...parsed });
                }

                // Load branch
                const savedBranch = localStorage.getItem('currentBranchId');
                if (savedBranch) {
                    setCurrentBranchIdState(savedBranch);
                }
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        };

        loadSettings();
        setMounted(true);

        // Listen for storage events (in case changed in another tab)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'systemSettings') {
                loadSettings();
            }
        };

        // Custom event for same-tab updates
        const handleLocalSettingsChange = () => {
            loadSettings();
        }

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('settingsChanged', handleLocalSettingsChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('settingsChanged', handleLocalSettingsChange);
        };
    }, []);

    const setCurrentBranchId = (id: string) => {
        setCurrentBranchIdState(id);
        localStorage.setItem('currentBranchId', id);
        // Dispatch custom event if needed, or just let context propagate
    };

    const updateSettings = (newSettings: Partial<SystemSettings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        localStorage.setItem('systemSettings', JSON.stringify(updated));
        // Dispatch custom event for other components to know
        window.dispatchEvent(new Event('settingsChanged'));
    };

    const formatCurrency = (amount: number) => {
        if (!mounted) return '...'; // Avoid hydration mismatch
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: settings.currency,
                minimumFractionDigits: 2,
            }).format(amount);
        } catch (error) {
            // Fallback for invalid currency codes
            return `${settings.currency} ${amount.toFixed(2)}`;
        }
    };

    const formatDate = (date: Date | string) => {
        if (!mounted) return '';
        try {
            const dateObj = new Date(date);
            return new Intl.DateTimeFormat('en-US', {
                timeZone: settings.timezone,
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }).format(dateObj);
        } catch (error) {
            return new Date(date).toLocaleDateString();
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, formatCurrency, formatDate, currentBranchId, setCurrentBranchId }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
