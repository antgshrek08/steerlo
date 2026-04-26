"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

export function Hero() {
  const { scrollY } = useScroll();
  const iconOpacity = useTransform(scrollY, [0, 400], [0.35, 0]);
  const iconScale = useTransform(scrollY, [0, 400], [1, 1.1]);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <motion.div
        style={{ opacity: iconOpacity, scale: iconScale }}
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
      >
        <div className="relative h-[520px] w-[1200px] select-none md:h-[680px] md:w-[1550px] lg:h-[860px] lg:w-[2000px]">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/steerlo%20logo-iAJlxlaPrYxpZth5b2pp7C8P4Zd0Lf.png"
            alt=""
            fill
            className="object-contain drop-shadow-2xl"
            sizes="(max-width: 640px) 1200px, (max-width: 1024px) 1550px, 2000px"
            priority
          />
        </div>
      </motion.div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center drop-shadow-lg">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-balance text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl"
        >
          Steer your path.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mx-auto mt-6 max-w-2xl text-balance text-lg text-white/80 md:text-xl"
        >
          A tool built <span className="font-semibold text-indigo-200">FOR</span> students <span className="font-semibold text-indigo-200">BY</span> a student to help <span className="font-semibold text-indigo-200">YOU</span> steer your path.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-white/70">Scroll down</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/30 p-2"
        >
          <motion.div className="h-2 w-1 rounded-full bg-white/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}