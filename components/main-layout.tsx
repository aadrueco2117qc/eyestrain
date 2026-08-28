'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { NotificationBell } from './notification-bell';
import { Menu } from 'lucide-react';
import Image from 'next/image';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar — desktop */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar isOpen={true} />
      </div>

      {/* Sidebar — mobile slide-in */}
      <div className="md:hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content column */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top header bar ── */}
        <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
          {/* Left — hamburger on mobile, empty on desktop */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            {/* Mobile logo */}
            <div className="md:hidden flex items-center gap-2">
              <Image src="/eyeguard-logo.svg" alt="EyeGuard" width={26} height={26} />
              <span className="text-sm font-bold text-foreground">EyeGuard</span>
            </div>
          </div>

          {/* Right — notification bell */}
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        {/* ── Scrollable page content ── */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 pb-24 md:p-8 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
