import { getAuth } from "./firebase";

/**
 * Returns the Authorization header containing the Bearer token of the currently logged-in user.
 * Browser-only helper.
 */
export async function authHeader(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return {};
    
    const token = await user.getIdToken(true);
    return {
      Authorization: `Bearer ${token}`,
    };
  } catch (err) {
    console.error("Failed to generate auth header:", err);
    return {};
  }
}
