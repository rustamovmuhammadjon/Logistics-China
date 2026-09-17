import { Suspense } from "react";
import { Profile2User } from "iconsax-react";
import { roleLabel, type AuthMe } from "@logistics/shared";
import { serverApi } from "@/lib/server-api";
import { ProfileForm } from "./ProfileForm";
import { ProfilePhotoUploader } from "./ProfilePhotoUploader";
import { LogoutButton } from "./LogoutButton";
import { ProfileSkeleton } from "@/components/ProfileSkeleton";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const me = await serverApi<AuthMe>("/api/auth/me");

  if (!me.user) {
    return (
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
    );
  }

  return (
    <div className="card space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Profile2User size={28} variant="Bold" color="#1d4e89" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Profile</h1>
            <p className="text-sm text-slate-500">
              Account type: <span className="badge-slate">{roleLabel(me.user.role)}</span>
            </p>
          </div>
        </div>
        <LogoutButton />
      </div>
      {me.user.role !== "EMPLOYEE" && (
        <ProfilePhotoUploader
          photoUrl={me.user.photoUrl}
          firstName={me.user.firstName}
          lastName={me.user.lastName}
          email={me.user.email}
        />
      )}
      <ProfileForm
        isCompany={me.user.role === "COMPANY"}
        companyName={me.user.companyName}
        firstName={me.user.firstName}
        lastName={me.user.lastName}
        phone={me.user.phone}
        email={me.user.email}
        dateOfBirth={me.user.dateOfBirth}
        readOnly={me.user.role === "EMPLOYEE"}
      />
    </div>
  );
}
