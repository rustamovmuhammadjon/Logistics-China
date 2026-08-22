"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { clientApi } from "@/lib/api";

export function LogoutButton({ admin }: { admin?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await clientApi(admin ? "/api/auth/admin/logout" : "/api/auth/logout", { method: "POST" });
        router.push(admin ? "/admin/login" : "/login");
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" />
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
