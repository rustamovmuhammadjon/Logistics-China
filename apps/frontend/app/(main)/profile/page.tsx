import { Suspense } from "react";
import { Profile2User } from "iconsax-react";
import { roleLabel, type AuthMe } from "@logistics/shared";
import { serverApi } from "@/lib/server-api";
import { ProfileForm } from "./ProfileForm";
import { ProfilePhotoUploader } from "./ProfilePhotoUploader";
import { PasswordChangeForm } from "./PasswordChangeForm";
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

  // A company-employed operator (companyId set) is managed by its
  // OPERATOR_COMPANY the same way an EMPLOYEE is managed by its COMPANY —
  // a standalone operator (no companyId) keeps full self-service.
  const managedByCompany = me.user.role === "EMPLOYEE" || (me.user.role === "OPERATOR" && !!me.user.companyId);
  const isCompanyShaped = me.user.role === "COMPANY" || me.user.role === "OPERATOR_COMPANY";

  return (
    <div className="space-y-6">
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
        {/* Photo is self-service for everyone, even when the rest of the
            profile below is managed by the company — a company never sets
            or controls a user's picture, at creation or afterward. */}
        <ProfilePhotoUploader
          photoUrl={me.user.photoUrl}
          firstName={me.user.firstName}
          lastName={me.user.lastName}
          email={me.user.email}
        />
        {managedByCompany && me.company && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your company</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{me.company.companyName || "—"}</p>
            <p className="text-xs text-slate-500">
              {me.company.email}
              {me.company.phone ? ` · ${me.company.phone}` : ""}
            </p>
          </div>
        )}
        <ProfileForm
          isCompany={isCompanyShaped}
          companyName={me.user.companyName}
          firstName={me.user.firstName}
          lastName={me.user.lastName}
          phone={me.user.phone}
          email={me.user.email}
          dateOfBirth={me.user.dateOfBirth}
          readOnly={managedByCompany}
        />
      </div>
      {/* Password self-service is never restricted by managedByCompany — a
          company sets an employee's/operator's initial password but can
          never see or change it again; only the account owner can from here on. */}
      <PasswordChangeForm />
    </div>
  );
}
