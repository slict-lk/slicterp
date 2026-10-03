'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import TrialBanner from '@/components/layout/TrialBanner';
import AIChatAssistant from '@/components/ai/ai-chat-assistant';
import { useState, useCallback } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMenuClose = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleMenuOpen = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  return (
    <div className="flex h-screen min-h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        onClose={handleMenuClose}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TrialBanner />
        <Header onMenuClick={handleMenuOpen} />
        <main className="flex-1 overflow-auto px-4 md:px-6 pb-6">
          {children}
        </main>
      </div>

      {/* AI Chat Assistant - Available on all dashboard pages */}
      <AIChatAssistant />
    </div>
  );
}
