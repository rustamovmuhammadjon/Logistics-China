import { Profile2User } from "iconsax-react";
import type { AuthMe } from "@logistics/shared";
import { serverApi } from "@/lib/server-api";
import { AppShell } from "@/components/AppShell";
import { ProfileForm } from "./ProfileForm";
import { ProfilePhotoUploader } from "./ProfilePhotoUploader";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await serverApi<AuthMe>("/api/auth/me");

  return (
    <AppShell>
      {!me.user ? (
        <div className="card">
          <h1 className="text-xl font-bold text-slate-900">Profile</h1>
          <p className="mt-2 text-sm text-slate-500">
            {me.admin
              ? "The admin account is a single login from environment variables — there's no profile to edit here."
              : "You need to be logged in to view this page."}
          </p>
          {me.admin && (
            <div className="mt-4">
              <LogoutButton admin />
            </div>
          )}
        </div>
      ) : (
        <div className="card space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Profile2User size={28} variant="Bold" color="#1d4e89" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Profile</h1>
                <p className="text-sm text-slate-500">
                  Account type: <span className="badge-slate">{me.user.role.toLowerCase()}</span>
                </p>
              </div>
            </div>
            <LogoutButton />
          </div>
          <ProfilePhotoUploader
            photoUrl={me.user.photoUrl}
            firstName={me.user.firstName}
            lastName={me.user.lastName}
            email={me.user.email}
          />
          <ProfileForm
            firstName={me.user.firstName}
            lastName={me.user.lastName}
            phone={me.user.phone}
            email={me.user.email}
          />
        </div>
      )}
    </AppShell>
  );
}
