import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

type ToolCardProps = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  ctaText: string;
};

export function ToolCard({ title, description, href, icon: Icon, ctaText }: ToolCardProps) {
  return (
    <Link
      href={href}
      aria-label={`Open ${title}`}
      className="group relative flex h-full flex-col rounded-2xl border border-white/20 bg-white/10 p-8 shadow-[0_8px_28px_rgba(15,23,42,0.25)] backdrop-blur-lg transition-all duration-300 hover:scale-105 hover:border-indigo-300/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-300/20 via-sky-300/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />

      <div className="relative mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-indigo-100 transition-colors duration-300 group-hover:bg-indigo-400/20 group-focus-visible:bg-indigo-400/20">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      <h2 className="relative text-xl font-semibold tracking-tight text-white">{title}</h2>
      <p className="relative mt-3 flex-1 text-sm leading-6 text-white/75">{description}</p>

      <span className="relative mt-8 inline-flex items-center gap-2 text-sm font-semibold text-indigo-100">
        {ctaText}
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}