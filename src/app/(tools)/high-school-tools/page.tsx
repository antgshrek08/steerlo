"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Bolt, PenLine, TrendingUp } from "lucide-react";
import Image from "next/image";
import { Navbar } from "@/components/home/navbar";
import { ProfileSummaryDashboard } from "@/components/profile/ProfileSummaryDashboard";
import { ToolCard } from "@/components/tools/ToolCard";
import { VideoBackground } from "@/components/layout/VideoBackground";

const tools = [
  {
    title: "Find Your Story",
    description: "Discover meaningful story ideas for your college essays",
    href: "/tools/essay-starter",
    icon: PenLine,
    ctaText: "Start Writing"
  },
  {
    title: "Know Your Chances",
    description: "Estimate your chances at colleges based on your stats",
    href: "/tools/college-chances",
    icon: TrendingUp,
    ctaText: "Check Chances"
  },
  {
    title: "Show Your Impact",
    description: "Turn your activities into strong application descriptions",
    href: "/tools/activity-builder",
    icon: Bolt,
    ctaText: "Build Activities"
  }
];

export default function HighSchoolToolsPage() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <VideoBackground
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/199692-910996039-Cig4PmUSdlnN2lDe5v3jDPO3hAL2LV.mp4"
        videoClassName="h-full w-full scale-110 object-cover object-[center_25%]"
        overlayClassName="bg-black/70"
        gradientClassName="bg-[linear-gradient(140deg,_rgba(59,130,246,0.14)_0%,_rgba(99,102,241,0.16)_38%,_rgba(0,0,0,0.05)_100%)] backdrop-blur-[1.5px]"
      />

      <main id="main-content" className="relative z-10 min-h-screen">
        <Navbar />

        <section className="px-6 pb-20 pt-28 md:pb-24 md:pt-32">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="mx-auto max-w-3xl text-center"
            >
              <Image
                src="/steerlo%20name.png"
                alt="Steerlo"
                width={560}
                height={160}
                className="mx-auto -mb-4 h-auto w-full max-w-[280px] opacity-90 drop-shadow-[0_2px_10px_rgba(15,23,42,0.35)] md:-mb-5 md:max-w-[320px]"
                priority
              />
              <h1 className="mt-0 text-5xl font-bold tracking-[0.02em] text-white md:text-6xl">High School Tools</h1>
              <p className="mx-auto mt-5 max-w-2xl text-base text-white/80 md:text-xl">
                Explore tools to help you plan your college path
              </p>
            </motion.div>

            <div id="tools" className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
              {tools.map((tool, index) => (
                <motion.div
                  key={tool.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.08 }}
                >
                  <ToolCard {...tool} />
                </motion.div>
              ))}
            </div>

            <ProfileSummaryDashboard />
          </div>
        </section>
      </main>
    </>
  );
}