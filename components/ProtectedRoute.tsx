"use client";

import { type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged } from "@/lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Where to send unauthenticated users. */
  redirectTo?: string;
}

/**
 * Guards client routes: only renders children once a user is authenticated.
 * Redirects to the login page otherwise.
 */
export default function ProtectedRoute({
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (!nextUser) {
        router.replace(redirectTo);
      }
    });
    return () => unsubscribe();
  }, [router, redirectTo]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
