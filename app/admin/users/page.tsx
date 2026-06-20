"use client";

import { useState, useEffect, useMemo, useRef, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { DM_Sans } from "next/font/google";
import ProtectedRoute from "@/components/ProtectedRoute";
import { subscribeUsers, subscribeContacts } from "@/lib/db";
import { authHeader } from "@/lib/authHeader";
import { type AppUser, type Contact } from "@/lib/db";

const dmSans = DM_Sans({ subsets: ["latin"] });

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Reset and Remove modal state
  const [pendingReset, setPendingReset] = useState<AppUser | null>(null);
  const [pendingRemove, setPendingRemove] = useState<AppUser | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const unsubUsers = subscribeUsers(setUsers);
    const unsubContacts = subscribeContacts(setContacts);
    return () => {
      unsubUsers();
      unsubContacts();
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Per-user assigned / sent counts.
  const stats = useMemo(() => {
    const map: Record<string, { assigned: number; sent: number }> = {};
    for (const u of users) map[u.id] = { assigned: 0, sent: 0 };
    for (const c of contacts) {
      if (c.assignedTo && map[c.assignedTo]) {
        map[c.assignedTo].assigned += 1;
        if (c.waSent) map[c.assignedTo].sent += 1;
      }
    }
    return map;
  }, [users, contacts]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user.");
      showToast(`User "${name}" created`);
      setName("");
      setEmail("");
      setPassword("");
      // Realtime subscription refreshes the table automatically.
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setCreating(false);
    }
  }

  async function confirmReset() {
    if (!pendingReset) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/users/${pendingReset.id}?action=reset`, {
        method: "DELETE",
        headers: { ...(await authHeader()) },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reset tasks.");
      showToast(`Tasks for "${pendingReset.name || pendingReset.email}" returned to pool`);
      setPendingReset(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reset tasks.");
    } finally {
      setWorking(false);
    }
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/users/${pendingRemove.id}?action=remove`, {
        method: "DELETE",
        headers: { ...(await authHeader()) },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to remove user.");
      showToast(`User "${pendingRemove.name || pendingRemove.email}" completely removed`);
      setPendingRemove(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove user.");
    } finally {
      setWorking(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50";

  return (
    <ProtectedRoute>
      <div className={`${dmSans.className} min-h-screen bg-[#07090e] text-gray-200 antialiased relative overflow-hidden`}>
        {/* Background ambient glows */}
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[120px] pointer-events-none z-0" />
        <div className="absolute top-1/3 right-0 h-[600px] w-[600px] translate-x-1/3 rounded-full bg-indigo-500/5 blur-[130px] pointer-events-none z-0" />

        {/* Header */}
        <header className="relative z-10 border-b border-white/5 bg-[#07090e]/75 backdrop-blur-lg">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition duration-200 hover:bg-white/5 hover:text-white"
              >
                ← Dashboard
              </Link>
              <h1 className="text-lg font-bold tracking-tight text-white">Users</h1>
            </div>
            <img
              src="/logo.png"
              alt="Xinity Logo"
              className="h-9 w-auto object-contain"
            />
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
          {/* Create user */}
          <section className="rounded-2xl border border-white/5 bg-white/[0.02] shadow-xl p-6 hover:border-white/10 transition duration-300">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Create User</h2>
            <form
              onSubmit={handleCreate}
              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              <input
                type="text"
                required
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={creating}
                className={inputClass}
              />
              <input
                type="email"
                required
                placeholder="Email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={creating}
                className={inputClass}
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={creating}
                className={inputClass}
              />
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition duration-200 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </section>

          {/* Users table */}
          <section className="rounded-2xl border border-white/5 bg-white/[0.02] shadow-xl p-6 hover:border-white/10 transition duration-300">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400 font-semibold">All Users</h2>
            {users.length === 0 ? (
              <p className="text-sm text-gray-500">No users yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <th className="pb-3 pr-4 font-semibold">Name</th>
                      <th className="pb-3 pr-4 font-semibold">Email</th>
                      <th className="pb-3 pr-4 font-semibold">Assigned</th>
                      <th className="pb-3 pr-4 font-semibold">Sent</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-white/[0.01] transition-colors"
                      >
                        <td className="py-4 pr-4 font-medium text-white">{u.name}</td>
                        <td className="py-4 pr-4 text-gray-400 font-mono text-xs">{u.email}</td>
                        <td className="py-4 pr-4 text-gray-300 font-medium">
                          {stats[u.id]?.assigned ?? 0}
                        </td>
                        <td className="py-4 pr-4 text-gray-300 font-medium">
                          {stats[u.id]?.sent ?? 0}
                        </td>
                        <td className="py-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => setPendingReset(u)}
                            className="rounded-xl border border-blue-500/25 px-3 py-1.5 text-xs font-bold text-blue-400 transition hover:bg-blue-500/10 hover:border-blue-500/40 active:scale-95"
                          >
                            Reset Tasks
                          </button>
                          <button
                            onClick={() => setPendingRemove(u)}
                            className="rounded-xl border border-red-500/25 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-500/10 hover:border-red-500/40 active:scale-95"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        {/* Reset tasks confirm modal */}
        {pendingReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f111a] p-6 shadow-2xl">
              <h3 className="text-base font-bold text-white tracking-tight">Reset tasks to pool?</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                This will return only pending tasks assigned to{" "}
                <span className="font-semibold text-white">
                  {pendingReset.name || pendingReset.email}
                </span>{" "}
                back to the unassigned pool so they can be distributed to other members. Their team member account will remain intact.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setPendingReset(null)}
                  disabled={working}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/5 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReset}
                  disabled={working}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 disabled:opacity-60"
                >
                  {working ? "Resetting…" : "Reset Tasks"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove user confirm modal */}
        {pendingRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f111a] p-6 shadow-2xl">
              <h3 className="text-base font-bold text-white tracking-tight">Remove team member?</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                This will permanently delete the team member account for{" "}
                <span className="font-semibold text-white">
                  {pendingRemove.name || pendingRemove.email}
                </span>{" "}
                from authentication and the database. This cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setPendingRemove(null)}
                  disabled={working}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/5 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemove}
                  disabled={working}
                  className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-semibold text-white transition duration-200 disabled:opacity-60"
                >
                  {working ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0f111a] px-5 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-xl">
            {toast}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
