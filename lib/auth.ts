import { type NextAuthOptions } from "next-auth"
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

// Read editor emails from environment variable
const editorEmails = process.env.EDITOR_EMAILS?.split(",") || []

// Define Auth Options that can be imported by other files
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { 
        token.id = user.id;
        token.role = (user.email && editorEmails.includes(user.email)) ? "editor" : "viewer";
      }
      return token;
    },
    async session({ session, token }) { 
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "editor" | "viewer";
      }
      return session;
    },
  },
}
