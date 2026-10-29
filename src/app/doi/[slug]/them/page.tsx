import Link from "next/link";
import { forgetMe, logout } from "@/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { Card } from "@/components/ui";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";

const LINKS = [
  { path: "/tong-ket?tab=tv", icon: "📋", label: "Bảng thành viên", desc: "Quỹ cá nhân, số buổi đi, chuyên cần, phạt" },
  { path: "/nop", icon: "💳", label: "Nộp tiền", desc: "Link hiện mã QR có sẵn số tiền, tên người nộp" },
  { path: "/cau-thu", icon: "👥", label: "Cầu thủ", desc: "Quỹ cá nhân, số trận từng người" },
  { path: "/cong-no", icon: "📌", label: "Công nợ", desc: "Ai đang nợ quỹ bóng, quỹ phạt" },
  { path: "/tong-ket", icon: "📊", label: "Tổng kết tháng", desc: "Ai đi bao nhiêu, nghỉ, đóng tiền, bị phạt" },
  { path: "/qr", icon: "🔳", label: "Tạo QR", desc: "Ảnh QR có sẵn số tiền + nội dung" },
  { path: "/lich-su", icon: "🕘", label: "Lịch sử", desc: "Giao dịch và nhật ký thao tác" },
  { path: "/lich/co-dinh", icon: "🔁", label: "Lịch cố định", desc: "Lịch hằng tuần, hạn chót vote" },
];

export default async function MorePage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, admin, user, me, base } = ctx;
  const links = [...LINKS, ...(admin ? [{ path: "/cai-dat", icon: "⚙️", label: "Cài đặt đội", desc: "QR ngân hàng, mật khẩu đội, mức phạt" }] : [])];
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {links.map((l) => (
          <Link key={l.path} href={`${base}${l.path}`} className="card block hover:bg-gray-50">
            <div className="text-2xl">{l.icon}</div>
            <div className="mt-1 font-semibold">{l.label}</div>
            <div className="text-xs text-gray-500">{l.desc}</div>
          </Link>
        ))}
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            {me ? (
              <>
                Máy này: <b>{pname(me)}</b>
              </>
            ) : (
              "Chưa chọn tên trong đội"
            )}
          </span>
          <div className="flex gap-2">
            {me && (
              <ActionForm action={forgetMe} showOk={false}>
                <button className="btn btn-sm">Bỏ chọn</button>
              </ActionForm>
            )}
            <Link href={`${base}/toi`} className="btn btn-sm">
              {me ? "Đổi tên" : "Chọn tên"}
            </Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-sm">
          {user ? (
            <>
              <span>
                Đăng nhập: <b>{user.displayName}</b>
                {admin ? " (quản trị đội)" : ""}
              </span>
              <ActionForm action={logout} showOk={false}>
                <button className="btn btn-sm">Đăng xuất</button>
              </ActionForm>
            </>
          ) : (
            <>
              <span className="text-gray-500">Đội trưởng / thủ quỹ?</span>
              <Link href={`/login?next=${base}`} className="btn btn-sm">
                Đăng nhập quản trị
              </Link>
            </>
          )}
        </div>
        <div className="mt-3 border-t border-gray-100 pt-3 text-sm">
          <Link href="/" className="text-green-700">
            ⇄ Đổi đội / trang đầu
          </Link>
          <span className="ml-2 text-xs text-gray-400">Đang xem: {team.name}</span>
        </div>
      </Card>
    </>
  );
}
