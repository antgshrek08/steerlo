"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Settings2 } from "lucide-react";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export function SettingsAccess() {
  const pathname = usePathname();

  if (pathname === "/settings") {
    return null;
  }

  return <SettingsAccessInner key={pathname} />;
}

function SettingsAccessInner() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-4 z-[70] inline-flex items-center justify-center rounded-full border border-white/15 bg-black/35 p-2 text-white/90 shadow-lg backdrop-blur-md transition hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        aria-label="Open account settings"
      >
        <Settings2 className="h-4 w-4" aria-hidden="true" />
      </button>

      <SettingsPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}