"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useModules } from "@/hooks/use-modules";
import type { FeatureFlag } from "@/lib/feature-flags";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ModuleGuardProps {
  module: FeatureFlag;
  children: React.ReactNode;
  moduleName?: string;
}

/**
 * Component for protecting module pages
 * Checks if module is enabled for tenant and redirects to dashboard if not
 */
export function ModuleGuard({ module, children, moduleName }: ModuleGuardProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isModuleEnabled, isLoading: modulesLoading } = useModules();

  // Check module access
  useEffect(() => {
    // Wait for session and modules to load
    if (status === "loading" || modulesLoading) {
      return;
    }

    // If not authorized, redirect to login
    if (!session?.user) {
      router.replace("/login");
      return;
    }

    // Global ADMIN has access to all modules
    if (session.user.role === "ADMIN" && !session.user.tenantId) {
      return;
    }

    // Check if module is enabled
    if (!isModuleEnabled(module)) {
      router.replace("/dashboard");
    }
  }, [session, status, modulesLoading, module, isModuleEnabled, router]);

  // Show loader during loading
  if (status === "loading" || modulesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authorized, don't show content
  if (!session?.user) {
    return null;
  }

  // Global ADMIN sees everything
  if (session.user.role === "ADMIN" && !session.user.tenantId) {
    return <>{children}</>;
  }

  // If module not enabled, show placeholder (while redirecting)
  if (!isModuleEnabled(module)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Module Unavailable</CardTitle>
            <CardDescription>
              {moduleName ? `Module "${moduleName}" is disabled` : "This module is disabled"} for your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Module enabled, show content
  return <>{children}</>;
}

