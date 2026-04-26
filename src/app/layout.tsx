import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProfileSummaryProvider } from "@/components/profile/ProfileSummaryProvider";
import { SettingsAccess } from "@/components/settings/SettingsAccess";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://steerlo.app"),
  title: {
    default: "Steerlo",
    template: "%s | Steerlo"
  },
  description: "Steerlo helps students build stronger applications with guided writing, profile insights, and planning tools.",
  openGraph: {
    title: "Steerlo",
    description: "Guided high school application tools for essays, activities, and planning.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Steerlo",
    description: "Guided high school application tools for essays, activities, and planning."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a
          href="#main-content"
          className="sr-only z-[60] rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <ProfileSummaryProvider>
            <SettingsAccess />
            {children}
          </ProfileSummaryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
