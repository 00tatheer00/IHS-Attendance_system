import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { RouteProgress } from "@/components/layout/route-progress";
import { NetworkStatus } from "@/components/layout/network-status";
import { Suspense } from "react";
import { INSTITUTE } from "@/config/institute";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${INSTITUTE.shortName} Attendance`, template: `%s · ${INSTITUTE.shortName} Attendance` },
  description: `Attendance and student portal for the ${INSTITUTE.name}.`,
  applicationName: `${INSTITUTE.shortName} Attendance`,
  appleWebApp: { capable: true, title: `${INSTITUTE.shortName} Attendance`, statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
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
