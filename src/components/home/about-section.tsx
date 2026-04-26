"use client";

import { motion } from "framer-motion";

export function AboutSection() {
  return (
    <section id="about" className="px-6 py-24 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl rounded-3xl border border-white/25 bg-white/15 p-8 shadow-xl backdrop-blur-md md:p-12"
      >
        <div className="text-center">
          <h2 className="mb-8 text-3xl font-bold text-white drop-shadow-lg md:text-4xl">About Steerlo</h2>
          <p className="text-balance text-lg leading-relaxed text-white/80 md:text-xl">
            Steerlo is a student-built platform designed to help students figure out their academic and career direction through guided tools. Whether you&apos;re navigating high school applications or exploring college opportunities, we&apos;re here to help you find your path.
          </p>
        </div>
      </motion.div>
    </section>
  );
}