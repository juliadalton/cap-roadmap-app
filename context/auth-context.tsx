"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useSession, signIn, signOut } from "next-auth/react"

interface User {
  id: string 
  name: string | null | undefined
  email?: string | null | undefined
  role: "viewer" | "editor" // Role comes from session now
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  userRole: "viewer" | "editor" | null
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  userRole: null,
  login: () => {},
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status } = useSession()
  const isLoading = status === "loading"

  const userRole = session?.user?.role ?? null 

  const mappedUser: User | null = session?.user 
    ? { 
        id: session.user.id, 
        name: session.user.name,
        email: session.user.email,
        role: userRole || "viewer",
      } 
    : null

  const login = () => {
    signIn("google")
  }

  const logout = () => {
    signOut()
  }

  const value = {
    user: mappedUser,
    isAuthenticated: status === "authenticated",
    isLoading: isLoading,
    userRole: userRole, 
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
