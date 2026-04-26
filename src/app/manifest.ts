import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Steerlo",
    short_name: "Steerlo",
    description: "Guided high school application tools for essays, activities, and planning.",
    start_url: "/",
    display: "standalone",
    background_color: "#2f4a67",
    theme_color: "#2f4a67",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
