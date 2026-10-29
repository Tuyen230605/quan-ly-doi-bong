"use client";
/* eslint-disable @next/next/no-img-element */

import { useSyncExternalStore } from "react";

const KEY = "fb_bank_app";

function readLast() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function remember(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}

export type BankAppLink = { id: string; name: string; icon: string; autofill: boolean; href: string };

/** Lưới app ngân hàng: bấm vào là mở app của người chuyển. App dùng lần trước lên đầu, app ít dùng thu gọn. */
export function BankApps({ links, shown = 9 }: { links: BankAppLink[]; shown?: number }) {
  const last = useSyncExternalStore(subscribe, readLast, () => null);
  const ordered = last ? [...links].sort((a, b) => Number(b.id === last) - Number(a.id === last)) : links;
  const tile = (l: BankAppLink) => (
    <a
      key={l.id}
      href={l.href}
      onClick={() => remember(l.id)}
      data-app={l.id}
      className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center active:scale-[.98] ${
        l.id === last ? "border-green-600 bg-green-50" : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <img src={l.icon} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-11 rounded-xl bg-gray-100" />
      <span className="text-xs leading-tight font-semibold text-gray-800">{l.name}</span>
      {l.autofill ? (
        <span className="text-[10px] leading-tight text-green-700">⚡ điền sẵn</span>
      ) : (
        <span className="text-[10px] leading-tight text-gray-400">chỉ mở app</span>
      )}
      {l.id === last && <span className="text-[10px] leading-tight text-green-700">lần trước</span>}
    </a>
  );
  const grid = "grid grid-cols-3 gap-2 sm:grid-cols-4";
  return (
    <>
      <div className={grid}>{ordered.slice(0, shown).map(tile)}</div>
      {ordered.length > shown && (
        <details className="mt-2">
          <summary className="cursor-pointer py-1 text-center text-sm font-semibold text-green-800">
            Ngân hàng khác ({ordered.length - shown})
          </summary>
          <div className={`${grid} mt-2`}>{ordered.slice(shown).map(tile)}</div>
        </details>
      )}
    </>
  );
}
