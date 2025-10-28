"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, RefreshCw, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [formData, setFormData] = useState({
    // Данные организации
    tenantName: "",
    tenantSlug: "",
    tenantDomain: "",
    // Данные пользователя
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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
    setFormData({ ...formData, password: password, confirmPassword: password });
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantName || !formData.tenantSlug) {
      setError("Fill in all fields");
      return;
    }
    // Автоматически генерируем пароль при переходе на шаг 2
    generatePassword();
    setStep(2);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const requestData = {
        tenantName: formData.tenantName,
        tenantSlug: formData.tenantSlug,
        tenantDomain: formData.tenantDomain || null,
        name: formData.name,
        email: formData.email,
        password: formData.password,
      };
      
      console.log("Sending registration data:", requestData);
      
      // Создаем организацию и пользователя через единый API
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create organization");
      }

      // Показываем уведомление с паролем
      alert(`Organization successfully created!\n\nYour login credentials:\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nPlease save these credentials!`);

      // Перенаправляем на страницу входа
      router.push("/login?message=registration-success");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-center">
            Registration
          </CardTitle>
          <CardDescription className="text-center">
            Create a new organization and get access to the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Organization Name *</Label>
                <Input
                  id="tenantName"
                  placeholder="Your company name"
                  value={formData.tenantName}
                  onChange={(e) => handleTenantSlugChange(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantSlug">Organization Identifier *</Label>
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
                  Used in URL. Only lowercase letters, numbers, and hyphens
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantDomain">Domain (optional)</Label>
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
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                Next
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  placeholder="First Last"
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
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Administrator Password *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePassword}
                    disabled={isLoading}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Generate
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
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
                  Password will be automatically generated. You can change it or use the generated one.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  disabled={isLoading}
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Organization"
                  )}
                </Button>
              </div>
            </form>
          )}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Button
                variant="link"
                onClick={() => router.push("/login")}
                className="p-0 h-auto"
              >
                Sign In
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
