import type { MetadataRoute } from "next";
import { INSTITUTE } from "@/config/institute";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${INSTITUTE.shortName} Attendance`,
    short_name: `${INSTITUTE.shortName} Attendance`,
    description: `Attendance and student portal for the ${INSTITUTE.name}.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#2E1A8A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
