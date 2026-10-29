"use client";
/* eslint-disable @next/next/no-img-element */

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";

/** Vẽ mã VietQR kèm chú thích thành 1 ảnh để tải về / gửi Zalo. */
export function QrCard({
  payload,
  image,
  title,
  lines,
  fileName,
  copies = [],
  size = "md",
  actions = true,
}: {
  payload: string | null;
  image?: string | null;
  title: string;
  lines: string[];
  fileName: string;
  copies?: { label: string; value: string }[];
  size?: "sm" | "md";
  actions?: boolean; // false: chỉ hiện ảnh QR, không có nút tải ảnh / copy
}) {
  const [src, setSrc] = useState<string | null>(payload ? null : (image ?? null));
  const linesKey = lines.join("\n");

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    (async () => {
      const qr = await QRCode.toDataURL(payload, { margin: 1, width: 480, errorCorrectionLevel: "M" });
      const img = new Image();
      img.src = qr;
      await img.decode();
      const text = linesKey ? linesKey.split("\n") : [];
      const W = 560;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = 70 + 480 + 24 + text.length * 32 + 16;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#14532d";
      ctx.textAlign = "center";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.fillText(title, W / 2, 46);
      ctx.drawImage(img, (W - 480) / 2, 70);
      ctx.fillStyle = "#111827";
      ctx.font = "22px system-ui, sans-serif";
      text.forEach((t, i) => ctx.fillText(t, W / 2, 70 + 480 + 34 + i * 32));
      if (!cancelled) setSrc(c.toDataURL("image/png"));
    })();
    return () => {
      cancelled = true;
    };
  }, [payload, title, linesKey]);

  if (!payload && !image) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      {src ? (
        <img src={src} alt={title} className={size === "sm" ? "w-52 rounded-lg border" : "w-72 max-w-full rounded-lg border"} />
      ) : (
        <div className={size === "sm" ? "h-60 w-52 animate-pulse rounded-lg bg-gray-100" : "h-80 w-72 animate-pulse rounded-lg bg-gray-100"} />
      )}
      {!payload && lines.length > 0 && (
        <div className="text-center text-sm text-gray-700">
          {lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      )}
      {actions && (
      <div className="flex flex-wrap justify-center gap-2">
        {src && (
          <a className="btn btn-sm" href={src} download={`${fileName}.png`}>
            ⬇ Tải ảnh QR
          </a>
        )}
        {copies.map((c) => (
          <CopyButton key={c.label} text={c.value} label={c.label} />
        ))}
      </div>
      )}
    </div>
  );
}
