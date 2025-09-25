"use client";
import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { assets } from "@/lib/assets";
import { useRouter } from "next/navigation";
import { SignIn, useUser } from "@clerk/nextjs";

export default function AiLayout({ children }) {
  const router = useRouter();
  const [sidebar, setSidebar] = useState(false);
  const { user } = useUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <SignIn />
      </div>
    );
  }

  return (
    <div className='flex flex-col items-start justify-start h-screen'>
      <nav className='w-full px-8 min-h-14 flex items-center justify-between border-b border-gray-200'>
        <Image
          src={assets.logo}
          alt="logo"
          width={176}
          height={56}
          className="cursor-pointer w-32 sm:w-44 h-auto"
          onClick={() => router.push('/')}
        />
        {sidebar ? (
          <X onClick={() => setSidebar(false)} className='w-6 h-6 text-gray-600 sm:hidden' />
        ) : (
          <Menu onClick={() => setSidebar(true)} className='w-6 h-6 text-gray-600 sm:hidden' />
        )}
      </nav>

      <div className="flex-1 w-full flex h-[calc(100vh-64px)]">
        <Sidebar sidebar={sidebar} setSidebar={setSidebar} />
        <div className="flex-1 bg-[#F4F7FB] overflow-hidden relative z-0">{children}</div>
      </div>
    </div>
  );
}
