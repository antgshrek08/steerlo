"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";

type CollegeOptionCollege = {
  id: string;
  name: string;
  logo?: string;
  domain?: string;
};

type CollegeOptionProps = {
  college: CollegeOptionCollege;
  selected: boolean;
  onToggle: (id: string) => void;
};

const defaultLogoPath = "/college-default-logo.svg";
const logoExtensions = ["png", "svg"] as const;
const acronymStopWords = new Set(["the", "of", "and", "at", "for"]);

function normalizeLogoPath(path: string | undefined) {
  if (!path) {
    return "";
  }

  const value = path.trim();
  if (!value) {
    return "";
  }

  if (value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/")) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  return `/${value.replace(/^\/+/, "")}`;
}

function buildCollegeAcronym(name: string) {
  const words = name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ""))
    .filter((word) => Boolean(word) && !acronymStopWords.has(word));

  return words.map((word) => word[0]).join("");
}

function buildLocalLogoCandidates(college: CollegeOptionCollege) {
  const idValue = college.id.trim().toLowerCase();
  const acronym = buildCollegeAcronym(college.name);

  // Keep this list short to avoid a long chain of failed 404 requests.
  const bases = [
    acronym ? `/college-logos/${acronym}-logo` : "",
    acronym ? `/${acronym}-logo` : "",
    `/college-logos/${idValue}-logo`,
    `/${idValue}-logo`,
    acronym ? `/college-logos/${acronym}` : "",
    acronym ? `/${acronym}` : "",
    `/college-logos/${idValue}`,
    `/${idValue}`
  ].filter(Boolean);

  const candidates = bases.flatMap((base) => logoExtensions.map((extension) => `${base}.${extension}`));
  return candidates.filter((value, index, array) => array.indexOf(value) === index);
}

export function CollegeOption({ college, selected, onToggle }: CollegeOptionProps) {
  const localLogoCandidates = useMemo(() => buildLocalLogoCandidates(college), [college]);
  const clearbitLogoUrl = normalizeLogoPath(college.logo);
  const googleFaviconUrl = college.domain
    ? `https://www.google.com/s2/favicons?domain=${college.domain}&sz=64`
    : "";

  const logoSources = useMemo(() => {
    return [clearbitLogoUrl, ...localLogoCandidates, googleFaviconUrl, defaultLogoPath].filter(
      (value, index, array) => Boolean(value) && array.indexOf(value) === index
    );
  }, [localLogoCandidates, clearbitLogoUrl, googleFaviconUrl]);

  const [logoSourceIndex, setLogoSourceIndex] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);

  function handleLogoError() {
    if (logoSourceIndex < logoSources.length - 1) {
      setLogoSourceIndex((current) => current + 1);
      return;
    }

    setLogoFailed(true);
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(college.id)}
      aria-pressed={selected}
      className={`flex h-14 w-full items-center gap-3 rounded-xl border px-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 ${
        selected
          ? "border-indigo-300/55 bg-indigo-500/20 shadow-[0_0_18px_rgba(99,102,241,0.2)]"
          : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/40"
      }`}
    >
      {logoFailed ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/10 text-[10px] font-semibold uppercase text-white/75">
          {college.name
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSources[logoSourceIndex] || defaultLogoPath}
          alt={`${college.name} logo`}
          onError={handleLogoError}
          loading="eager"
          decoding="async"
           className="h-8 w-8 rounded-md border border-white/20 bg-slate-900/85 object-scale-down p-1 flex-shrink-0"
        />
      )}
      <span className="flex-1 text-sm font-medium text-white/90">{college.name}</span>
      {selected ? (
        <Check className="h-4 w-4 text-indigo-200" aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className="h-4 w-4 rounded border border-white/40 bg-transparent" />
      )}
    </button>
  );
}