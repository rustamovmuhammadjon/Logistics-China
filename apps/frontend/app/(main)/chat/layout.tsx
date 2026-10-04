import { MessagesSquare, Truck } from "lucide-react";
import type { AuthMe } from "@logistics/shared";
import { serverApi } from "@/lib/server-api";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader, SectionTabs } from "@/components/SectionTabs";

export const dynamic = "force-dynamic";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const me = await serverApi<AuthMe>("/api/auth/me");

  if (me.user?.role !== "OPERATOR") {
    return (
      <EmptyState
        icon={<MessagesSquare className="h-9 w-9" />}
        title="Chat is for operators"
        description="Operators talk here with the drivers they pair with a code."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chat"
        description="Conversations with the drivers you paired. A driver can write to you from the app the moment they register."
        icon={<MessagesSquare className="h-5 w-5" />}
      />
      <SectionTabs tabs={[{ href: "/chat/drivers", label: "Drivers", icon: <Truck className="h-4 w-4" /> }]} />
      {children}
    </div>
  );
}
