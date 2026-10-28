export function stripDiacritics(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** Nội dung chuyển khoản: không dấu, chữ hoa, không ký tự đặc biệt, tối đa 25 ký tự. */
export function transferContent(s: string, max = 25) {
  return stripDiacritics(s)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

export function compactName(s: string) {
  return stripDiacritics(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function pname(p: { nickname: string | null; fullName: string }) {
  return p.nickname?.trim() || p.fullName;
}
