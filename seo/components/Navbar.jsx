"use client";
import Image from "next/image";
import { assets } from "@/lib/assets";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useClerk, UserButton, useUser } from "@clerk/nextjs";

export default function Navbar() {
  const router = useRouter();
  const { user } = useUser();
  const { openSignIn } = useClerk();

  return (
    <div className="fixed z-5 w-full backdrop-blur-2xl flex justify-between items-center py-3 px-4 sm:px-20 xl:px-32">
      <Image
        src={assets.logo}
        alt="Logo"
        width={176}
        height={40}
        className="w-44 sm:w-60 h-auto cursor-pointer"
        onClick={() => router.push("/")}
      />
      {user ? (
        <UserButton />
      ) : (
        <button
          onClick={openSignIn}
          className="flex items-center gap-2 rounded-full text-sm cursor-pointer bg-primary text-white px-10 py-2.5"
        >
          Get started <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
