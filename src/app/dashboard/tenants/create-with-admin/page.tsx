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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Building2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function CreateTenantWithAdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [formData, setFormData] = useState({
    // Данные организации
    tenantName: "",
    tenantSlug: "",
    tenantDomain: "",
    // Данные админа
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  // Проверяем, что пользователь - админ
  useEffect(() => {
    if (status === "loading") return; // Ждем загрузки сессии
    
    if (!session || session.user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  const handleTenantSlugChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    
    setFormData({ ...formData, tenantName: value, tenantSlug: slug });
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
    setFormData({ ...formData, adminPassword: password });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const requestData = {
        tenantName: formData.tenantName,
        tenantSlug: formData.tenantSlug,
        tenantDomain: formData.tenantDomain || null,
        adminName: formData.adminName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
      };
      
      console.log("Sending tenant creation data:", requestData);
      
      const response = await fetch("/api/tenants/create-with-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create organization");
      }

      const result = await response.json();
      
      // Показываем уведомление с данными для входа
      alert(`Организация "${result.tenant.name}" успешно создана!\n\nДанные администратора:\nEmail: ${result.credentials.email}\nПароль: ${result.credentials.password}\n\nСохраните эти данные!`);

      toast.success("Организация и администратор успешно созданы!");
      router.push("/dashboard/tenants");
    } catch (error: any) {
      setError(error.message);
      toast.error("Ошибка создания организации", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-center">
            Создать организацию
          </CardTitle>
          <CardDescription className="text-center">
            Создайте новую организацию с автоматическим администратором
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Данные организации */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Данные организации</h3>
              
              <div className="space-y-2">
                <Label htmlFor="tenantName">Название организации *</Label>
                <Input
                  id="tenantName"
                  placeholder="Название вашей компании"
                  value={formData.tenantName}
                  onChange={(e) => handleTenantSlugChange(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tenantSlug">Идентификатор организации *</Label>
                <Input
                  id="tenantSlug"
                  placeholder="company-slug"
                  value={formData.tenantSlug}
                  onChange={(e) =>
                    setFormData({ ...formData, tenantSlug: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Используется в URL. Только строчные буквы, цифры и дефисы
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tenantDomain">Домен (опционально)</Label>
                <Input
                  id="tenantDomain"
                  placeholder="company.com"
                  value={formData.tenantDomain}
                  onChange={(e) =>
                    setFormData({ ...formData, tenantDomain: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Данные администратора */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Данные администратора</h3>
              
              <div className="space-y-2">
                <Label htmlFor="adminName">Имя администратора *</Label>
                <Input
                  id="adminName"
                  placeholder="Имя Фамилия"
                  value={formData.adminName}
                  onChange={(e) =>
                    setFormData({ ...formData, adminName: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email администратора *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@company.com"
                  value={formData.adminEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, adminEmail: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="adminPassword">Пароль администратора *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePassword}
                    disabled={isLoading}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Сгенерировать
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="adminPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.adminPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, adminPassword: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Пароль будет автоматически сгенерирован. Вы можете изменить его или использовать сгенерированный.
                </p>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/tenants")}
                disabled={isLoading}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  "Создать организацию"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
