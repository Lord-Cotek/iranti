import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ìrántí",
    short_name: "Ìrántí",
    description: "Leave your family clarity, not chaos.",
    start_url: "/app/",
    scope: "/",
    display: "standalone",
    background_color: "#0E0F14",
    theme_color: "#0E0F14",
    icons: [
      { src: "/pwa-icon/192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/pwa-icon/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
