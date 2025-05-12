"use client"

import Image from "next/image"
import Link from "next/link"

export function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <Image
        src="/Capacity-Wordmark-white.svg"
        alt="Capacity"
        width={179}
        height={40}
        className="h-10 w-auto"
      />
    </Link>
  )
} 