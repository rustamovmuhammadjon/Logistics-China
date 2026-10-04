import { Globe, Truck, UsersRound } from "lucide-react";
import type { AuthMe } from "@logistics/shared";
import { serverApi } from "@/lib/server-api";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader, SectionTabs } from "@/components/SectionTabs";

export const dynamic = "force-dynamic";

export default async function DriversLayout({ children }: { children: React.ReactNode }) {
  const me = await serverApi<AuthMe>("/api/auth/me");
  const role = me.user?.role;
  const allowed = role === "OPERATOR_COMPANY" || (role === "OPERATOR" && !!me.user?.companyId);

  if (!allowed) {
    return (
      <EmptyState
        icon={<Truck className="h-9 w-9" />}
        title="Drivers is for tracking companies"
        description="Tracking companies and their operators browse drivers' truck ads and keep their own driver roster here."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Drivers"
        description="Trucks that drivers advertise in the app, and your company's own driver roster."
        icon={<Truck className="h-5 w-5" />}
      />
      <SectionTabs
        tabs={[
          { href: "/drivers/global", label: "Global drivers", icon: <Globe className="h-4 w-4" /> },
          { href: "/drivers/my", label: "My drivers", icon: <UsersRound className="h-4 w-4" /> },
        ]}
      />
      {children}
    </div>
  );
}
