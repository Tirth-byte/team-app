import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, verifyAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Delete user or reset user tasks depending on the 'action' query param. */
export async function DELETE(request: Request) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Last path segment of /api/users/<uid>.
  const uid = new URL(request.url).pathname.split("/").pop() ?? "";
  if (!uid) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "reset"; // Default to reset/clear tasks

  try {
    const db = getAdminDb();

    if (action === "remove") {
      // Remove the Auth account. Ignore "not found" so we can still clean up the doc.
      try {
        await getAdminAuth().deleteUser(uid);
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code !== "auth/user-not-found") throw err;
      }

      // Find pending contacts/tasks assigned to this user and unassign them
      const contactsSnapshot = await db
        .collection("contacts")
        .where("assignedTo", "==", uid)
        .where("waSent", "==", false)
        .get();

      if (!contactsSnapshot.empty) {
        const batch = db.batch();
        contactsSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { assignedTo: null });
        });
        await batch.commit();
      }

      // Delete user document from users collection
      await db.collection("users").doc(uid).delete();
      
    } else {
      // Default action is "reset" -> Return only pending user tasks back to the unassigned pool
      const [assignedSnap, sentSnap] = await Promise.all([
        db.collection("contacts").where("assignedTo", "==", uid).where("waSent", "==", false).get(),
        db.collection("contacts").where("waSentBy", "==", uid).where("waSent", "==", false).get()
      ]);

      const docRefsMap = new Map<string, FirebaseFirestore.DocumentReference>();

      assignedSnap.docs.forEach((doc) => {
        docRefsMap.set(doc.id, doc.ref);
      });
      sentSnap.docs.forEach((doc) => {
        docRefsMap.set(doc.id, doc.ref);
      });

      const docRefs = Array.from(docRefsMap.values());

      if (docRefs.length > 0) {
        for (let i = 0; i < docRefs.length; i += 450) {
          const chunk = docRefs.slice(i, i + 450);
          const batch = db.batch();
          chunk.forEach((ref) => {
            batch.update(ref, {
              assignedTo: null,
              waSent: false,
              waSentAt: null,
              waSentBy: null
            });
          });
          await batch.commit();
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : `Failed to ${action} user.`;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
