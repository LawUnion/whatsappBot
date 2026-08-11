"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminScope } from "@/hooks/useAdminScope";

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, loading } = useAdminScope();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push("/");
    }
  }, [isSuperAdmin, loading, router]);

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-slate-500 animate-pulse">Checking permissions...</div>
      </div>
    );
  }

  return <>{children}</>;
}
