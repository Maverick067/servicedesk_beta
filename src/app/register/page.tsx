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
import { Loader2, Building2, RefreshCw, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [formData, setFormData] = useState({
    tenantName: "",
    tenantSlug: "",
    tenantDomain: "",
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
      
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create organization");
      }

      alert(`Organization successfully created!\n\nYour login credentials:\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nPlease save these credentials!`);
      router.push("/login?message=registration-success");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        background: `
          radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.9) 70%),
          url('/images/gradient-background.jpg')
        `,
        backgroundSize: "auto, cover",
        backgroundPosition: "center, 15% center",
        backgroundRepeat: "no-repeat",
      }}
    >

      <Card
        className="max-w-md w-full hover-lift relative z-10"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-white/80" />
          </div>
          <CardTitle className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Registration
          </CardTitle>
          <CardDescription style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            Create a new organization and get access to the system
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName" className="text-sm font-medium text-white">
                  Organization Name *
                </Label>
                <Input
                  id="tenantName"
                  placeholder="Your company name"
                  value={formData.tenantName}
                  onChange={(e) => handleTenantSlugChange(e.target.value)}
                  className="py-3 text-white placeholder:text-white/40 focus:border-[#00CFFF] focus:ring-[#00CFFF] transition-all duration-300"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantSlug" className="text-sm font-medium text-white">
                  Organization Identifier *
                </Label>
                <Input
                  id="tenantSlug"
                  placeholder="company-slug"
                  value={formData.tenantSlug}
                  onChange={(e) =>
                    setFormData({ ...formData, tenantSlug: e.target.value })
                  }
                  className="py-3 text-white placeholder:text-white/40 focus:border-[#00CFFF] focus:ring-[#00CFFF] transition-all duration-300"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                  Used in URL. Only lowercase letters, numbers, and hyphens
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantDomain" className="text-sm font-medium text-white">
                  Domain (optional)
                </Label>
                <Input
                  id="tenantDomain"
                  placeholder="company.com"
                  value={formData.tenantDomain}
                  onChange={(e) =>
                    setFormData({ ...formData, tenantDomain: e.target.value })
                  }
                  className="py-3 text-white placeholder:text-white/40 focus:border-[#00CFFF] focus:ring-[#00CFFF] transition-all duration-300"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div
                  className="text-sm p-3 rounded-md"
                  style={{
                    color: "#FF6B6B",
                    background: "rgba(255, 107, 107, 0.1)",
                    border: "1px solid rgba(255, 107, 107, 0.3)",
                  }}
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full ripple-effect hover-lift font-bold py-5 transition-all duration-300 border-none hover:shadow-[0_0_10px_rgba(0,207,255,0.4)]"
                style={{
                  background: "linear-gradient(90deg, #007BFF, #00CFFF)",
                  color: "#FFFFFF",
                }}
                disabled={isLoading}
              >
                Next
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-white">
                  Your Name *
                </Label>
                <Input
                  id="name"
                  placeholder="First Last"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="py-3 text-white placeholder:text-white/40 focus:border-[#00CFFF] focus:ring-[#00CFFF] transition-all duration-300"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-white">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="py-3 text-white placeholder:text-white/40 focus:border-[#00CFFF] focus:ring-[#00CFFF] transition-all duration-300"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-white">
                    Administrator Password *
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePassword}
                    className="transition-all hover:bg-white/10 text-white"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
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
                    className="py-3 text-white placeholder:text-white/40 focus:border-[#00CFFF] focus:ring-[#00CFFF] transition-all duration-300 pr-10"
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                    }}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-white/60 hover:text-white"
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
                <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                  Password will be automatically generated. You can change it or use the generated one.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-white">
                  Confirm Password *
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className="py-3 text-white placeholder:text-white/40 focus:border-[#00CFFF] focus:ring-[#00CFFF] transition-all duration-300"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div
                  className="text-sm p-3 rounded-md"
                  style={{
                    color: "#FF6B6B",
                    background: "rgba(255, 107, 107, 0.1)",
                    border: "1px solid rgba(255, 107, 107, 0.3)",
                  }}
                >
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 transition-all hover:bg-white/10 text-white"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                  }}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 ripple-effect hover-lift font-bold transition-all duration-300 border-none hover:shadow-[0_0_10px_rgba(0,207,255,0.4)]"
                  style={{
                    background: "linear-gradient(90deg, #007BFF, #00CFFF)",
                    color: "#FFFFFF",
                  }}
                >
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

          <div className="text-center pt-4" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
              Already have an account?{" "}
              <Button
                variant="link"
                onClick={() => router.push("/login")}
                className="p-0 h-auto transition-colors duration-300 hover:text-[#4FC3F7]"
                style={{ color: "#00CFFF" }}
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
