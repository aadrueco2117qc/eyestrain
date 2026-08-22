'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { Menu } from 'lucide-react';
import { AiChat } from './ai-chat';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - hidden on mobile, visible on md and up */}
      <div className="hidden md:block">
        <Sidebar isOpen={true} />
      </div>

      {/* Mobile sidebar with overlay */}
      <div className="md:hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 overflow-auto flex flex-col md:ml-64">
        {/* Mobile header with menu button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-foreground">EyeGuard</h2>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Main content — extra bottom padding on mobile so content clears the bottom nav */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 pb-24 md:p-8 md:pb-8">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile bottom navigation bar */}
      <MobileNav />

      {/* Global floating AI chat bubble — visible on all pages */}
      <AiChat mode="bubble" />
    </div>
  );
}
