import { getCurrentUser } from "@/lib/current-user";
import { isAdminAuthenticated } from "@/lib/auth";
import AppShell from "@/app/AppShell";
import { ProfileForm } from "./ProfileForm";
import { ProfilePhotoUploader } from "./ProfilePhotoUploader";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [user, admin] = await Promise.all([getCurrentUser(), isAdminAuthenticated()]);

  if (!user) {
    return (
      <AppShell>
        <div className="card">
          <h1 className="text-xl font-bold text-slate-900">Profile</h1>
          {admin ? (
            <p className="mt-2 text-sm text-slate-500">
              The admin account is a single login from environment variables — there's no profile
              to edit here. Consignee and operator accounts have one.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">You need to be logged in to view this page.</p>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="card space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-500">
            Account type: <span className="badge-slate">{user.role.toLowerCase()}</span>
          </p>
        </div>

        <ProfilePhotoUploader
          photoUrl={user.photoUrl}
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
        />

        <ProfileForm
          firstName={user.firstName}
          lastName={user.lastName}
          phone={user.phone}
          email={user.email}
        />
      </div>
    </AppShell>
  );
}
