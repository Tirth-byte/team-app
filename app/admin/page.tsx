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
import ProtectedRoute from "@/components/ProtectedRoute";
import { logout } from "@/lib/auth";
import {
  type AppUser,
  type Contact,
  assignContacts,
  getTemplate,
  importContacts,
  saveTemplate,
  subscribeContacts,
  subscribeUsers,
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
        className={`${dmSans.className} min-h-screen bg-[#0f1117] text-gray-200`}
      >
        {/* Header */}
        <header className="border-b border-[#2a2f45]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4f8ef7]/15 text-[#4f8ef7]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <h1 className="text-lg font-bold text-white">Hackathon Team</h1>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[#2a2f45] px-3 py-1.5 text-sm text-gray-300 transition hover:bg-[#181c27] hover:text-white"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
          {/* SECTION 1 — Stats */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Contacts" value={totalContacts} />
            <StatCard
              label="WA Sent / Pending"
              value={`${sentCount} / ${pendingCount}`}
            />
            <StatCard label="Active Users" value={users.length} />
            <StatCard label="Unassigned Contacts" value={unassigned.length} />
          </section>

          {/* SECTION 2 — Template */}
          <TemplateSection onSaved={() => showToast("Template saved")} />

          {/* SECTION 3 — Import */}
          <ImportSection onToast={showToast} />

          {/* SECTION 4 — Distribute */}
          <DistributeSection
            users={users}
            unassigned={unassigned}
            onToast={showToast}
          />

          {/* SECTION 5 — Team progress */}
          <ProgressSection users={users} contacts={contacts} />
        </main>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#2a2f45] bg-[#181c27] px-4 py-2.5 text-sm text-white shadow-xl">
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
    <div className="rounded-2xl border border-[#2a2f45] bg-[#181c27] p-6">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-base font-bold text-white">{children}</h2>;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#2a2f45] bg-[#181c27] p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
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
  onToast,
}: {
  users: AppUser[];
  unassigned: Contact[];
  onToast: (m: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  async function distribute() {
    if (selected.size === 0 || unassigned.length === 0) return;
    setWorking(true);
    try {
      const userIds = Array.from(selected);
      const contactIds = unassigned.map((c) => c.id);
      await assignContacts(userIds, contactIds);
      onToast(
        `Distributed ${contactIds.length} contacts to ${userIds.length} users`
      );
      setSelected(new Set());
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
      <p className="mb-4 text-sm text-gray-400">
        <span className="font-semibold text-white">{unassigned.length}</span>{" "}
        unassigned contacts
      </p>

      {users.length === 0 ? (
        <p className="text-sm text-gray-500">No users available.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {users.map((u) => (
            <label
              key={u.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#2a2f45] bg-[#0f1117] px-3.5 py-2.5 text-sm transition hover:border-[#4f8ef7]/50"
            >
              <input
                type="checkbox"
                checked={selected.has(u.id)}
                onChange={() => toggle(u.id)}
                className="h-4 w-4 accent-[#4f8ef7]"
              />
              <span className="text-white">{u.name || u.email}</span>
            </label>
          ))}
        </div>
      )}

      <button
        onClick={distribute}
        disabled={working || selected.size === 0 || unassigned.length === 0}
        className="mt-4 rounded-lg bg-[#4f8ef7] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#3d7ce5] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {working ? "Distributing…" : "Distribute Equally"}
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
