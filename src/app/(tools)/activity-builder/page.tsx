import { ActivityBuilderForm } from "@/components/activity-builder/ActivityBuilderForm";
import { Navbar } from "@/components/home/navbar";

export default function ActivityBuilderPage() {
  return (
    <>
      <div className="fixed inset-0 z-0">
        <video autoPlay muted loop playsInline className="h-full w-full scale-110 object-cover object-[center_35%]">
          <source
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/199692-910996039-Cig4PmUSdlnN2lDe5v3jDPO3hAL2LV.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 bg-[linear-gradient(155deg,_rgba(99,102,241,0.14)_0%,_rgba(59,130,246,0.16)_45%,_rgba(0,0,0,0.05)_100%)] backdrop-blur-[1px]" />
      </div>

      <main className="relative z-10 min-h-screen">
        <Navbar />

        <section className="px-6 pb-20 pt-28 md:pb-24 md:pt-32">
          <div className="mx-auto max-w-4xl space-y-6 text-center md:space-y-8">
            <h1 className="text-4xl font-bold tracking-[0.02em] text-white md:text-5xl">Show Your Impact</h1>
            <p className="mx-auto max-w-2xl text-base text-white/80 md:text-lg">
              Turn your extracurricular activities into compelling college application descriptions. Get AI-powered suggestions to highlight your achievements and growth.
            </p>

            <div className="mx-auto max-w-3xl text-left">
              <ActivityBuilderForm />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
