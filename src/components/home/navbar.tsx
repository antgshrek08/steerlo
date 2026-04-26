"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isHighSchoolToolsPage = pathname === "/high-school-tools";
  const isToolPage = ["/brainstorm", "/essay"].includes(pathname) || pathname.startsWith("/tools/");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/35 shadow-sm backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" aria-label="Primary">
        <Link href="/" aria-label="Go to homepage" className="relative flex h-10 w-[140px] items-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/steerlo-logo-ohw65ryHklDmor0LvPdUqfyjKswNKm.png"
            alt="Steerlo"
            fill
            className="object-contain object-left"
            sizes="140px"
            priority
          />
        </Link>

        {isHomePage ? (
          <>
            <ul className="hidden items-center gap-8 md:flex">
              {[
                { label: "Tools", id: "tools" },
                { label: "About Us", id: "about" },
                { label: "Contact", id: "contact" }
              ].map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => scrollToSection(item.id)}
                    className="text-sm font-medium text-white/80 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-black/20 p-2 text-white/90 transition hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:hidden"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </>
        ) : isHighSchoolToolsPage ? (
          <Link href="/#tools" className="text-sm font-medium text-white/80 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
            {"\u2190"} Back to Tools
          </Link>
        ) : isToolPage ? (
          <Link
            href="/high-school-tools"
            className="text-sm font-medium text-white/80 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            {"\u2190"} Back to HS Tools
          </Link>
        ) : null}
      </nav>

      {isHomePage && mobileOpen ? (
        <div className="border-t border-white/10 bg-black/40 px-6 py-4 backdrop-blur-md md:hidden">
          <ul className="space-y-3">
            {[
              { label: "Tools", id: "tools" },
              { label: "About Us", id: "about" },
              { label: "Contact", id: "contact" }
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    scrollToSection(item.id);
                    setMobileOpen(false);
                  }}
                  className="w-full text-left text-sm font-medium text-white/85 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </motion.header>
  );
}