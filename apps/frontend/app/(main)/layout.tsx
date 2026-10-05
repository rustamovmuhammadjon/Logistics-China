import { Suspense } from "react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { PageSkeleton } from "@/components/PageSkeleton";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";
  return (
    <AppShell defaultCollapsed={collapsed}>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}
