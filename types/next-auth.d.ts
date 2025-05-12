import type { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      /** The user's role. */
      role?: "editor" | "viewer";
    } & DefaultSession["user"]; // Keep existing properties
  }

  // Optional: If you need role/id on the User object passed to callbacks
  // interface User extends DefaultUser {
  //   id: string;
  //   role?: "editor" | "viewer";
  // }
}

// Augment the JWT type
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "editor" | "viewer";
  }
} 