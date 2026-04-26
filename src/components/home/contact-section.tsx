"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { ContactModal } from "@/components/home/contact-modal";

export function ContactSection() {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <section id="contact" className="px-6 py-24 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl rounded-3xl border border-white/25 bg-white/15 p-8 shadow-xl backdrop-blur-md md:p-12"
      >
        <div className="text-center">
          <h2 className="mb-6 text-3xl font-bold text-white drop-shadow-lg md:text-4xl">Get in Touch</h2>
          <p className="mb-8 text-lg text-white/80">Have questions or feedback? We&apos;d love to hear from you.</p>
          <motion.button
            type="button"
            onClick={() => setContactModalOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 font-medium text-white shadow-sm transition-shadow duration-200 hover:bg-indigo-500 hover:shadow-md"
          >
            <Mail className="h-5 w-5" />
            Contact Us
          </motion.button>
        </div>
      </motion.div>

      <ContactModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} />
    </section>
  );
}