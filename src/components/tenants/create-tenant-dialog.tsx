"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2 } from "lucide-react";

export function CreateTenantDialog() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    domain: "",
  });

  // Проверяем, что пользователь - админ
  useEffect(() => {
    if (status === "loading") return; // Ждем загрузки сессии
    
    if (!session || session.user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  const handleSlugChange = (value: string) => {
    // Автоматически генерируем slug из названия
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Убираем спецсимволы
      .replace(/\s+/g, "-") // Заменяем пробелы на дефисы
      .replace(/-+/g, "-") // Убираем повторяющиеся дефисы
      .trim();
    
    setFormData({ ...formData, name: value, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          domain: formData.domain || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create tenant");
      }

      router.push("/dashboard/tenants");
      router.refresh();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Создать новую организацию</CardTitle>
          <CardDescription>
            Добавьте новую организацию в систему
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название организации *</Label>
            <Input
              id="name"
              placeholder="Название компании"
              value={formData.name}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (идентификатор) *</Label>
            <Input
              id="slug"
              placeholder="company-slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Используется в URL. Только строчные буквы, цифры и дефисы
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Домен (опционально)</Label>
            <Input
              id="domain"
              placeholder="company.com"
              value={formData.domain}
              onChange={(e) =>
                setFormData({ ...formData, domain: e.target.value })
              }
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Домен для автоматического определения организации
            </p>
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
              "Создать организацию"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
