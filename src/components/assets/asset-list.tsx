"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, HardDrive } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  inventoryNumber: string | null;
}

export function AssetList() {
  const { data: session } = useSession();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssets = async () => {
    if (!session?.user?.tenantId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/assets`);
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
      }
    } catch (e: any) {
      toast.error("Error loading assets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [session]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete asset?")) return;
    try {
      const response = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Asset deleted");
        fetchAssets();
      }
    } catch (e: any) {
      toast.error("Error deleting asset");
    }
  };

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  if (assets.length === 0) {
    return (
      <div className="text-center py-8">
        <HardDrive className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No Assets Found</h3>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Manufacturer</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>S/N</TableHead>
          <TableHead>Inv. #</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset) => (
          <TableRow key={asset.id}>
            <TableCell className="font-medium">{asset.name}</TableCell>
            <TableCell><Badge variant="outline">{asset.type}</Badge></TableCell>
            <TableCell>{asset.manufacturer || "—"}</TableCell>
            <TableCell>{asset.model || "—"}</TableCell>
            <TableCell className="font-mono text-sm">{asset.serialNumber || "—"}</TableCell>
            <TableCell>{asset.inventoryNumber || "—"}</TableCell>
            <TableCell><Badge>{asset.status}</Badge></TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(asset.id)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

