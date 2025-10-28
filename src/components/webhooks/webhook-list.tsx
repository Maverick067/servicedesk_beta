"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Webhook, Play, Pause } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  successCount: number;
  failureCount: number;
}

export function WebhookList() {
  const { data: session } = useSession();
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWebhooks = async () => {
    if (!session?.user?.tenantId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/webhooks`);
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data);
      }
    } catch (e: any) {
      toast.error("Ошибка при загрузке webhooks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, [session]);

  const handleToggle = async (webhook: WebhookItem) => {
    try {
      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !webhook.isActive }),
      });
      if (response.ok) {
        toast.success(webhook.isActive ? "Webhook деактивирован" : "Webhook активирован");
        fetchWebhooks();
      }
    } catch (e: any) {
      toast.error("Ошибка");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить webhook?")) return;
    try {
      const response = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Webhook удалён");
        fetchWebhooks();
      }
    } catch (e: any) {
      toast.error("Ошибка при удалении");
    }
  };

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  if (webhooks.length === 0) {
    return (
      <div className="text-center py-8">
        <Webhook className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Webhooks не настроены</h3>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Название</TableHead>
          <TableHead>URL</TableHead>
          <TableHead>События</TableHead>
          <TableHead>Успешно</TableHead>
          <TableHead>Ошибок</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {webhooks.map((webhook) => (
          <TableRow key={webhook.id}>
            <TableCell className="font-medium">{webhook.name}</TableCell>
            <TableCell className="font-mono text-sm">{webhook.url}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {webhook.events.slice(0, 2).map((event) => (
                  <Badge key={event} variant="outline" className="text-xs">{event}</Badge>
                ))}
                {webhook.events.length > 2 && <Badge variant="outline" className="text-xs">+{webhook.events.length - 2}</Badge>}
              </div>
            </TableCell>
            <TableCell><Badge variant="secondary">{webhook.successCount}</Badge></TableCell>
            <TableCell><Badge variant={webhook.failureCount > 0 ? "destructive" : "outline"}>{webhook.failureCount}</Badge></TableCell>
            <TableCell><Badge variant={webhook.isActive ? "default" : "outline"}>{webhook.isActive ? "Активен" : "Неактивен"}</Badge></TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleToggle(webhook)}>
                    {webhook.isActive ? <><Pause className="mr-2 h-4 w-4" />Деактивировать</> : <><Play className="mr-2 h-4 w-4" />Активировать</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(webhook.id)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

