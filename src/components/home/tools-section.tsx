"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Globe, GraduationCap } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";

const tools = [
  {
    title: "High School Tools",
    description: "Essays, applications, and planning your next step",
    icon: GraduationCap,
    href: "/high-school-tools"
  },
  {
    title: "College Tools",
    description: "Study abroad, majors, and long-term planning",
    icon: Globe,
    href: "#",
    comingSoon: true
  }
];

export function ToolsSection() {
  const router = useRouter();
  const { authModalOpen, authMode, closeAuthModal, loading, openAuthModal, setAuthMode, user } = useAuth();

  function handleAuthSuccess() {
    router.push("/high-school-tools");
  }

  function handleHighSchoolToolsClick() {
    if (loading) {
      return;
    }

    if (user) {
      router.push("/high-school-tools");
      return;
    }

    openAuthModal("signup");
  }

  return (
    <section id="tools" className="px-6 py-24 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-5xl rounded-3xl border border-white/25 bg-white/15 p-8 shadow-xl backdrop-blur-md md:p-12"
      >
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white drop-shadow-lg md:text-4xl">Choose your stage</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {tools.map((tool, index) => (
            tool.comingSoon ? (
              <div key={tool.title} className="block h-full focus-visible:outline-none">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  className="group relative h-full rounded-2xl border border-white/20 bg-white/15 p-8 opacity-80 transition-all duration-300 md:p-10"
                >
                  <div className="flex h-full flex-col items-center text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/35 transition-colors duration-300 group-hover:bg-indigo-500/50">
                      <tool.icon className="h-8 w-8 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-white md:text-2xl">{tool.title}</h3>
                    <p className="text-white/70">{tool.description}</p>
                    <span className="mt-4 rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/80">
                      Coming Soon
                    </span>
                  </div>
                </motion.div>
              </div>
            ) : (
              <button
                key={tool.title}
                type="button"
                onClick={handleHighSchoolToolsClick}
                aria-label={`Open ${tool.title}`}
                className="block h-full w-full text-left focus-visible:outline-none"
              >
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className="group relative h-full cursor-pointer rounded-2xl border border-white/20 bg-white/15 p-8 transition-all duration-300 hover:border-white/30 hover:bg-white/20 md:p-10"
                >
                  <div className="flex h-full flex-col items-center text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/35 transition-colors duration-300 group-hover:bg-indigo-500/50">
                      <tool.icon className="h-8 w-8 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-white md:text-2xl">{tool.title}</h3>
                    <p className="text-white/70">{tool.description}</p>
                    <span className="mt-4 rounded-full border border-emerald-300/35 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-100">
                      Available Now
                    </span>
                  </div>
                </motion.div>
              </button>
            )
          ))}
        </div>
      </motion.div>

      <AuthModal
        isOpen={authModalOpen}
        mode={authMode}
        onModeChange={setAuthMode}
        onClose={closeAuthModal}
        onSuccess={handleAuthSuccess}
      />
    </section>
  );
}