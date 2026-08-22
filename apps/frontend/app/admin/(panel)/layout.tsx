import { Suspense } from "react";
import { AdminShell } from "@/components/AdminShell";
import { PageSkeleton } from "@/components/PageSkeleton";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AdminShell>
  );
}
