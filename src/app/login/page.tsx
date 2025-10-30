"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
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
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setError("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOLogin = async (provider: string) => {
    setIsSSOLoading(provider);
    setError("");
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (error) {
      setError(`Login error via ${provider}`);
      setIsSSOLoading(null);
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
          <CardTitle className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Welcome Back
          </CardTitle>
          <CardDescription style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            Sign in to your account to manage tickets
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-white">
                Email Address
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
              <Label htmlFor="password" className="text-sm font-medium text-white">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
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

            <Button
              type="submit"
              className="w-full ripple-effect hover-lift font-bold py-5 transition-all duration-300 border-none hover:shadow-[0_0_10px_rgba(0,207,255,0.4)]"
              style={{
                background: "linear-gradient(90deg, #007BFF, #00CFFF)",
                color: "#FFFFFF",
              }}
              disabled={isLoading || isSSOLoading !== null}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* SSO Section */}
          {(process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" ||
            process.env.NEXT_PUBLIC_AZURE_AD_ENABLED === "true") && (
            <>
              <div className="relative">
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
                  <Button
                    variant="outline"
                    onClick={() => handleSSOLogin("google")}
                    className="w-full hover-lift transition-all duration-300 text-white hover:bg-white/10"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                    disabled={isLoading || isSSOLoading !== null}
                  >
                    {isSSOLoading === "google" ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 2.43-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                )}

                {process.env.NEXT_PUBLIC_AZURE_AD_ENABLED === "true" && (
                  <Button
                    variant="outline"
                    onClick={() => handleSSOLogin("azure-ad")}
                    className="w-full hover-lift transition-all duration-300 text-white hover:bg-white/10"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                    disabled={isLoading || isSSOLoading !== null}
                  >
                    {isSSOLoading === "azure-ad" ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <svg
                        className="mr-2 h-5 w-5"
                        viewBox="0 0 23 23"
                        fill="currentColor"
                      >
                        <path d="M0 0h11v11H0zm12 0h11v11H12zM0 12h11v11H0zm12 0h11v11H12z" />
                      </svg>
                    )}
                    Continue with Microsoft
                  </Button>
                )}
              </div>
            </>
          )}

          <div className="text-center pt-4" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
              Don't have an account?
            </p>
            <Button
              variant="link"
              onClick={() => router.push("/register")}
              className="p-0 h-auto transition-colors duration-300 hover:text-[#4FC3F7]"
              style={{ color: "#00CFFF" }}
            >
              Create organization
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
