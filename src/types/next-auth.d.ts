import type { DefaultSession } from "next-auth";

/**
 * Module augmentation for NextAuth/Auth.js. The app carries a per-user `role`
 * and a `sessionVersion` (used for session revocation) on the authorized user,
 * the session, and the JWT. Declaring them here makes those fields first-class
 * and removes the need for `as { role?: string }` casts throughout auth.ts.
 */
declare module "next-auth" {
    interface User {
        role?: string;
        sessionVersion?: number;
    }

    interface Session {
        user: {
            id: string;
            role?: string;
        } & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        role?: string;
        sessionVersion?: number;
    }
}
