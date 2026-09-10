import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { normalizeGuardianSearchName } from "@/lib/server/guardian-auth";

export const runtime = "nodejs";

type SearchStudent = {
  id: string;
  active?: boolean;
  guardianAccessEnabled?: boolean;
  name?: unknown;
  className?: unknown;
};

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
  const raw = typeof body?.query === "string" ? body.query : "";
  const query = normalizeGuardianSearchName(raw).slice(0, 60);
  if (query.length < 2) return NextResponse.json({ students: [] });

  const db = getAdminDb();
  const snap = await db
    .collection(firestoreCollectionName("students"))
    .where("guardianSearchName", ">=", query)
    .where("guardianSearchName", "<", `${query}\uf8ff`)
    .limit(20)
    .get();

  const students = snap.docs
    .map((doc): SearchStudent => ({ id: doc.id, ...(doc.data() as Omit<SearchStudent, "id">) }))
    .filter((student) => student.active === true)
    .slice(0, 8)
    .map((student) => ({
      id: student.id,
      name: String(student.name ?? ""),
      className: String(student.className ?? ""),
    }));

  return NextResponse.json({ students });
}
