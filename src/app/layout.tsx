import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PostHogInit } from "@/components/analytics/PostHogInit";
import { ProfileSummaryProvider } from "@/components/profile/ProfileSummaryProvider";
import { SettingsAccess } from "@/components/settings/SettingsAccess";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://steerlo.app"),
  applicationName: "Steerlo",
  title: {
    default: "Steerlo",
    template: "%s | Steerlo"
  },
  description: "Steerlo helps students build stronger applications with guided writing, profile insights, and planning tools.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Steerlo",
    statusBarStyle: "black-translucent"
  },
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2f4a67" },
    { media: "(prefers-color-scheme: dark)", color: "#2f4a67" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <PostHogInit />
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

