"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Ticket, CheckCircle2, Clock, AlertCircle, TrendingUp, Users, Calendar, BarChart3, Download, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCharts } from "@/components/dashboard/stats-charts";
// import { ExportDialog } from "@/components/reports/export-dialog";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Super-admin works with support tickets, others with regular tickets
        const isSuperAdmin = session?.user.role === "ADMIN" && !session?.user.tenantId;
        const endpoint = isSuperAdmin ? "/api/support-tickets" : "/api/tickets";
        
        const response = await fetch(endpoint);
        const tickets = await response.json();

        setStats({
          totalTickets: tickets.length,
          openTickets: tickets.filter((t: any) => t.status === "OPEN").length,
          inProgressTickets: tickets.filter((t: any) => t.status === "IN_PROGRESS").length,
          resolvedTickets: tickets.filter((t: any) => t.status === "RESOLVED" || t.status === "CLOSED").length,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (session) {
      fetchStats();
    }
  }, [session]);

  const canViewAnalytics = session?.user.role === "TENANT_ADMIN" || session?.user.role === "ADMIN" || session?.user.role === "AGENT";
  const isSuperAdmin = session?.user.role === "ADMIN" && !session?.user.tenantId;

  const statCards = [
    {
      title: isSuperAdmin ? "Support Tickets" : "My Tickets",
      value: stats.totalTickets,
      icon: isSuperAdmin ? HelpCircle : Ticket,
      gradient: "from-blue-500 to-cyan-500",
      iconBg: "bg-gradient-to-br from-blue-500/10 to-cyan-500/10",
      iconColor: "text-blue-600",
    },
    {
      title: "Open",
      value: stats.openTickets,
      icon: AlertCircle,
      gradient: "from-orange-500 to-red-500",
      iconBg: "bg-gradient-to-br from-orange-500/10 to-red-500/10",
      iconColor: "text-orange-600",
    },
    {
      title: "In Progress",
      value: stats.inProgressTickets,
      icon: Clock,
      gradient: "from-yellow-500 to-amber-500",
      iconBg: "bg-gradient-to-br from-yellow-500/10 to-amber-500/10",
      iconColor: "text-yellow-600",
    },
    {
      title: "Resolved",
      value: stats.resolvedTickets,
      icon: CheckCircle2,
      gradient: "from-green-500 to-emerald-500",
      iconBg: "bg-gradient-to-br from-green-500/10 to-emerald-500/10",
      iconColor: "text-green-600",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  const handleCardClick = () => {
    if (isSuperAdmin) {
      router.push("/admin/support-tickets");
    } else {
      router.push("/dashboard/tickets");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Section with Gradient - Адаптивный */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4 sm:p-6 md:p-8 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">
            Welcome, {session?.user.name || "User"}! 👋
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-white/90">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {/* Decorative blobs - hidden on mobile */}
        <div className="hidden sm:block absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mb-32 -mr-32"></div>
        <div className="hidden sm:block absolute top-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mt-24 -ml-24"></div>
      </motion.div>

      {/* Tabs for Overview and Analytics - Responsive */}
      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Overview</span>
            <span className="xs:hidden">📊</span>
          </TabsTrigger>
          {canViewAnalytics && (
            <TabsTrigger value="analytics" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Analytics</span>
              <span className="xs:hidden">📈</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          {/* Stats Cards with Animation - Responsive grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4"
          >
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.title} variants={itemVariants}>
                  <Card 
                    onClick={handleCardClick}
                    className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-1 cursor-pointer group touch-manipulation active:scale-95"
                  >
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                    
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                      <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${stat.iconBg} backdrop-blur-sm transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className={`h-3 w-3 sm:h-5 sm:w-5 ${stat.iconColor}`} />
                      </div>
                    </CardHeader>
                    
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                        {isLoading ? (
                          <div className="h-6 sm:h-8 md:h-9 w-12 sm:w-14 md:w-16 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                          >
                            {stat.value}
                          </motion.span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current status
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Quick Actions Cards - Responsive grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3"
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-1 cursor-pointer group touch-manipulation active:scale-95">
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg group-hover:text-blue-600 transition-colors">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 sm:pb-6">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Track your ticket dynamics
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-1 cursor-pointer group touch-manipulation active:scale-95">
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg group-hover:text-purple-600 transition-colors">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </div>
                  {isSuperAdmin ? "Platform" : "Team"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 sm:pb-6">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isSuperAdmin ? "Manage all organizations" : (session?.user.tenant?.name || "Your organization")}
                </p>
              </CardContent>
            </Card>

            <Card 
              onClick={handleCardClick}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-1 cursor-pointer group touch-manipulation active:scale-95"
            >
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg group-hover:text-green-600 transition-colors">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  Today
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 sm:pb-6">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {stats.openTickets} {isSuperAdmin ? "requests" : "open tickets"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {canViewAnalytics && (
          <TabsContent value="analytics">
            <StatsCharts />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
