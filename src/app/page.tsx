"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      router.replace(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#6366F1] border-t-transparent" />
    </div>
  );
}
