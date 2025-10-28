"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  Ticket, 
  Activity,
  Shield,
  Database,
  TrendingUp,
  Settings
} from "lucide-react";

interface AdminStats {
  totalTenants: number;
  totalUsers: number;
  totalTickets: number;
  totalAgents: number;
  activeTenants: number;
  recentActivity: any[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    
    // Only for global admins
    if (!session || session.user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session || session.user.role !== "ADMIN") return;

    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/stats");
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [session]);

  if (status === "loading" || isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-muted-foreground mt-2">
              Global system management
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Organizations",
      value: stats?.totalTenants || 0,
      icon: <Building2 className="h-8 w-8 text-blue-600" />,
      description: `${stats?.activeTenants || 0} active`,
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: <Users className="h-8 w-8 text-green-600" />,
      description: `${stats?.totalAgents || 0} agents`,
      color: "from-green-500 to-green-600"
    },
    {
      title: "Total Tickets",
      value: stats?.totalTickets || 0,
      icon: <Ticket className="h-8 w-8 text-purple-600" />,
      description: "All time",
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "System",
      value: "Online",
      icon: <Activity className="h-8 w-8 text-emerald-600" />,
      description: "All services operational",
      color: "from-emerald-500 to-emerald-600"
    }
  ];

  const adminActions = [
    {
      title: "Support Tickets",
      description: "Requests from organization administrators",
      icon: <Activity className="h-10 w-10" />,
      href: "/admin/support-tickets",
      color: "from-red-500 to-orange-600"
    },
    {
      title: "Manage Organizations",
      description: "View, edit and delete tenants",
      icon: <Building2 className="h-10 w-10" />,
      href: "/admin/organizations",
      color: "from-blue-500 to-blue-600"
    },
    {
      title: "Organization Groups",
      description: "Group organizations for joint management",
      icon: <Users className="h-10 w-10" />,
      href: "/admin/tenant-groups",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      title: "Manage Modules",
      description: "Enable and disable features for tenants",
      icon: <Settings className="h-10 w-10" />,
      href: "/admin/modules",
      color: "from-purple-500 to-purple-600"
    },
    {
      title: "Tenant Administrators",
      description: "Manage organization administrators",
      icon: <Users className="h-10 w-10" />,
      href: "/admin/users",
      color: "from-green-500 to-green-600"
    },
    {
      title: "System & Database",
      description: "Monitoring, backups and technical information",
      icon: <Database className="h-10 w-10" />,
      href: "/admin/system",
      color: "from-orange-500 to-orange-600"
    }
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="h-10 w-10 text-red-600" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Global ServiceDesk platform management
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-2 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Administrative Functions
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {adminActions.map((action, index) => (
            <Card 
              key={index} 
              className="border-2 hover:border-primary hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => router.push(action.href)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{action.title}</CardTitle>
                    <CardDescription className="text-base">
                      {action.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Go To →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Warning Notice */}
      <Card className="border-yellow-500 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Warning: Super-Administrator Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-700">
          You have full access to all system data and functions. All actions are logged in audit log.
          Please be careful when making changes.
        </CardContent>
      </Card>
    </div>
  );
}

