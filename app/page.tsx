"use client"

import { useEffect } from "react"
import { LogIn, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import Image from "next/image"
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const { user, isAuthenticated, isLoading, login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
        router.replace('/roadmap');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
        <h1 className="text-3xl font-bold mb-4">Welcome to the Capacity Roadmap Site!</h1>
        <p className="text-muted-foreground mb-6">Please log in to view the roadmap content.</p>
        <Button onClick={login} className="mb-8">
          <LogIn className="mr-2 h-4 w-4" />
          Login with Google
        </Button>
        <Image 
          src="/Capacity webinar graphic.png" 
          alt="Capacity Roadmap Graphic"
          width={400}
          height={400}
          className="rounded-lg shadow-md"
          priority
        />
      </div>
    )
  }

  return (
     <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Redirecting...</span>
      </div>
  ); 
}
