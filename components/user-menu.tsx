"use client"

import { LogIn, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/auth-context"

export default function UserMenu() {
  const { user, isAuthenticated, userRole, login, logout } = useAuth()

  return (
    <>
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 text-white hover:bg-[rgb(0_125_255)] focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white"
            >
              <User className="h-4 w-4" />
              {user?.name || "User"}
              {userRole === "editor" ? (
                <Badge variant="default" className="ml-1">
                  Editor
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-1">
                  Viewer
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button 
          variant="ghost"
          size="sm" 
          onClick={login}
          className="text-white hover:bg-[rgb(0_125_255)] focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-white"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Login with Google
        </Button>
      )}
    </>
  )
}
