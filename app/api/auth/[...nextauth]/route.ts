import NextAuth, { type Session, type User, type NextAuthOptions } from "next-auth"
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google"
import { JWT } from "next-auth/jwt"
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

// Read editor emails from environment variable
const editorEmails = process.env.EDITOR_EMAILS?.split(",") || []

// Define Auth Options (Original v4 structure)
const authOptions: NextAuthOptions = {
  // Use the v5 adapter for now, cast as v4 Adapter type. If issues arise, we might need @next-auth/prisma-adapter
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string, // Add back type assertion
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, // Add back type assertion
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET, // Add back secret if needed for v4
  session: { strategy: "jwt" },
  callbacks: {
    // Original v4 JWT callback
    async jwt({ token, user }) { // Simplified args based on original code, added types later if needed
      if (user) { 
        token.id = user.id;
        token.role = (user.email && editorEmails.includes(user.email)) ? "editor" : "viewer";
      }
      return token;
    },
    // Original v4 Session callback
    async session({ session, token }) { 
      if (session?.user) {
        // Assign ID from token.id (as stored in JWT callback) or token.sub if preferred
        session.user.id = token.id as string; // Use token.id as per original jwt callback logic
        session.user.role = token.role as "editor" | "viewer";
      }
      return session;
    },
  },
}

// Initialize NextAuth handler with options (Original v4 way)
const handler = NextAuth(authOptions)

// Export handler for GET and POST (Original v4 way)
export { handler as GET, handler as POST } 