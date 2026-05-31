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
      <div className={`${dmSans.className} min-h-screen bg-[#07090e] text-gray-200 antialiased`}>
        {/* Subtle background glow */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 h-[350px] w-full max-w-md bg-blue-500/5 blur-[80px] pointer-events-none z-0" />

        <div className="relative z-10 mx-auto max-w-md min-h-screen flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-white/5 bg-[#07090e]/80 px-5 pb-5 pt-6 backdrop-blur-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Hello, {name}</h1>
                <p className="mt-0.5 text-xs text-gray-400 font-medium">
                  Progress: {sent} of {total} messages sent
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-300 transition duration-200 hover:bg-white/5 hover:text-white active:scale-95"
              >
                Logout
              </button>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/[0.03] border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_10px_rgba(52,211,153,0.3)] transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </header>

          {/* Filter tabs */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex gap-1.5 p-1 rounded-2xl bg-white/[0.02] border border-white/5">
              {tabs.map(({ key, label }) => {
                const active = tab === key;
                const count =
                  key === "all" ? total : key === "sent" ? sent : total - sent;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition duration-200 ${
                      active
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10"
                        : "text-gray-400 hover:bg-white/[0.02] hover:text-white"
                    }`}
                  >
                    {label}
                    <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-white/5 text-gray-500"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact cards */}
          <div className="flex-1 space-y-4 px-5 pb-12 pt-2">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-3xl mb-2">🎉</span>
                <p className="text-sm font-medium text-gray-500">
                  No contacts found in this filter.
                </p>
              </div>
            ) : (
              visible.map((contact) => (
                <div
                  key={contact.id}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] p-5 shadow-lg transition duration-300 hover:border-blue-500/20 hover:bg-white/[0.04]"
                >
                  <h2 className="text-base font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors duration-200">
                    {contact.name}
                  </h2>
                  {contact.org && (
                    <p className="mt-1 text-xs text-gray-400 font-medium flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-indigo-500" />
                      {contact.org}
                    </p>
                  )}
                  {contact.mobile && (
                    <p className="mt-1 font-mono text-xs text-gray-500">
                      {contact.mobile}
                    </p>
                  )}

                  <div className="mt-4">
                    {contact.waSent ? (
                      <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500/10 text-xs font-bold text-emerald-400">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Message Sent
                      </div>
                    ) : (
                      <button
                        onClick={() => sendWhatsApp(contact)}
                        disabled={sendingId === contact.id}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-xs font-bold text-white shadow-md shadow-emerald-500/10 transition duration-200 hover:from-emerald-400 hover:to-green-500 active:scale-[0.98] disabled:opacity-50"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-4 w-4"
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
