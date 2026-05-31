"use client";
export const dynamic = "force-dynamic";

import { DM_Sans } from "next/font/google";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { login } from "@/lib/auth";
import { getDb } from "@/lib/firebase";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Authenticate with Firebase.
      const { user } = await login(email, password);

      // 2. Look up the user's profile/role in Firestore.
      const snapshot = await getDoc(doc(getDb(), "users", user.uid));
      const role = snapshot.exists()
        ? (snapshot.data().role as string | undefined)
        : undefined;

      // 3 & 4. Route based on role.
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "user") {
        router.push("/user");
      } else {
        setError("Your account has no assigned role. Contact an administrator.");
        setLoading(false);
      }
    } catch (err) {
      // 5. Surface failures.
      setError(
        err instanceof Error
          ? "Invalid email or password."
          : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <main
      className={`${dmSans.className} relative flex min-h-screen items-center justify-center bg-[#07090e] px-4 py-10 overflow-hidden`}
    >
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        {/* Logo / title */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center rounded-2xl p-2 transition-transform duration-300 hover:scale-105">
            <img
              src="/logo.png"
              alt="Xinity Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white to-gray-300">
            Xinity
          </h1>
          <p className="mt-1.5 text-sm text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition duration-200 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {loading && (
              <svg
                className="h-4 w-4 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {loading ? "Signing in…" : "Sign In"}
          </button>

          {error && (
            <p className="text-center text-xs font-medium text-red-400" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
