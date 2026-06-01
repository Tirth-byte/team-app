"use client";
export const dynamic = "force-dynamic";

import { DM_Sans } from "next/font/google";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { logout, onAuthStateChanged } from "@/lib/auth";
import { type User } from "firebase/auth";
import {
  type AppUser,
  type Contact,
  assignCustomAllocations,
  getTemplate,
  importContacts,
  saveTemplate,
  subscribeContacts,
  subscribeUsers,
  restoreBackup,
  updateContactStatus,
  deleteAllContacts,
} from "@/lib/db";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });

// CSV header -> contact schema mapping.
function mapCsvRow(row: Record<string, string>) {
  return {
    name: row["Candidate's Name"] ?? "",
    email: row["Candidate's Email"] ?? "",
    mobile: row["Candidate's Mobile"] ?? "",
    teamName: row["Team Name"] ?? "",
    role: row["Candidate role"] ?? "",
    org: row["Candidate's Organisation"] ?? "",
    regStatus: row["Reg. Status"] ?? "",
    teamId: row["Team ID"] ?? "",
    location: row["Candidate's Location"] ?? "",
    domain: row["Domain"] ?? "",
    course: row["Course"] ?? "",
    track: row["Choose A Single Track"] ?? "",
    regTime: row["Registration Time"] ?? "",
  };
}

export default function AdminPage() {
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Realtime data ----
  useEffect(() => {
    const unsubContacts = subscribeContacts(setContacts);
    const unsubUsers = subscribeUsers(setUsers);
    const unsubAuth = onAuthStateChanged(setCurrentUser);
    return () => {
      unsubContacts();
      unsubUsers();
      unsubAuth();
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  // ---- Derived stats ----
  const totalContacts = contacts.length;
  const sentCount = contacts.filter((c) => c.waSent).length;
  const pendingCount = totalContacts - sentCount;
  const unassigned = useMemo(
    () => contacts.filter((c) => !c.assignedTo && !c.waSent),
    [contacts]
  );

  return (
    <ProtectedRoute>
      <div
        className={`${dmSans.className} min-h-screen bg-[#07090e] text-gray-200 antialiased relative overflow-hidden`}
      >
        {/* Background ambient glows */}
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[120px] pointer-events-none z-0" />
        <div className="absolute top-1/3 right-0 h-[600px] w-[600px] translate-x-1/3 rounded-full bg-indigo-500/5 blur-[130px] pointer-events-none z-0" />

        {/* Header */}
        <header className="relative z-10 border-b border-white/5 bg-[#07090e]/75 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Xinity Logo"
                className="h-10 w-auto object-contain"
              />
              <h1 className="text-lg font-bold tracking-tight text-white">
                Xinity <span className="text-gray-400 font-medium">Admin</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/users"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition duration-200 hover:bg-white/5 hover:text-white"
              >
                Manage Users
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-xl bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-semibold text-white transition duration-200"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
          {/* SECTION 1 — Stats */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Contacts"
              value={totalContacts}
              borderClass="border-l-blue-500"
              bgGlow="hover:shadow-blue-500/5"
            />
            <StatCard
              label="WA Sent / Pending"
              value={`${sentCount} / ${pendingCount}`}
              borderClass="border-l-emerald-500"
              bgGlow="hover:shadow-emerald-500/5"
            />
            <StatCard
              label="Active Users"
              value={users.length}
              borderClass="border-l-indigo-500"
              bgGlow="hover:shadow-indigo-500/5"
            />
            <StatCard
              label="Unassigned Contacts"
              value={unassigned.length}
              borderClass="border-l-amber-500"
              bgGlow="hover:shadow-amber-500/5"
            />
          </section>

          {/* SECTION 2 — Template */}
          <TemplateSection onSaved={() => showToast("Template saved")} />

          {/* SECTION 3 — Import */}
          <ImportSection onToast={showToast} />

          {/* SECTION 4 — Distribute */}
          <DistributeSection
            users={users}
            unassigned={unassigned}
            contacts={contacts}
            onToast={showToast}
          />

          {/* SECTION 5 — Team progress */}
          <ProgressSection users={users} contacts={contacts} />

          {/* SECTION 5.5 — Manage Contacts */}
          <ContactsListSection
            contacts={contacts}
            users={users}
            currentUser={currentUser}
            onToast={showToast}
          />

          {/* SECTION 6 — Team Backup & Restore */}
          <BackupSection onToast={showToast} users={users} contacts={contacts} />
        </main>

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

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] shadow-xl p-6 hover:border-white/10 transition duration-300">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
      {children}
    </h2>
  );
}

function StatCard({
  label,
  value,
  borderClass,
  bgGlow,
}: {
  label: string;
  value: number | string;
  borderClass: string;
  bgGlow: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/5 border-l-4 ${borderClass} bg-white/[0.02] p-6 shadow-md transition duration-300 hover:border-white/10 ${bgGlow} hover:shadow-lg`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
    </div>
  );
}

function TemplateSection({ onSaved }: { onSaved: () => void }) {
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    getTemplate()
      .then((tpl) => {
        if (active && tpl) setMessage(tpl.waMessage);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setMessage(next);
    setStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveTemplate(next);
        setStatus("saved");
        onSaved();
      } catch {
        setStatus("idle");
      }
    }, 700);
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-white">WhatsApp Message Template</h2>
        <span className="text-xs text-gray-500">
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "Saved"
              : ""}
        </span>
      </div>
      <textarea
        value={message}
        onChange={handleChange}
        disabled={!loaded}
        rows={6}
        placeholder="Hi {name}, welcome to the hackathon! …"
        className="w-full resize-y rounded-lg border border-[#2a2f45] bg-[#0f1117] px-3.5 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#4f8ef7] focus:ring-1 focus:ring-[#4f8ef7] disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          Use{" "}
          <span className="font-mono text-[#4f8ef7]">{"{name}"}</span> to insert
          the contact name.
        </span>
        <span>{message.length} characters</span>
      </div>
    </Card>
  );
}

function ImportSection({ onToast }: { onToast: (m: string) => void }) {
  const [importing, setImporting] = useState(false);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data.map(mapCsvRow);
          const count = await importContacts(rows);
          onToast(`${count} new contacts imported`);
        } catch (err) {
          onToast(
            err instanceof Error ? `Import failed: ${err.message}` : "Import failed"
          );
        } finally {
          setImporting(false);
          e.target.value = "";
        }
      },
      error: (err: Error) => {
        onToast(`Import failed: ${err.message}`);
        setImporting(false);
      },
    });
  }

  return (
    <Card>
      <SectionTitle>Import Contacts (CSV)</SectionTitle>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#4f8ef7] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#3d7ce5]">
        {importing ? "Importing…" : "Upload CSV"}
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          disabled={importing}
          className="hidden"
        />
      </label>
      <p className="mt-3 text-xs text-gray-500">
        Contacts are deduplicated by email — rows whose email already exists are
        skipped.
      </p>
    </Card>
  );
}

function DistributeSection({
  users,
  unassigned,
  contacts,
  onToast,
}: {
  users: AppUser[];
  unassigned: Contact[];
  contacts: Contact[];
  onToast: (m: string) => void;
}) {
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [working, setWorking] = useState(false);

  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  }, [allocations]);

  const isOverAllocated = totalAllocated > unassigned.length;

  const getUserPendingCount = useCallback(
    (uid: string) => {
      return contacts.filter((c) => c.assignedTo === uid && !c.waSent).length;
    },
    [contacts]
  );

  const handleAllocationChange = (uid: string, value: number) => {
    setAllocations((prev) => ({
      ...prev,
      [uid]: Math.max(0, value),
    }));
  };

  const adjustAllocation = (uid: string, amount: number) => {
    setAllocations((prev) => {
      const current = prev[uid] || 0;
      return {
        ...prev,
        [uid]: Math.max(0, current + amount),
      };
    });
  };

  async function distribute() {
    if (totalAllocated === 0 || isOverAllocated || unassigned.length === 0) return;
    setWorking(true);
    try {
      const allocList = Object.entries(allocations)
        .map(([userId, count]) => ({ userId, count }))
        .filter((a) => a.count > 0);

      await assignCustomAllocations(allocList, unassigned);

      onToast(`Distributed ${totalAllocated} contacts to team members.`);
      setAllocations({});
    } catch (err) {
      onToast(
        err instanceof Error ? `Failed: ${err.message}` : "Distribution failed"
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Distribute Contacts</SectionTitle>
      
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-gray-400">
          Unassigned Contacts: <span className="font-semibold text-white">{unassigned.length}</span>
        </span>
        <span className={`${isOverAllocated ? "text-red-400 font-semibold" : "text-gray-400"}`}>
          Allocated: <span className="font-semibold">{totalAllocated}</span> / {unassigned.length}
        </span>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-gray-500">No users available.</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const pendingTasks = getUserPendingCount(u.id);
            const allocatedCount = allocations[u.id] || 0;
            return (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#2a2f45] bg-[#0f1117] p-4 transition hover:border-[#4f8ef7]/35"
              >
                <div>
                  <div className="font-medium text-white">{u.name || u.email}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {u.email} • <span className="text-indigo-400 font-medium">{pendingTasks} pending tasks</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => adjustAllocation(u.id, -5)}
                    className="rounded bg-white/5 hover:bg-white/10 px-2 py-1 text-xs text-gray-300 transition"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustAllocation(u.id, -1)}
                    className="rounded bg-white/5 hover:bg-white/10 px-2 py-1 text-xs text-gray-300 transition"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={unassigned.length}
                    value={allocatedCount || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      handleAllocationChange(u.id, isNaN(val) ? 0 : val);
                    }}
                    placeholder="0"
                    className="w-16 rounded border border-white/10 bg-black/40 px-2 py-1.5 text-center text-sm font-semibold text-white outline-none transition focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustAllocation(u.id, 1)}
                    className="rounded bg-white/5 hover:bg-white/10 px-2 py-1 text-xs text-gray-300 transition"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustAllocation(u.id, 5)}
                    className="rounded bg-white/5 hover:bg-white/10 px-2 py-1 text-xs text-gray-300 transition"
                  >
                    +5
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOverAllocated && (
        <p className="mt-4 text-xs font-semibold text-red-400" role="alert">
          ⚠️ Cannot allocate more contacts ({totalAllocated}) than the available unassigned contacts ({unassigned.length}).
        </p>
      )}

      <button
        onClick={distribute}
        disabled={working || totalAllocated === 0 || isOverAllocated || unassigned.length === 0}
        className="mt-5 w-full rounded-lg bg-[#4f8ef7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d7ce5] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {working ? "Distributing…" : `Distribute ${totalAllocated} Contacts`}
      </button>
    </Card>
  );
}

function ProgressSection({
  users,
  contacts,
}: {
  users: AppUser[];
  contacts: Contact[];
}) {
  const rows = useMemo(() => {
    return users.map((u) => {
      const assigned = contacts.filter((c) => c.assignedTo === u.id);
      const sent = assigned.filter((c) => c.waSent).length;
      const total = assigned.length;
      const pending = total - sent;
      const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
      return { user: u, assigned: total, sent, pending, pct };
    });
  }, [users, contacts]);

  return (
    <Card>
      <SectionTitle>Team Progress</SectionTitle>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No users yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#2a2f45] text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Assigned</th>
                <th className="py-2 pr-4 font-medium">Sent</th>
                <th className="py-2 pr-4 font-medium">Pending</th>
                <th className="py-2 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user, assigned, sent, pending, pct }) => (
                <tr
                  key={user.id}
                  className="border-b border-[#2a2f45]/60 last:border-0"
                >
                  <td className="py-3 pr-4 text-white">
                    {user.name || user.email}
                  </td>
                  <td className="py-3 pr-4 text-gray-300">{assigned}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-1.5 text-gray-300">
                      {sent}
                      {sent > 0 && (
                        <span
                          className="font-bold text-green-400"
                          title="Sent"
                          aria-label="sent"
                        >
                          ✓✓
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-300">{pending}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-40 overflow-hidden rounded-full bg-[#0f1117]">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-gray-400">
                        {pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function BackupSection({
  onToast,
  users,
  contacts,
}: {
  onToast: (m: string) => void;
  users: AppUser[];
  contacts: Contact[];
}) {
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleBackupDownload() {
    try {
      const tpl = await getTemplate();
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: 2,
        cloud: {
          contacts: contacts.map((c) => ({
            ...c,
            importedAt: c.importedAt?.toISOString(),
            waSentAt: c.waSentAt?.toISOString(),
          })),
          users: users.map((u) => ({
            ...u,
            createdAt: u.createdAt?.toISOString(),
          })),
          waTemplate: tpl?.waMessage ?? "",
        },
      };

      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
      a.download = `hackathon-team-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast("Backup downloaded successfully");
    } catch (err) {
      onToast(
        err instanceof Error ? `Backup failed: ${err.message}` : "Backup failed"
      );
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const data = JSON.parse(text);

        if (!data.cloud && !data.contacts) {
          throw new Error("Invalid backup format: missing backup data.");
        }

        const count = await restoreBackup(data);
        onToast(`Backup restored: ${count} new contacts and settings updated.`);
      } catch (err) {
        onToast(
          err instanceof Error
            ? `Restore failed: ${err.message}`
            : "Restore failed"
        );
      } finally {
        setRestoring(false);
        e.target.value = "";
      }
    };
    reader.onerror = () => {
      onToast("Failed to read backup file");
      setRestoring(false);
    };
    reader.readAsText(file);
  }

  async function handleDeleteAll() {
    if (!window.confirm("Are you sure you want to delete ALL contacts from the cloud? This action cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      const count = await deleteAllContacts();
      onToast(`Successfully deleted ${count} contacts from the cloud.`);
    } catch (err) {
      onToast(
        err instanceof Error ? `Delete failed: ${err.message}` : "Delete failed"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Team Backup & Restore</SectionTitle>
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleBackupDownload}
          disabled={deleting}
          className="rounded-lg border border-[#2a2f45] bg-[#181c27] px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-[#0f1117] hover:text-white disabled:opacity-50"
        >
          Download Backup
        </button>
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#4f8ef7] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#3d7ce5] ${deleting ? "opacity-50 pointer-events-none" : ""}`}>
          {restoring ? "Restoring…" : "Restore Backup"}
          <input
            type="file"
            accept=".json"
            onChange={handleFile}
            disabled={restoring || deleting}
            className="hidden"
          />
        </label>
        <button
          onClick={handleDeleteAll}
          disabled={deleting || restoring}
          className="rounded-lg border border-red-500/25 bg-[#1f151b] px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "🗑️ Delete All from Cloud"}
        </button>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Download a complete backup of contacts, users, and WhatsApp template, restore a previously saved team backup to Firestore, or delete all contacts from the cloud for a fresh start.
      </p>
    </Card>
  );
}

function ContactsListSection({
  contacts,
  users,
  currentUser,
  onToast,
}: {
  contacts: Contact[];
  users: AppUser[];
  currentUser: User | null;
  onToast: (m: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done" | "unassigned" | "assigned">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const userMap = useMemo(() => {
    const map: Record<string, AppUser> = {};
    for (const u of users) {
      map[u.id] = u;
    }
    return map;
  }, [users]);

  // Reset page when search or filter changes
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleFilterChange = (val: typeof filter) => {
    setFilter(val);
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      // Status filter
      if (filter === "pending" && c.waSent) return false;
      if (filter === "done" && !c.waSent) return false;
      if (filter === "unassigned" && c.assignedTo) return false;
      if (filter === "assigned" && !c.assignedTo) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const nameMatch = c.name.toLowerCase().includes(s);
        const emailMatch = c.email.toLowerCase().includes(s);
        const mobileMatch = c.mobile.toLowerCase().includes(s);
        const orgMatch = c.org.toLowerCase().includes(s);
        const teamMatch = c.teamName.toLowerCase().includes(s);
        const assignedUser = c.assignedTo ? userMap[c.assignedTo] : null;
        const userMatch = assignedUser
          ? (assignedUser.name || assignedUser.email).toLowerCase().includes(s)
          : false;
        return nameMatch || emailMatch || mobileMatch || orgMatch || teamMatch || userMatch;
      }

      return true;
    });
  }, [contacts, filter, searchTerm, userMap]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // Keep page in valid range if list shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  async function handleToggleStatus(contact: Contact) {
    setUpdatingId(contact.id);
    try {
      const nextStatus = !contact.waSent;
      await updateContactStatus(contact.id, nextStatus, currentUser?.uid || "admin");
      onToast(`Contact "${contact.name}" marked as ${nextStatus ? "Done" : "Pending"}.`);
    } catch (err) {
      onToast(err instanceof Error ? `Failed: ${err.message}` : "Failed to update contact");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card>
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <SectionTitle>Manage Contacts</SectionTitle>
          <p className="text-xs text-gray-500 mt-1">
            Total filtered: {filtered.length} contacts
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-xl border border-[#2a2f45] bg-[#0f1117] pl-3 pr-8 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#4f8ef7] focus:ring-1 focus:ring-[#4f8ef7]"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "pending", "done", "unassigned", "assigned"] as const).map((f) => {
          const active = filter === f;
          let label = f.charAt(0).toUpperCase() + f.slice(1);
          if (f === "done") label = "Done";
          return (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-[#4f8ef7]/15 text-[#4f8ef7] border border-[#4f8ef7]/30"
                  : "text-gray-400 border border-white/5 hover:bg-white/5 hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No contacts match the criteria.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#2a2f45] text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Name & Team</th>
                <th className="py-3 pr-4 font-medium">Contact Details</th>
                <th className="py-3 pr-4 font-medium">Assigned To</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((contact) => {
                const assignedUser = contact.assignedTo ? userMap[contact.assignedTo] : null;
                const assignedName = assignedUser
                  ? assignedUser.name || assignedUser.email
                  : "Unassigned";
                const isUpdating = updatingId === contact.id;

                return (
                  <tr
                    key={contact.id}
                    className="border-b border-[#2a2f45]/60 last:border-0 hover:bg-white/[0.01] transition-colors"
                  >
                    {/* Name & Team */}
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-white">{contact.name}</div>
                      {contact.teamName && (
                        <div className="text-xs text-gray-500 mt-0.5">{contact.teamName}</div>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-4 pr-4 text-xs font-mono text-gray-400">
                      <div>{contact.mobile || "No Mobile"}</div>
                      <div className="mt-0.5 text-gray-500">{contact.email}</div>
                    </td>

                    {/* Assigned User */}
                    <td className="py-4 pr-4 text-gray-300">
                      <span
                        className={`inline-block rounded-md px-2 py-1 text-xs ${
                          contact.assignedTo
                            ? "bg-indigo-500/10 text-indigo-300"
                            : "bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {assignedName}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 pr-4">
                      {contact.waSent ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                          Done ✓✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(contact)}
                        disabled={isUpdating}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition duration-200 active:scale-95 disabled:opacity-50 ${
                          contact.waSent
                            ? "border-amber-500/25 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/40"
                            : "border-green-500/25 text-green-400 hover:bg-green-500/10 hover:border-green-500/40"
                        }`}
                      >
                        {isUpdating
                          ? "Updating…"
                          : contact.waSent
                          ? "Mark Pending"
                          : "Mark Done"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between border-t border-[#2a2f45]/40 pt-4 text-sm">
          <span className="text-gray-500 text-xs">
            Showing Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
