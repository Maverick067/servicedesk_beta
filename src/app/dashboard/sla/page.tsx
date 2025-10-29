"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { CreateSlaPolicyDialog } from "@/components/sla/create-sla-policy-dialog";
import { EditSlaPolicyDialog } from "@/components/sla/edit-sla-policy-dialog";
import { motion } from "framer-motion";
import { ModuleGuard } from "@/components/module-guard";

interface SlaPolicy {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  responseTime: number | null;
  resolutionTime: number;
  priorities: string[];
  categoryIds: string[];
  queueIds: string[];
  businessHoursOnly: boolean;
  businessHoursStart: string | null;
  businessHoursEnd: string | null;
  businessDays: number[];
  createdAt: string;
  updatedAt: string;
}

export default function SlaPage() {
  return (
    <ModuleGuard module="sla" moduleName="SLA">
      <SlaPageContent />
    </ModuleGuard>
  );
}

function SlaPageContent() {
  const { data: session } = useSession();
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicy | null>(null);

  const canManage = session?.user?.role === "ADMIN" || session?.user?.role === "TENANT_ADMIN";

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/sla-policies");
      if (!res.ok) throw new Error("Failed to fetch SLA policies");
      const data = await res.json();
      setPolicies(data);
    } catch (error) {
      console.error("Error fetching SLA policies:", error);
      toast.error("Error loading SLA policies");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SLA policy?")) return;

    try {
      const res = await fetch(`/api/sla-policies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete SLA policy");
      toast.success("SLA policy deleted");
      fetchPolicies();
    } catch (error) {
      console.error("Error deleting SLA policy:", error);
      toast.error("Error deleting SLA policy");
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            SLA Policies
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage response and resolution times for tickets
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Policy
          </Button>
        )}
      </div>

      {/* Policies List */}
      {policies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No SLA policies found. Create the first policy.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy, index) => (
            <motion.div
              key={policy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-red-600" />
                        {policy.name}
                      </CardTitle>
                      {policy.description && (
                        <CardDescription className="mt-1">
                          {policy.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={policy.isActive ? "default" : "secondary"}>
                      {policy.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Response Time */}
                    {policy.responseTime && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Response Time:</span>
                        <span className="font-semibold">{formatTime(policy.responseTime)}</span>
                      </div>
                    )}

                    {/* Resolution Time */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Resolution Time:</span>
                      <span className="font-semibold">{formatTime(policy.resolutionTime)}</span>
                    </div>

                    {/* Priorities */}
                    {policy.priorities.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Priorities:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {policy.priorities.map((priority) => (
                            <Badge key={priority} variant="outline" className="text-xs">
                              {priority}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Business Hours */}
                    {policy.businessHoursOnly && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Business Hours: </span>
                        <span className="font-medium">
                          {policy.businessHoursStart} - {policy.businessHoursEnd}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    {canManage && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPolicy(policy)}
                          className="flex-1"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(policy.id)}
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
      )}

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateSlaPolicyDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={fetchPolicies}
        />
      )}

      {editingPolicy && (
        <EditSlaPolicyDialog
          open={!!editingPolicy}
          policy={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onSuccess={fetchPolicies}
        />
      )}
    </div>
  );
}

