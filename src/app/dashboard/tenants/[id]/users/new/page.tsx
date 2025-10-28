"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";

export default function NewTenantUserPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
  });

  // Проверяем, что пользователь - админ или tenant админ
  useEffect(() => {
    if (status === "loading") return; // Ждем загрузки сессии
    
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TENANT_ADMIN")) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    async function fetchTenant() {
      try {
        const response = await fetch(`/api/tenants/${params.id}`);
        if (response.ok) {
          const tenant = await response.json();
          setTenantName(tenant.name);
        }
      } catch (error) {
        console.error("Error fetching tenant:", error);
      }
    }

    if (params.id) {
      fetchTenant();
    }
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/tenants/${params.id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create user");
      }

      router.push(`/dashboard/tenants/${params.id}/users`);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Добавить пользователя</h1>
          <p className="text-muted-foreground mt-2">
            {tenantName && `Добавить пользователя в "${tenantName}"`}
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Данные пользователя</CardTitle>
            <CardDescription>
              Создайте нового пользователя для организации
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя пользователя *</Label>
              <Input
                id="name"
                placeholder="Имя Фамилия"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Роль *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Пользователь</SelectItem>
                  <SelectItem value="AGENT">Агент</SelectItem>
                  {session?.user.role === "ADMIN" && (
                    <SelectItem value="TENANT_ADMIN">Администратор организации</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                "Создать пользователя"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
