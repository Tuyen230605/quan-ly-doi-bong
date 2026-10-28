import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quản lý đội bóng",
    short_name: "Đội bóng",
    start_url: "/",
    display: "standalone",
    background_color: "#eef2ec",
    theme_color: "#166534",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
