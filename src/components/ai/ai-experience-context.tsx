"use client";

import { createContext, useContext } from 'react';
import type { AIExperienceMode } from '@/lib/ai/control-plane-types';

type AIExperienceContextValue = {
  mode: AIExperienceMode;
  setMode: (mode: AIExperienceMode) => void;
  canUseAdvanced: boolean;
};

const AIExperienceContext = createContext<AIExperienceContextValue | null>(null);

export function AIExperienceProvider({
  value,
  children,
}: {
  value: AIExperienceContextValue;
  children: React.ReactNode;
}) {
  return <AIExperienceContext.Provider value={value}>{children}</AIExperienceContext.Provider>;
}

export function useAIExperience() {
  const context = useContext(AIExperienceContext);
  if (!context) {
    return {
      mode: 'simple' as const,
      setMode: () => undefined,
      canUseAdvanced: false,
    };
  }
  return context;
}
