import type { DefaultSession } from "next-auth";

/**
 * Module augmentation for Auth.js (NextAuth v5).
 *
 * - Session.user always carries `id` (mirrored from the JWT `sub` claim in
 *   the session callback in src/lib/auth/auth.ts).
 * - JWT identity fields (`email`, `name`) may legitimately be `null` for
 *   username-only accounts; DefaultJWT already types them `string | null`,
 *   so only the Session surface needs augmenting.
 */
declare module "next-auth" {
  interface Session {
    user: {
      /** Stable user id (JWT `sub`). */
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Optional readable mirror of `sub` for callbacks/logging. */
    id?: string;
  }
}