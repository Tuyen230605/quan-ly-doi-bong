"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { path: "", label: "Trang chủ", icon: "🏠", match: (p: string) => p === "" },
  { path: "/vote", label: "Vote", icon: "🗳️", match: (p: string) => p.startsWith("/vote") || p.startsWith("/toi") },
  { path: "/lich", label: "Lịch", icon: "📅", match: (p: string) => p.startsWith("/lich") || p.startsWith("/tran") },
  { path: "/quy", label: "Quỹ", icon: "💰", match: (p: string) => p.startsWith("/quy") || p.startsWith("/cong-no") },
  { path: "/them", label: "Thêm", icon: "☰", match: () => false },
];

export function BottomNav({ base }: { base: string }) {
  const path = usePathname().slice(base.length);
  const anyActive = ITEMS.slice(0, 4).some((i) => i.match(path));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-2xl grid-cols-5">
        {ITEMS.map((i) => {
          const active = i.path === "/them" ? !anyActive : i.match(path);
          return (
            <Link
              key={i.path}
              href={`${base}${i.path}`}
              className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? "font-semibold text-green-700" : "text-gray-500"}`}
            >
              <span className="text-lg leading-none">{i.icon}</span>
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
