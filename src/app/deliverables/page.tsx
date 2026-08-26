"use client";

import { ProtectedRoute } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { VaultDashboard } from "@/components/vault/vault-dashboard";
import { Loader2, Package } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export default function DeliverablesPage() {
  const { user } = useAuth();

  const modules = useQuery(
    api.projects.listModules,
    user?.id ? { token: (typeof window !== "undefined" ? localStorage.getItem("oookea_session") || "" : ""),  clientId: user.id as Id<"users"> } : "skip"
  );

  // Find the first vault-type module for this client
  const vaultModule = modules?.find(
    (m) => m.enabled && (m.slug === "inerys-vault" || m.config?.type === "vault")
  );

  if (modules === undefined) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  // No vault module assigned — show empty state
  if (!vaultModule) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground">No deliverables yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your deliverables will appear here when assigned.
            </p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <VaultDashboard config={vaultModule.config as any} />
      </AppLayout>
    </ProtectedRoute>
  );
}
