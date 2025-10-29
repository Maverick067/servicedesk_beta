"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface DashboardStats {
  overview: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    pending: number;
    avgResolutionHours: number;
  };
  priorities: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    URGENT: number;
  };
  dailyTrend: Array<{
    date: string;
    created: number;
    resolved: number;
  }>;
  categories: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  queues: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

const PRIORITY_COLORS = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  URGENT: "#dc2626",
};

export function StatsCharts() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/dashboard/stats?period=${period}`);
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
  }, [period]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Failed to load statistics
        </CardContent>
      </Card>
    );
  }

  // Prepare data for priority chart
  const priorityData = [
    { name: "Low", value: stats.priorities.LOW, color: PRIORITY_COLORS.LOW },
    { name: "Medium", value: stats.priorities.MEDIUM, color: PRIORITY_COLORS.MEDIUM },
    { name: "High", value: stats.priorities.HIGH, color: PRIORITY_COLORS.HIGH },
    { name: "Urgent", value: stats.priorities.URGENT, color: PRIORITY_COLORS.URGENT },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics & Reports</h2>
          <p className="text-muted-foreground mt-1">
            Ticket data visualization
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Последние 7 дней</SelectItem>
            <SelectItem value="30d">Последние 30 дней</SelectItem>
            <SelectItem value="90d">Последние 90 дней</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ключевые метрики */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Всего тикетов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats.overview.total}
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                за выбранный период
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Решено тикетов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.overview.resolved}
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {stats.overview.total > 0 
                  ? `${Math.round((stats.overview.resolved / stats.overview.total) * 100)}% от общего числа`
                  : "0% от общего числа"
                }
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Среднее время решения
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {stats.overview.avgResolutionHours}ч
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                для решенных тикетов
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Графики */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Тренд по дням */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Динамика тикетов</CardTitle>
              <CardDescription>Созданные и решенные тикеты по дням</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="created" 
                    stroke="#3b82f6" 
                    name="Создано"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resolved" 
                    stroke="#10b981" 
                    name="Решено"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Приоритеты */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Распределение по приоритетам</CardTitle>
              <CardDescription>Количество тикетов по уровням приоритета</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Категории */}
        {stats.categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Топ-5 категорий</CardTitle>
                <CardDescription>Самые активные категории</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.categories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Тикетов">
                      {stats.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Очереди */}
        {stats.queues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Топ-5 очередей</CardTitle>
                <CardDescription>Самые загруженные очереди</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.queues}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Тикетов">
                      {stats.queues.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

