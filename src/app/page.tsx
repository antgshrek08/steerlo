import { Navbar } from "@/components/home/navbar";
import { Hero } from "@/components/home/hero";
import { ToolsSection } from "@/components/home/tools-section";
import { AboutSection } from "@/components/home/about-section";
import { ContactSection } from "@/components/home/contact-section";
import { Footer } from "@/components/home/footer";
import { VideoBackground } from "@/components/layout/VideoBackground";

export default function HomePage() {
  return (
    <>
      <VideoBackground
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/199692-910996039-Cig4PmUSdlnN2lDe5v3jDPO3hAL2LV.mp4"
        overlayClassName="bg-black/35"
      />

      <main id="main-content" className="relative z-10">
        <Navbar />
        <Hero />
        <ToolsSection />
        <AboutSection />
        <ContactSection />
        <Footer />
      </main>
    </>
  );
}
