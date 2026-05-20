"use client";

import { ProtectedRoute } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { VaultDashboard } from "@/components/vault/vault-dashboard";

export default function DeliverablesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <VaultDashboard />
      </AppLayout>
    </ProtectedRoute>
  );
}
