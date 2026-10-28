import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const font = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quản lý đội bóng",
  description: "Lịch đá, vote, điểm danh, quỹ bóng và quỹ phạt của đội",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Đội bóng", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#166534",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${font.className} min-h-dvh antialiased`}>{children}</body>
    </html>
  );
}
