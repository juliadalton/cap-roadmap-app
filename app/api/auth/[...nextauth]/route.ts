import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Initialize NextAuth handler with options
const handler = NextAuth(authOptions)

// Export handler for GET and POST
export { handler as GET, handler as POST } 