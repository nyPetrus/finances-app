import type { MetadataRoute } from "next";

// Lets Android's "Add to home screen" use the app icon (icon.tsx) instead
// of a letter/screenshot fallback. Excluded from the auth redirect in
// src/proxy.ts — the browser fetches it without the session cookie.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finances",
    short_name: "Finances",
    description: "Personal finance and budget tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#059669",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
