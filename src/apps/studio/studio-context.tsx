"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CustomModule, StudioDashboard, StudioWorkflow } from './types';

interface StudioContextType {
    activeModule: CustomModule | null;
    setActiveModule: (module: CustomModule | null) => void;
    activeDashboard: StudioDashboard | null;
    setActiveDashboard: (dashboard: StudioDashboard | null) => void;
    activeWorkflow: StudioWorkflow | null;
    setActiveWorkflow: (workflow: StudioWorkflow | null) => void;
    isSidebarOpen: boolean;
    setSidebarOpen: (isOpen: boolean) => void;
    clearState: () => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: ReactNode }) {
    const [activeModule, setActiveModule] = useState<CustomModule | null>(null);
    const [activeDashboard, setActiveDashboard] = useState<StudioDashboard | null>(null);
    const [activeWorkflow, setActiveWorkflow] = useState<StudioWorkflow | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const clearState = () => {
        setActiveModule(null);
        setActiveDashboard(null);
        setActiveWorkflow(null);
    };

    return (
        <StudioContext.Provider
            value={{
                activeModule,
                setActiveModule,
                activeDashboard,
                setActiveDashboard,
                activeWorkflow,
                setActiveWorkflow,
                isSidebarOpen,
                setSidebarOpen,
                clearState,
            }}
        >
            {children}
        </StudioContext.Provider>
    );
}

export function useStudioContext() {
    const context = useContext(StudioContext);
    if (context === undefined) {
        throw new Error('useStudioContext must be used within a StudioProvider');
    }
    return context;
}
