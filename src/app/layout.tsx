import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { RouteProgress } from "@/components/layout/route-progress";
import { NetworkStatus } from "@/components/layout/network-status";
import { Suspense } from "react";
import { INSTITUTE } from "@/config/institute";
import { SITE, siteUrl } from "@/config/site";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const fullTitle = `${SITE.title} by ${SITE.author}`;

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: fullTitle, template: `%s · ${SITE.title}` },
  description: SITE.description,
  applicationName: SITE.title,
  authors: [{ name: SITE.author }],
  creator: SITE.author,
  keywords: ["IHS", "Institute of Health Sciences", "Peshawar", "attendance", "student portal", "ID card"],
  appleWebApp: { capable: true, title: `${INSTITUTE.shortName} Attendance`, statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  // Link previews (WhatsApp, Facebook, X, Telegram…). Image: public/og.jpg (design in app/og/route.tsx).
  openGraph: {
    type: "website",
    siteName: fullTitle,
    title: `${fullTitle} 🎓`,
    description: `${SITE.tagline} — ${INSTITUTE.name}, Peshawar. Search your name, no login needed.`,
    locale: "en_PK",
    url: "/",
    images: [{ url: "/og.jpg", width: 1200, height: 630, type: "image/jpeg", alt: `${fullTitle} — ${SITE.tagline}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: fullTitle,
    description: SITE.tagline,
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#2E1A8A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster theme="light" position="top-center" richColors closeButton toastOptions={{ className: "rounded-2xl!" }} />
        <NetworkStatus />
        <ServiceWorker />
      </body>
    </html>
  );
}
