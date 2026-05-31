import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, verifyAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Delete a user from both Firebase Auth and the Firestore users collection. */
export async function DELETE(request: Request) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Last path segment of /api/users/<uid>.
  const uid = new URL(request.url).pathname.split("/").pop() ?? "";
  if (!uid) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  try {
    // Remove the Auth account. Ignore "not found" so we can still clean up the doc.
    try {
      await getAdminAuth().deleteUser(uid);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/user-not-found") throw err;
    }

    await getAdminDb().collection("users").doc(uid).delete();

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
