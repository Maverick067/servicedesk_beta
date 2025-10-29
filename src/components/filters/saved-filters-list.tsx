"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Filter, Star, Globe, Lock, Trash2, Edit, Plus } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface SavedFilter {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  isPublic: boolean;
  sortOrder: number;
  filters: any;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: string;
}

export function SavedFiltersList() {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFilters();
  }, []);

  async function fetchFilters() {
    try {
      const response = await fetch("/api/filters");
      if (response.ok) {
        const data = await response.json();
        setFilters(data);
      }
    } catch (error) {
      console.error("Error fetching filters:", error);
      toast.error("Failed to load filters");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteFilter(id: string) {
    if (!confirm("Delete this filter?")) return;

    try {
      const response = await fetch(`/api/filters/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setFilters(filters.filter((f) => f.id !== id));
        toast.success("Filter deleted");
      } else {
        toast.error("Failed to delete filter");
      }
    } catch (error) {
      console.error("Error deleting filter:", error);
      toast.error("An error occurred");
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Saved Filters</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Quick access to your favorite ticket views
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Filter
        </Button>
      </div>

      {filters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No Saved Filters</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first filter for quick access to specific tickets
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filters.map((filter, index) => (
            <motion.div
              key={filter.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {filter.icon && (
                        <span className="text-2xl">{filter.icon}</span>
                      )}
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {filter.name}
                          {filter.isDefault && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                        </CardTitle>
                        {filter.description && (
                          <CardDescription className="mt-1">
                            {filter.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {filter.isPublic ? (
                      <Badge variant="secondary" className="gap-1">
                        <Globe className="h-3 w-3" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Private
                      </Badge>
                    )}
                    
                    {Object.keys(filter.filters).length > 0 && (
                      <Badge variant="outline">
                        {Object.keys(filter.filters).length} conditions
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Created by: {filter.user.name || filter.user.email}
                  </p>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <Link href={`/dashboard/tickets?filter=${filter.id}`}>
                        Apply
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* TODO: Implement edit */}}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFilter(filter.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

