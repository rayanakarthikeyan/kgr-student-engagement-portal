import { useEffect, useState } from "react";
import { AlertCircle, Trash2, Users } from "lucide-react";
import { loadAllUsers, deleteUser } from "../platform/api";
import type { SessionUser } from "../platform/types";

interface SuperAdminDashboardProps {
  token: string;
}

export function SuperAdminDashboard({ token }: SuperAdminDashboardProps) {
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadAllUsers(token)
      .then((data) => {
        if (!active) return;
        setUsers(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load users");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const handleDelete = async (user: SessionUser) => {
    if (user.role === "admin") {
      alert("Cannot delete an admin user from this interface.");
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete user ${user.name} (${user.email})?`)) {
      return;
    }

    setDeletingId(user.id);
    try {
      await deleteUser(token, user.id);
      setUsers(users.filter((u) => u.id !== user.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <span className="size-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          Loading users...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-500">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle size={18} />
          Error loading users
        </div>
        <p className="mt-1 text-sm opacity-90">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-cyan-500/10 text-cyan-500">
          <Users size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">User Management</h2>
          <p className="text-sm text-[var(--muted)]">
            Manage platform users. {users.length} total users found.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--page)] text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-[var(--page)]/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--ink)]">{user.name}</div>
                    <div className="text-xs text-[var(--muted)]">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-purple-500/10 text-purple-500"
                          : user.role === "faculty"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-[var(--muted)]">
                      {user.rollNumber && <span className="block">Roll: {user.rollNumber}</span>}
                      {user.department && <span className="block">Dept: {user.department}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.role !== "admin" && (
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                        title="Delete User"
                      >
                        {deletingId === user.id ? (
                          <span className="size-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
