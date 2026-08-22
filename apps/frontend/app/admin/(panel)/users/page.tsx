import { Profile2User } from "iconsax-react";
import type { AdminUserDto } from "@logistics/shared";
import { serverApi } from "@/lib/server-api";
import { UsersDirectory } from "./UsersDirectory";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const data = await serverApi<{ users: AdminUserDto[]; registrationCode: string }>("/api/admin/users");

  return (
    <div className="space-y-6">
        <div className="flex items-start gap-3">
          <Profile2User size={28} variant="Bold" color="#1d4e89" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Users</h1>
            <p className="text-sm text-slate-500">{data.users.length} registered account{data.users.length === 1 ? "" : "s"}.</p>
          </div>
        </div>
        <UsersDirectory users={data.users} registrationCode={data.registrationCode} />
      </div>
    
  );
}
