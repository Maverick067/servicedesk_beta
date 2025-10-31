"use client";

import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <SessionProvider>
      <div className="min-h-screen" style={{ background: '#0f172a' }}>
        <DashboardHeader 
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} 
          mobileMenuOpen={mobileMenuOpen}
        />
        <div className="flex">
          <DashboardSidebar 
            mobileMenuOpen={mobileMenuOpen} 
            onClose={() => setMobileMenuOpen(false)}
          />
          <main className="flex-1 p-3 sm:p-6 w-full overflow-x-hidden">{children}</main>
        </div>
        
        {/* Overlay for mobile menu */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </div>
    </SessionProvider>
  );
}

