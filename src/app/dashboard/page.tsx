"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Ticket, CheckCircle2, Clock, AlertCircle, TrendingUp, Users, Calendar, BarChart3, Download } from "lucide-react";
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
        const response = await fetch("/api/tickets");
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

    fetchStats();
  }, []);

  const canViewAnalytics = session?.user.role === "TENANT_ADMIN" || session?.user.role === "ADMIN" || session?.user.role === "AGENT";

  const statCards = [
    {
      title: "Мои тикеты",
      value: stats.totalTickets,
      icon: Ticket,
      gradient: "from-blue-500 to-cyan-500",
      iconBg: "bg-gradient-to-br from-blue-500/10 to-cyan-500/10",
      iconColor: "text-blue-600",
    },
    {
      title: "Открытые",
      value: stats.openTickets,
      icon: AlertCircle,
      gradient: "from-orange-500 to-red-500",
      iconBg: "bg-gradient-to-br from-orange-500/10 to-red-500/10",
      iconColor: "text-orange-600",
    },
    {
      title: "В работе",
      value: stats.inProgressTickets,
      icon: Clock,
      gradient: "from-yellow-500 to-amber-500",
      iconBg: "bg-gradient-to-br from-yellow-500/10 to-amber-500/10",
      iconColor: "text-yellow-600",
    },
    {
      title: "Решенные",
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

  return (
    <div className="space-y-8">
      {/* Hero Section with Gradient */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">
            Добро пожаловать, {session?.user.name || "Пользователь"}! 👋
          </h1>
          <p className="text-lg text-white/90">
            {new Date().toLocaleDateString("ru-RU", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {/* Decorative blobs */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mb-32 -mr-32"></div>
        <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mt-24 -ml-24"></div>
      </motion.div>

      {/* Tabs for Overview and Analytics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Обзор
          </TabsTrigger>
          {canViewAnalytics && (
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Аналитика
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards with Animation */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.title} variants={itemVariants}>
                  <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                    
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <div className={`p-3 rounded-xl ${stat.iconBg} backdrop-blur-sm transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {isLoading ? (
                          <div className="h-9 w-16 bg-gray-200 animate-pulse rounded"></div>
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
                        Текущее состояние
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Quick Actions Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid gap-6 md:grid-cols-3"
          >
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                  <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  Активность
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Отслеживайте динамику ваших тикетов
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 group-hover:text-purple-600 transition-colors">
                  <div className="p-2 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  Команда
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {session?.user.tenant?.name || "Ваша организация"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 group-hover:text-green-600 transition-colors">
                  <div className="p-2 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  Сегодня
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {stats.openTickets} открытых тикетов
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
