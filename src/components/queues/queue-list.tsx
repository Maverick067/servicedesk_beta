"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

interface Queue {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  priority: number;
  isActive: boolean;
  _count: {
    tickets: number;
  };
}

export function QueueList() {
  const router = useRouter();
  const { data: session } = useSession();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canManage = session?.user.role === "TENANT_ADMIN" || session?.user.role === "ADMIN";

  useEffect(() => {
    async function fetchQueues() {
      try {
        const response = await fetch("/api/queues");
        const data = await response.json();
        setQueues(data);
      } catch (error) {
        console.error("Error fetching queues:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchQueues();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту очередь?")) {
      return;
    }

    try {
      const response = await fetch(`/api/queues/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete queue");
      }

      setQueues(queues.filter((q) => q.id !== id));
    } catch (error) {
      console.error("Error deleting queue:", error);
      alert("Не удалось удалить очередь");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (queues.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Нет очередей</p>
          {canManage && (
            <p className="text-sm text-muted-foreground mt-2">
              Создайте первую очередь для организации тикетов
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {queues.map((queue, index) => (
        <motion.div
          key={queue.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <Card
            className={`cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 overflow-hidden group relative ${
              !queue.isActive ? "opacity-60" : ""
            }`}
            style={{ borderLeftColor: queue.color }}
            onClick={() => router.push(`/dashboard/tickets?queue=${queue.id}`)}
          >
            <div
              className="absolute inset-0 bg-gradient-to-br opacity-5"
              style={{
                backgroundImage: `linear-gradient(135deg, ${queue.color} 0%, ${queue.color}88 100%)`,
              }}
            ></div>
            <CardHeader className="pb-3 relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${queue.color}20` }}
                    >
                      <Inbox className="h-4 w-4" style={{ color: queue.color }} />
                    </div>
                    {!queue.isActive && (
                      <Badge variant="outline" className="text-xs">
                        Неактивна
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                    {queue.name}
                  </CardTitle>
                  {queue.description && (
                    <CardDescription className="mt-2 line-clamp-2">
                      {queue.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="font-medium"
                    style={{
                      backgroundColor: `${queue.color}20`,
                      color: queue.color,
                    }}
                  >
                    {queue._count.tickets} тикетов
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Приоритет: {queue.priority}
                  </Badge>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/queues/${queue.id}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(queue.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

