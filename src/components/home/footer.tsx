import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-3">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/steerlo%20logo-iAJlxlaPrYxpZth5b2pp7C8P4Zd0Lf.png"
            alt="Steerlo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-sm text-white/70">© {new Date().getFullYear()} Steerlo. Built for students, by a student.</span>
        </div>
      </div>
    </footer>
  );
}