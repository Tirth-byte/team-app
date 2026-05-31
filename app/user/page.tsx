"use client";
export const dynamic = "force-dynamic";

import { type User } from "firebase/auth";
import { DM_Sans } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { logout, onAuthStateChanged } from "@/lib/auth";
import {
  type Contact,
  getTemplate,
  subscribeContactsByUser,
  updateContactWaSent,
} from "@/lib/db";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });

type Tab = "all" | "pending" | "sent";

export default function UserPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Cached WhatsApp template message.
  const templateRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeContactsByUser(user.uid, setContacts);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    getTemplate().then((tpl) => {
      templateRef.current = tpl?.waMessage ?? "";
    });
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const total = contacts.length;
  const sent = useMemo(() => contacts.filter((c) => c.waSent).length, [contacts]);
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
  const name = user?.displayName || user?.email?.split("@")[0] || "there";

  const visible = useMemo(() => {
    if (tab === "pending") return contacts.filter((c) => !c.waSent);
    if (tab === "sent") return contacts.filter((c) => c.waSent);
    return contacts;
  }, [contacts, tab]);

  async function sendWhatsApp(contact: Contact) {
    if (contact.waSent || !user) return;
    setSendingId(contact.id);

    // 1. Ensure we have the template.
    if (templateRef.current === null) {
      const tpl = await getTemplate();
      templateRef.current = tpl?.waMessage ?? "";
    }

    // 2. Personalise the message.
    const message = (templateRef.current || "").replace(
      /\{name\}/g,
      contact.name
    );

    // 3. Open WhatsApp.
    const number = contact.mobile.replace(/\D/g, "");
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");

    // 4. Mark as sent (onSnapshot updates the UI instantly via local write).
    try {
      await updateContactWaSent(contact.id, user.uid);
    } catch {
      // Surface nothing intrusive on a phone; the card simply stays as pending.
    } finally {
      setSendingId(null);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "sent", label: "Sent" },
  ];

  return (
    <ProtectedRoute>
      <div className={`${dmSans.className} min-h-screen bg-[#0f1117] text-gray-200`}>
        <div className="mx-auto max-w-md">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b border-[#2a2f45] bg-[#0f1117]/95 px-5 pb-4 pt-5 backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">Hello, {name}</h1>
                <p className="mt-1 text-sm text-gray-400">
                  {sent} / {total} sent
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-[#2a2f45] px-2.5 py-1 text-xs text-gray-300 transition active:bg-[#181c27]"
              >
                Logout
              </button>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#181c27]">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </header>

          {/* Filter tabs */}
          <div className="flex gap-2 px-5 pb-2 pt-4">
            {tabs.map(({ key, label }) => {
              const active = tab === key;
              const count =
                key === "all" ? total : key === "sent" ? sent : total - sent;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-[#4f8ef7] text-white"
                      : "border border-[#2a2f45] bg-[#181c27] text-gray-400 active:bg-[#0f1117]"
                  }`}
                >
                  {label}
                  <span className={active ? "opacity-90" : "opacity-60"}>
                    {" "}
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Contact cards */}
          <div className="space-y-4 px-5 pb-10 pt-2">
            {visible.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-500">
                No contacts here.
              </p>
            ) : (
              visible.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-2xl border border-[#2a2f45] bg-[#181c27] p-5 transition"
                >
                  <h2 className="text-lg font-bold leading-tight text-white">
                    {contact.name}
                  </h2>
                  {contact.org && (
                    <p className="mt-0.5 text-sm text-gray-400">{contact.org}</p>
                  )}
                  {contact.mobile && (
                    <p className="mt-1 font-mono text-sm text-gray-500">
                      {contact.mobile}
                    </p>
                  )}

                  <div className="mt-4">
                    {contact.waSent ? (
                      <div className="flex h-[52px] items-center justify-center gap-2 rounded-xl bg-green-500/10 text-sm font-semibold text-green-400 transition">
                        <span className="text-base">✓✓</span> Sent
                      </div>
                    ) : (
                      <button
                        onClick={() => sendWhatsApp(contact)}
                        disabled={sendingId === contact.id}
                        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-green-500 text-base font-semibold text-white transition active:bg-green-600 disabled:opacity-70"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-5 w-5"
                          aria-hidden="true"
                        >
                          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.512 5.26l-.999 3.648 3.736-.979zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                        Send WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
