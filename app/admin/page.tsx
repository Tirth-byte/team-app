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
import { logout } from "@/lib/auth";
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
  };
}

export default function AdminPage() {
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Realtime data ----
  useEffect(() => {
    const unsubContacts = subscribeContacts(setContacts);
    const unsubUsers = subscribeUsers(setUsers);
    return () => {
      unsubContacts();
      unsubUsers();
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
    () => contacts.filter((c) => !c.assignedTo),
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

  return (
    <Card>
      <SectionTitle>Team Backup & Restore</SectionTitle>
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleBackupDownload}
          className="rounded-lg border border-[#2a2f45] bg-[#181c27] px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-[#0f1117] hover:text-white"
        >
          Download Backup
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#4f8ef7] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#3d7ce5]">
          {restoring ? "Restoring…" : "Restore Backup"}
          <input
            type="file"
            accept=".json"
            onChange={handleFile}
            disabled={restoring}
            className="hidden"
          />
        </label>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Download a complete backup of contacts, users, and WhatsApp template, or restore a previously saved team backup to Firestore.
      </p>
    </Card>
  );
}
