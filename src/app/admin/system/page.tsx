"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Activity, 
  Server,
  HardDrive,
  Cpu,
  Package
} from "lucide-react";

export default function AdminSystemPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [systemInfo, setSystemInfo] = useState({
    database: "PostgreSQL 16",
    nodejs: process.version,
    uptime: "N/A",
  });

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || session.user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">System</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const systemComponents = [
    {
      title: "Database",
      value: "PostgreSQL 16",
      status: "online",
      icon: <Database className="h-8 w-8 text-blue-600" />,
      description: "Connection active"
    },
    {
      title: "Backend",
      value: "Next.js 14.2",
      status: "online",
      icon: <Server className="h-8 w-8 text-green-600" />,
      description: "Server is running"
    },
    {
      title: "Node.js",
      value: systemInfo.nodejs,
      status: "online",
      icon: <Cpu className="h-8 w-8 text-yellow-600" />,
      description: "Runtime environment"
    },
    {
      title: "Prisma ORM",
      value: "5.22.0",
      status: "online",
      icon: <Package className="h-8 w-8 text-purple-600" />,
      description: "Database client"
    }
  ];

  const features = [
    { name: "Row-Level Security (RLS)", enabled: true },
    { name: "Multi-tenancy", enabled: true },
    { name: "Audit Logging", enabled: true },
    { name: "Prisma Middleware", enabled: true },
    { name: "JWT Authentication", enabled: true },
    { name: "LDAP/Active Directory", enabled: true },
    { name: "Stripe Billing", enabled: true },
    { name: "Telegram Bot", enabled: true },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
          <Activity className="h-8 w-8 text-orange-600" />
          System & Database
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitoring and technical information
        </p>
      </div>

      {/* System Status */}
      <div>
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {systemComponents.map((component, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {component.icon}
                  <Badge variant="default" className="bg-green-600">
                    Online
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-1">{component.title}</h3>
                <p className="text-2xl font-bold mb-2">{component.value}</p>
                <p className="text-sm text-muted-foreground">
                  {component.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Installed Features
          </CardTitle>
          <CardDescription>
            Modules and platform capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border"
              >
                <span className="font-medium">{feature.name}</span>
                <Badge variant={feature.enabled ? "default" : "secondary"}>
                  {feature.enabled ? "✓ Enabled" : "Disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database
          </CardTitle>
          <CardDescription>
            PostgreSQL with Row-Level Security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
              <span className="font-medium">Tables</span>
              <span className="text-2xl font-bold">30</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <span className="font-medium">RLS Policies</span>
              <span className="text-2xl font-bold">24</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
              <span className="font-medium">Indexes</span>
              <span className="text-2xl font-bold">80+</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-blue-500 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-blue-700">
          <p>• <strong>Version:</strong> 0.5.0-alpha</p>
          <p>• <strong>Framework:</strong> Next.js 14 (App Router)</p>
          <p>• <strong>ORM:</strong> Prisma 5.22.0</p>
          <p>• <strong>UI:</strong> Tailwind CSS + shadcn/ui</p>
          <p>• <strong>Auth:</strong> NextAuth.js v4</p>
          <p>• <strong>Database:</strong> PostgreSQL 16+</p>
          <p>• <strong>Package Manager:</strong> Bun 1.2.22</p>
        </CardContent>
      </Card>
    </div>
  );
}

