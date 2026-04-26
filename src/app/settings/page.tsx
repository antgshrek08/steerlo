"use client";

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/home/navbar";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <main id="main-content" className="min-h-screen">
      <Navbar />
      <SettingsPanel isOpen={true} onClose={() => router.push("/")} />
    </main>
  );
}