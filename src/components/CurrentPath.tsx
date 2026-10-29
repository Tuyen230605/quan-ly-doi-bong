"use client";

import { usePathname } from "next/navigation";

/** Gửi kèm trang đang mở trong form, để xong việc (VD nhập mật khẩu đội) thì quay lại đúng trang đó. */
export function CurrentPath({ name = "next" }: { name?: string }) {
  return <input type="hidden" name={name} value={usePathname()} />;
}
