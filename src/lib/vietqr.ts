// Mã QR chuyển khoản theo chuẩn VietQR (EMVCo, NAPAS 247). Mọi app ngân hàng VN đều quét được.

// code: mã ngắn của ngân hàng theo VietQR (api.vietqr.io/v2/banks), dùng trong link mở app ngân hàng.
export const BANKS: { bin: string; code: string; name: string }[] = [
  { bin: "970436", code: "vcb", name: "Vietcombank" },
  { bin: "970415", code: "icb", name: "VietinBank" },
  { bin: "970418", code: "bidv", name: "BIDV" },
  { bin: "970405", code: "vba", name: "Agribank" },
  { bin: "970407", code: "tcb", name: "Techcombank" },
  { bin: "970422", code: "mb", name: "MB Bank" },
  { bin: "970416", code: "acb", name: "ACB" },
  { bin: "970432", code: "vpb", name: "VPBank" },
  { bin: "970423", code: "tpb", name: "TPBank" },
  { bin: "970403", code: "stb", name: "Sacombank" },
  { bin: "970437", code: "hdb", name: "HDBank" },
  { bin: "970441", code: "vib", name: "VIB" },
  { bin: "970443", code: "shb", name: "SHB" },
  { bin: "970431", code: "eib", name: "Eximbank" },
  { bin: "970426", code: "msb", name: "MSB" },
  { bin: "970448", code: "ocb", name: "OCB" },
  { bin: "970440", code: "seab", name: "SeABank" },
  { bin: "970449", code: "lpb", name: "LPBank" },
  { bin: "970428", code: "nab", name: "Nam A Bank" },
  { bin: "970409", code: "bab", name: "Bac A Bank" },
  { bin: "970425", code: "abb", name: "ABBANK" },
  { bin: "970454", code: "vccb", name: "BVBank (Bản Việt)" },
  { bin: "970412", code: "pvcb", name: "PVcomBank" },
  { bin: "970452", code: "klb", name: "KienlongBank" },
  { bin: "970419", code: "ncb", name: "NCB" },
  { bin: "970400", code: "sgicb", name: "Saigonbank" },
  { bin: "970429", code: "scb", name: "SCB" },
  { bin: "970430", code: "pgb", name: "PG Bank" },
  { bin: "970427", code: "vab", name: "VietABank" },
  { bin: "970438", code: "bvb", name: "BaoViet Bank" },
  { bin: "970433", code: "vietbank", name: "VietBank" },
  { bin: "970424", code: "shbvn", name: "Shinhan Bank" },
  { bin: "970457", code: "wvn", name: "Woori Bank" },
  { bin: "546034", code: "cake", name: "Cake by VPBank" },
  { bin: "546035", code: "ubank", name: "Ubank by VPBank" },
  { bin: "963388", code: "timo", name: "Timo" },
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

/**
 * App ngân hàng mở được bằng link của VietQR (dl.vietqr.io). autofill: app tự điền sẵn
 * số tài khoản + số tiền + nội dung; app khác chỉ mở lên, người chuyển tự nhập hoặc quét QR.
 * Danh sách: api.vietqr.io/v2/android-app-deeplinks và ios-app-deeplinks.
 */
export const BANK_APPS: { id: string; name: string; autofill?: boolean }[] = [
  { id: "mb", name: "MB Bank", autofill: true },
  { id: "icb", name: "VietinBank", autofill: true },
  { id: "bidv", name: "BIDV", autofill: true },
  { id: "acb", name: "ACB ONE", autofill: true },
  { id: "ocb", name: "OCB OMNI", autofill: true },
  { id: "vcb", name: "Vietcombank" },
  { id: "tcb", name: "Techcombank" },
  { id: "vba", name: "Agribank" },
  { id: "vpb", name: "VPBank NEO" },
  { id: "tpb", name: "TPBank" },
  { id: "cake", name: "Cake" },
  { id: "timo", name: "Timo" },
  { id: "lpb", name: "LPBank" },
  { id: "hdb", name: "HDBank" },
  { id: "vib-2", name: "MyVIB" },
  { id: "shb", name: "SHB SAHA" },
  { id: "seab", name: "SeABank" },
  { id: "eib", name: "Eximbank" },
  { id: "shbvn", name: "Shinhan SOL" },
  { id: "abb", name: "ABBank" },
  { id: "scb", name: "SCB" },
  { id: "pvcb", name: "PVcomBank" },
  { id: "klb", name: "KienlongBank" },
  { id: "ncb", name: "NCB" },
  { id: "nab", name: "Nam A Bank" },
  { id: "bvb", name: "BAOVIET Bank" },
  { id: "vab", name: "VietABank" },
];

export const bankAppIcon = (id: string) => `https://cdn.vietqr.io/bank-app-icon/${id}-android.webp`;

/**
 * Link mở thẳng app ngân hàng của người chuyển, điền sẵn tài khoản nhận, số tiền, nội dung.
 * returnUrl: trang quay lại sau khi chuyển. Ngân hàng nhận không có mã VietQR thì trả null.
 */
export function bankAppLink(
  app: string,
  o: { bin: string; accountNo: string; amount: number; content: string; accountName?: string | null; returnUrl: string },
) {
  const code = BANKS.find((b) => b.bin === o.bin)?.code;
  if (!code) return null;
  const q = new URLSearchParams({ app, am: String(Math.round(o.amount)), tn: o.content });
  if (o.accountName) q.set("bn", o.accountName);
  q.set("url", o.returnUrl);
  return `https://dl.vietqr.io/pay?${q}&ba=${encodeURIComponent(o.accountNo.replace(/\s/g, ""))}@${code}`;
}
