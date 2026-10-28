"use client";
/* eslint-disable @next/next/no-img-element */

import jsQR from "jsqr";
import { useState } from "react";
import { BANKS, bankName, parseVietQR } from "@/lib/vietqr";

async function readImage(file: File) {
  const bmp = await createImageBitmap(file);
  const draw = (max: number) => {
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return { c, ctx };
  };
  const big = draw(1400);
  const code = jsQR(big.ctx.getImageData(0, 0, big.c.width, big.c.height).data, big.c.width, big.c.height);
  const small = draw(720);
  return { qrText: code?.data ?? null, dataUrl: small.c.toDataURL("image/jpeg", 0.9) };
}

/**
 * Admin tải/dán ảnh QR ngân hàng. Web đọc mã trong ảnh để lấy ngân hàng + số tài khoản,
 * nhờ đó tạo được QR có sẵn số tiền + nội dung. Nhập tay vẫn được nếu không đọc được.
 */
export function BankQrFields({
  initial,
}: {
  initial: { bankBin: string | null; accountNo: string | null; accountName: string | null; qrImage: string | null };
}) {
  const [image, setImage] = useState(initial.qrImage ?? "");
  const [bin, setBin] = useState(initial.bankBin ?? "");
  const [accountNo, setAccountNo] = useState(initial.accountNo ?? "");
  const [accountName, setAccountName] = useState(initial.accountName ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async (file: File | null | undefined) => {
    if (!file) return;
    const { qrText, dataUrl } = await readImage(file);
    setImage(dataUrl);
    const info = qrText ? parseVietQR(qrText) : null;
    if (info) {
      setBin(info.bin);
      setAccountNo(info.accountNo);
      if (info.name) setAccountName(info.name);
      setMsg({ ok: true, text: `Đọc được: ${bankName(info.bin)} · ${info.accountNo}. Bấm Lưu để dùng.` });
    } else {
      setMsg({
        ok: false,
        text: qrText
          ? "Ảnh có mã QR nhưng không phải QR chuyển khoản ngân hàng. Ảnh vẫn được lưu để hiển thị."
          : "Không đọc được mã QR trong ảnh (thử ảnh chụp màn hình rõ hơn). Ảnh vẫn được lưu để hiển thị.",
      });
    }
  };

  const known = BANKS.some((b) => b.bin === bin);
  return (
    <div className="space-y-3">
      <input type="hidden" name="qrImage" value={image} />
      <div>
        <span className="label">Ảnh QR ngân hàng</span>
        <div
          tabIndex={0}
          onPaste={(e) => {
            const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
            if (item) {
              e.preventDefault();
              load(item.getAsFile());
            }
          }}
          className="rounded-xl border-2 border-dashed border-gray-300 p-3 text-center text-sm text-gray-500 outline-none focus:border-green-600"
        >
          {image ? (
            <img src={image} alt="Ảnh QR ngân hàng" className="mx-auto max-h-56" />
          ) : (
            <p>Chụp màn hình mã QR trong app ngân hàng rồi chọn ảnh bên dưới (trên máy tính: bấm vào ô này và Ctrl+V).</p>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="file" accept="image/*" className="text-sm" onChange={(e) => load(e.target.files?.[0])} />
          {image && (
            <button type="button" className="btn btn-sm btn-danger" onClick={() => setImage("")}>
              Xoá ảnh
            </button>
          )}
        </div>
        {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-green-700" : "text-amber-700"}`}>{msg.text}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">Ngân hàng</span>
          <select className="input" name="bankBin" value={bin} onChange={(e) => setBin(e.target.value)}>
            <option value="">— Chưa có —</option>
            {!known && bin && <option value={bin}>Mã ngân hàng {bin}</option>}
            {BANKS.map((b) => (
              <option key={b.bin} value={b.bin}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Số tài khoản</span>
          <input className="input" name="accountNo" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Tên chủ tài khoản</span>
          <input className="input uppercase" name="accountName" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </label>
      </div>
    </div>
  );
}
