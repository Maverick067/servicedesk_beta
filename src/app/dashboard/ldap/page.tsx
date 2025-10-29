"use client";

import { LdapConfigList } from "@/components/ldap/ldap-config-list";
import { SimpleADConfigDialog } from "@/components/ldap/simple-ad-config-dialog";
import { PageHeader, PageHeaderDescription, PageHeaderHeading } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlusCircle, Shield, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/module-guard";
import { useSession } from "next-auth/react";

export default function LdapPage() {
  const { data: session } = useSession();
  const isGlobalAdmin = session?.user.role === "ADMIN" && !session?.user.tenantId;

  return (
    <ModuleGuard module="ldap" moduleName="LDAP / SSO">
      <div className="container relative space-y-6">
        <PageHeader>
          <PageHeaderHeading className="flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Active Directory / LDAP
          </PageHeaderHeading>
          <PageHeaderDescription>
            Connect your corporate domain for single sign-on for employees
          </PageHeaderDescription>
        </PageHeader>

        {/* Warning for global admin */}
        {isGlobalAdmin && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> You are signed in as a global administrator. 
              To configure LDAP/Active Directory, you need to sign in as an organization administrator (TENANT_ADMIN).
              LDAP configuration is tied to the organization, not to the global admin.
            </AlertDescription>
          </Alert>
        )}

        {/* Info card */}
        {!isGlobalAdmin && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Connect Active Directory in 2 minutes! You only need the domain controller address, 
              domain name and administrator credentials. All technical parameters are configured automatically.
            </AlertDescription>
          </Alert>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What does connecting provide?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Single Sign-On</p>
                  <p className="text-xs text-muted-foreground">
                    Employees sign in with their Windows credentials
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Automatic Registration</p>
                  <p className="text-xs text-muted-foreground">
                    New users are created on first sign in
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Security</p>
                  <p className="text-xs text-muted-foreground">
                    Passwords are not stored, only read from AD
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection button */}
        <div className="flex justify-end">
          <SimpleADConfigDialog>
            <Button size="lg" disabled={isGlobalAdmin}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Connect Domain
            </Button>
          </SimpleADConfigDialog>
        </div>

        {/* Connections list */}
        <Suspense fallback={<Skeleton className="w-full h-[300px] rounded-lg" />}>
          <LdapConfigList />
        </Suspense>
      </div>
    </ModuleGuard>
  );
}

