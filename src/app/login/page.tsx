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
import { Loader2, Mail } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">
            ServiceDesk
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your account to manage tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
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
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading || isSSOLoading !== null}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* SSO Divider */}
          {(process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" ||
            process.env.NEXT_PUBLIC_AZURE_AD_ENABLED === "true") && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or sign in with
                  </span>
                </div>
              </div>

              {/* SSO Buttons */}
              <div className="space-y-2">
                {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isLoading || isSSOLoading !== null}
                    onClick={() => handleSSOLogin("google")}
                  >
                    {isSSOLoading === "google" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Google
                  </Button>
                )}

                {process.env.NEXT_PUBLIC_AZURE_AD_ENABLED === "true" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isLoading || isSSOLoading !== null}
                    onClick={() => handleSSOLogin("azure-ad")}
                  >
                    {isSSOLoading === "azure-ad" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg
                        className="mr-2 h-4 w-4"
                        viewBox="0 0 23 23"
                        fill="currentColor"
                      >
                        <path d="M0 0h11v11H0zm12 0h11v11H12zM0 12h11v11H0zm12 0h11v11H12z" />
                      </svg>
                    )}
                    Microsoft
                  </Button>
                )}
              </div>
            </>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Demo credentials:</p>
            <p className="mt-1">
              <strong>Admin:</strong> admin@demo.com / admin123
            </p>
            <p>
              <strong>Agent:</strong> agent@demo.com / agent123
            </p>
            <p>
              <strong>User:</strong> user@demo.com / user123
            </p>
            <div className="mt-4 pt-4 border-t">
              <p>Don't have an account?</p>
              <Button
                variant="link"
                onClick={() => router.push("/register")}
                className="p-0 h-auto"
              >
                Create organization
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

