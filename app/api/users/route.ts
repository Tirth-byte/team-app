import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, verifyAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create a new user (Auth account + Firestore profile with role "user"). */
export async function POST(request: Request) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const password = body.password;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email and password are required." },
      { status: 400 }
    );
  }

  try {
    const userRecord = await getAdminAuth().createUser({
      email,
      password,
      displayName: name,
    });

    await getAdminDb().collection("users").doc(userRecord.uid).set({
      name,
      email,
      role: "user",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ uid: userRecord.uid });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
