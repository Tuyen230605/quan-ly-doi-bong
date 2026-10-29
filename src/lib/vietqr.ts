// Mã QR chuyển khoản theo chuẩn VietQR (EMVCo, NAPAS 247). Mọi app ngân hàng VN đều quét được.

export const BANKS: { bin: string; name: string }[] = [
  { bin: "970436", name: "Vietcombank" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970418", name: "BIDV" },
  { bin: "970405", name: "Agribank" },
  { bin: "970407", name: "Techcombank" },
  { bin: "970422", name: "MB Bank" },
  { bin: "970416", name: "ACB" },
  { bin: "970432", name: "VPBank" },
  { bin: "970423", name: "TPBank" },
  { bin: "970403", name: "Sacombank" },
  { bin: "970437", name: "HDBank" },
  { bin: "970441", name: "VIB" },
  { bin: "970443", name: "SHB" },
  { bin: "970431", name: "Eximbank" },
  { bin: "970426", name: "MSB" },
  { bin: "970448", name: "OCB" },
  { bin: "970440", name: "SeABank" },
  { bin: "970449", name: "LPBank" },
  { bin: "970428", name: "Nam A Bank" },
  { bin: "970409", name: "Bac A Bank" },
  { bin: "970425", name: "ABBANK" },
  { bin: "970454", name: "BVBank (Bản Việt)" },
  { bin: "970412", name: "PVcomBank" },
  { bin: "970452", name: "KienlongBank" },
  { bin: "970419", name: "NCB" },
  { bin: "970400", name: "Saigonbank" },
  { bin: "970429", name: "SCB" },
  { bin: "970430", name: "PG Bank" },
  { bin: "970427", name: "VietABank" },
  { bin: "970438", name: "BaoViet Bank" },
  { bin: "970433", name: "VietBank" },
  { bin: "970424", name: "Shinhan Bank" },
  { bin: "970457", name: "Woori Bank" },
  { bin: "546034", name: "Cake by VPBank" },
  { bin: "546035", name: "Ubank by VPBank" },
  { bin: "963388", name: "Timo" },
];

export function bankName(bin: string | null | undefined) {
  if (!bin) return "";
  return BANKS.find((b) => b.bin === bin)?.name ?? `Ngân hàng ${bin}`;
}

function tlv(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) */
export function crc16(s: string) {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildVietQR(opts: { bin: string; accountNo: string; amount?: number | null; content?: string | null }) {
  const beneficiary = tlv("00", opts.bin) + tlv("01", opts.accountNo.replace(/\s/g, ""));
  const merchant = tlv("00", "A000000727") + tlv("01", beneficiary) + tlv("02", "QRIBFTTA");
  const amount = opts.amount && opts.amount > 0 ? String(Math.round(opts.amount)) : "";
  let payload = tlv("00", "01") + tlv("01", amount ? "12" : "11") + tlv("38", merchant) + tlv("53", "704");
  if (amount) payload += tlv("54", amount);
  payload += tlv("58", "VN");
  if (opts.content) payload += tlv("62", tlv("08", opts.content));
  payload += "6304";
  return payload + crc16(payload);
}

function readTlv(s: string) {
  const out = new Map<string, string>();
  let i = 0;
  while (i + 4 <= s.length) {
    const id = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (!Number.isInteger(len) || i + 4 + len > s.length) break;
    out.set(id, s.slice(i + 4, i + 4 + len));
    i += 4 + len;
  }
  return out;
}

/**
 * Đọc ngân hàng + số tài khoản từ nội dung mã VietQR (quét từ ảnh QR mà admin tải lên).
 * Chỉ nhận QR chuyển khoản tới số tài khoản (QRIBFTTA), không nhận QR thẻ hay QR cửa hàng.
 */
export function parseVietQR(payload: string): { bin: string; accountNo: string; name: string | null } | null {
  const top = readTlv(payload.trim());
  const merchant = readTlv(top.get("38") ?? "");
  if (merchant.get("00") !== "A000000727") return null;
  if (merchant.has("02") && merchant.get("02") !== "QRIBFTTA") return null;
  const beneficiary = readTlv(merchant.get("01") ?? "");
  const bin = beneficiary.get("00");
  const accountNo = beneficiary.get("01");
  if (!bin || !/^\d{6}$/.test(bin) || !accountNo) return null;
  return { bin, accountNo, name: top.get("59") ?? null };
}

