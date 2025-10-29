"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Info } from "lucide-react";
import { toast } from "sonner";
import { ModuleGuard } from "@/components/module-guard";

export default function SSOSettingsPage() {
  return (
    <ModuleGuard module="ldap" moduleName="SSO">
      <SSOSettingsPageContent />
    </ModuleGuard>
  );
}

function SSOSettingsPageContent() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    ssoEnabled: false,
    ssoProvider: "google", // 'google' | 'azure-ad' | 'okta'
    googleClientId: "",
    googleClientSecret: "",
    azureAdClientId: "",
    azureAdClientSecret: "",
    azureAdTenantId: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/tenants/settings/sso");
      if (response.ok) {
        const data = await response.json();
        setSettings(data || settings);
      }
    } catch (error) {
      toast.error("Error loading SSO settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/tenants/settings/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("SSO settings saved");
        fetchSettings();
      } else {
        const error = await response.json();
        toast.error(error.message || "Error saving settings");
      }
    } catch (error) {
      toast.error("Error saving SSO settings");
    } finally {
      setSaving(false);
    }
  };

  if (session?.user.role !== "TENANT_ADMIN" && session?.user.role !== "ADMIN") {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Only organization administrators can manage SSO settings.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SSO Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure Single Sign-On (SSO) for your organization
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          SSO is available only for PRO and ENTERPRISE plans. After configuration,
          users will be able to sign in through corporate accounts.
        </AlertDescription>
      </Alert>

      {/* Main settings */}
      <Card>
        <CardHeader>
          <CardTitle>Main Settings</CardTitle>
          <CardDescription>
            Enable SSO and select authentication provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable SSO</Label>
              <p className="text-sm text-muted-foreground">
                Allow sign in through external providers
              </p>
            </div>
            <Switch
              checked={settings.ssoEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, ssoEnabled: checked })
              }
            />
          </div>

          {settings.ssoEnabled && (
            <div className="space-y-2">
              <Label htmlFor="ssoProvider">SSO Provider</Label>
              <Select
                value={settings.ssoProvider}
                onValueChange={(value) =>
                  setSettings({ ...settings, ssoProvider: value })
                }
              >
                <SelectTrigger id="ssoProvider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google Workspace</SelectItem>
                  <SelectItem value="azure-ad">Microsoft Azure AD</SelectItem>
                  <SelectItem value="okta">Okta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Settings */}
      {settings.ssoEnabled && settings.ssoProvider === "google" && (
        <Card>
          <CardHeader>
            <CardTitle>Google Workspace Settings</CardTitle>
            <CardDescription>
              Configure OAuth application in Google Cloud Console
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="googleClientId">Client ID</Label>
              <Input
                id="googleClientId"
                type="text"
                placeholder="xxxxxx.apps.googleusercontent.com"
                value={settings.googleClientId}
                onChange={(e) =>
                  setSettings({ ...settings, googleClientId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleClientSecret">Client Secret</Label>
              <Input
                id="googleClientSecret"
                type="password"
                placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxx"
                value={settings.googleClientSecret}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    googleClientSecret: e.target.value,
                  })
                }
              />
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Callback URL:</strong> {process.env.NEXT_PUBLIC_URL ||
                  "http://localhost:3000"}/api/auth/callback/google
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Azure AD Settings */}
      {settings.ssoEnabled && settings.ssoProvider === "azure-ad" && (
        <Card>
          <CardHeader>
            <CardTitle>Microsoft Azure AD Settings</CardTitle>
            <CardDescription>
              Configure application in Azure Active Directory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="azureAdClientId">Application (client) ID</Label>
              <Input
                id="azureAdClientId"
                type="text"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={settings.azureAdClientId}
                onChange={(e) =>
                  setSettings({ ...settings, azureAdClientId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="azureAdClientSecret">Client Secret</Label>
              <Input
                id="azureAdClientSecret"
                type="password"
                placeholder="xxxxxxxxxxxxxxxxxxxxx"
                value={settings.azureAdClientSecret}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    azureAdClientSecret: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="azureAdTenantId">Directory (tenant) ID</Label>
              <Input
                id="azureAdTenantId"
                type="text"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={settings.azureAdTenantId}
                onChange={(e) =>
                  setSettings({ ...settings, azureAdTenantId: e.target.value })
                }
              />
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Redirect URI:</strong> {process.env.NEXT_PUBLIC_URL ||
                  "http://localhost:3000"}/api/auth/callback/azure-ad
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

