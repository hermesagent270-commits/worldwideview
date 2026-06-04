import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isCloud } from "@/core/edition";

/**
 * POST /api/auth/revoke: "sign out everywhere".
 *
 * Increments the authenticated user's `sessionVersion`, which invalidates every
 * existing JWT issued for that user: the auth `jwt` callback compares each
 * token's embedded version against the DB on its next use and rejects stale
 * ones. Also clears the caller's own session cookie.
 *
 * Requires an authenticated session. Same-origin only in practice: the session
 * cookie is `sameSite=lax`, so a cross-site POST carries no credentials.
 */
export async function POST() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cloud identities are managed by Supabase; there is no local users row to bump.
    if (!isCloud) {
        await prisma.user.update({
            where: { id: userId },
            data: { sessionVersion: { increment: 1 } },
        });
    }

    await signOut({ redirect: false });
    return NextResponse.json({ ok: true });
}
