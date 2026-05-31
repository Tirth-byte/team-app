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
      className={`${dmSans.className} flex min-h-screen items-center justify-center bg-[#0f1117] px-4 py-10`}
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#2a2f45] bg-[#181c27] p-8 shadow-xl">
        {/* Logo / title */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4f8ef7]/15 text-[#4f8ef7]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Hackathon Team</h1>
          <p className="mt-1 text-sm text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300"
            >
              Email
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
              className="w-full rounded-lg border border-[#2a2f45] bg-[#0f1117] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#4f8ef7] focus:ring-1 focus:ring-[#4f8ef7] disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300"
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
              className="w-full rounded-lg border border-[#2a2f45] bg-[#0f1117] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-[#4f8ef7] focus:ring-1 focus:ring-[#4f8ef7] disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4f8ef7] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#3d7ce5] focus:outline-none focus:ring-2 focus:ring-[#4f8ef7] focus:ring-offset-2 focus:ring-offset-[#181c27] disabled:cursor-not-allowed disabled:opacity-70"
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
            <p className="text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
