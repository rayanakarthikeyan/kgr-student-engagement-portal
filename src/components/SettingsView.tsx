import { UserCircle, Mail, Hash, BookOpen } from "lucide-react";
import type { AuthSession } from "../platform/types";

export function SettingsView({ session }: { session: AuthSession }) {
  const { user } = session;
  const isStudent = user.role === "student";

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-600">
          Preferences
        </p>
        <h2 className="mt-1 text-2xl font-bold">Account Settings</h2>
      </header>

      <div className="space-y-6">
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <UserCircle className="text-[var(--muted)]" size={20} />
            Profile Information
          </h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                Full Name
              </span>
              <p className="text-sm font-medium">{user.name}</p>
            </div>
            <div>
              <span className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                Email Address
              </span>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Mail size={14} className="text-[var(--muted)]" />
                {user.email || "Not provided"}
              </p>
            </div>
            {isStudent ? (
              <>
                <div>
                  <span className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    Roll Number
                  </span>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Hash size={14} className="text-[var(--muted)]" />
                    {user.rollNumber || "Not provided"}
                  </p>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                    Department & Section
                  </span>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <BookOpen size={14} className="text-[var(--muted)]" />
                    {user.department
                      ? `${user.department} / ${user.section || "No Section"}`
                      : "Not assigned"}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <span className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                  Title
                </span>
                <p className="text-sm font-medium">{user.title || "Faculty"}</p>
              </div>
            )}
            <div>
              <span className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                Account Role
              </span>
              <p className="inline-flex items-center rounded-md bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-600 capitalize">
                {user.role}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h3 className="mb-4 text-lg font-semibold">Appearance</h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            Toggle your display theme using the sun/moon icon in the top
            navigation bar.
          </p>
          <div className="rounded-md bg-[var(--page)] p-4 border border-[var(--line)] text-sm text-[var(--muted)]">
            Additional settings are managed by your administrator. Contact IT
            support if your profile details are incorrect.
          </div>
        </section>
      </div>
    </div>
  );
}
