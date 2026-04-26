"use client";

import Image from "next/image";
import Link from "next/link";

export function NavBar() {
  return (
    <header className="relative border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="pointer-events-none absolute inset-x-0 -top-7 z-10 sm:-top-6">
        <div className="mx-auto w-full max-w-4xl px-3 sm:px-4">
          <Link
            className="pointer-events-auto inline-flex shrink-0 items-center"
            href="/"
            aria-label="Steerlo home"
          >
            <Image
              alt="Steerlo"
              className="h-24 w-auto object-contain object-left sm:h-28 md:h-32"
              height={128}
              priority
              src="/steerlo-logo.png"
              style={{ height: "auto", width: "auto" }}
              sizes="(max-width: 640px) 320px, (max-width: 1024px) 420px, 520px"
              width={520}
            />
          </Link>
        </div>
      </div>

      <nav className="mx-auto flex w-full max-w-4xl items-center justify-end px-3 pb-2 pt-1 sm:px-4 sm:pb-2.5 sm:pt-1.5">
        <div className="flex items-center gap-1 text-sm font-medium text-[var(--accent)] sm:gap-2">
          <Link className="rounded px-2 py-1 transition hover:bg-slate-100 hover:text-[var(--accent-strong)]" href="/">
            Home
          </Link>
          <Link className="rounded px-2 py-1 transition hover:bg-slate-100 hover:text-[var(--accent-strong)]" href="/essay">
            Essay Tool
          </Link>
        </div>
      </nav>
    </header>
  );
}
