# ⚽ Web quản lý đội bóng

Web cho các đội bóng phủi, dùng chủ yếu trên điện thoại. **Một web cho nhiều đội**: đội trưởng đăng ký, tạo đội (tên + mật khẩu); thành viên vào bằng tên đội + mật khẩu đội, không cần tài khoản.

- **Lịch cố định hằng tuần** kèm **vote nghỉ / vote đi**, hạn chót do admin chọn (VD 23:59 chủ nhật).
- **Lịch lẻ** (giao hữu, đá bù) tạo bình thường, không vote, không phạt.
- **Điểm danh** điền sẵn theo vote, thêm khách, khách tính tiền cho người dẫn.
- **Chốt tiền trận**: chia đều / giá cố định / khách giá riêng / quỹ bao, làm tròn, có xem trước.
- **Tích ai đã trả**, tiền nộp trước tự gạch các trận nợ cũ nhất.
- **Phạt vắng không báo**: web gợi ý ai vote đi mà không đến. Mức phạt bằng tiền trận mỗi người, vào **quỹ phạt**. Có thêm lỗi khác (đi muộn, quên áo…).
- **2 quỹ riêng**: quỹ bóng và quỹ phạt. Mỗi quỹ có sổ thu chi, thu khác (tự nhập nguồn), chi, chuyển quỹ.
- **QR chuyển khoản**: admin tải ảnh QR từ app ngân hàng, web tự đọc số tài khoản để tạo QR có sẵn số tiền + nội dung.
- **Thông số từng thành viên**: số dư, số nợ, số trận, chuyên cần.
- **Tổng kết tháng**: ai đi bao nhiêu, nghỉ, vắng không báo, đã đóng, bị phạt. Có xếp hạng, copy gửi Zalo, xuất Excel.
- **Lịch sử** giao dịch và nhật ký thao tác (ai làm gì, lúc nào).

Yêu cầu chi tiết: [REQUIREMENTS.md](REQUIREMENTS.md).

## Chạy trên máy

Cần Node.js 20 trở lên.

```bash
npm install
npm run dev
```

Mở http://localhost:3000 → **Đăng ký & tạo đội**.

Khi chạy trên máy, dữ liệu nằm trong thư mục `.data/` (PGlite, tức Postgres chạy ngay trong Node, không phải cài gì). Xoá thư mục này để làm lại từ đầu.

```bash
npm test        # kiểm tra phần tính tiền, hạn vote, mã VietQR
npm run lint
```

## Deploy miễn phí: Vercel + Neon

Vercel chạy web, Neon là Postgres. Cả hai có gói miễn phí, dư sức cho một đội bóng.

1. **Đưa code lên GitHub** (repo private cũng được).
2. Vào [vercel.com](https://vercel.com) → **Add New → Project** → chọn repo → **Deploy**.
   Lần đầu build sẽ báo lỗi “Chưa cấu hình DATABASE_URL”. Bình thường, làm tiếp bước 3.
3. Trong project trên Vercel → tab **Storage** → **Create Database** → chọn **Neon** (Postgres) → **Connect** vào project.
   Vercel tự thêm biến môi trường `DATABASE_URL`.
4. Tab **Deployments** → **Redeploy**. Lúc build, web tự tạo bảng trong database (`scripts/migrate.mjs`).
5. Mở link `https://<tên-project>.vercel.app` → **Đăng ký & tạo đội**.

Dùng **Supabase** thay Neon cũng được: tạo project → **Connect** → copy chuỗi **Transaction pooler** (cổng 6543) → dán vào Vercel ở **Settings → Environment Variables**, tên `DATABASE_URL` → Redeploy. Lưu ý: gói free của Supabase tạm dừng project nếu khoảng 7 ngày không ai truy cập.

Từ đó, mỗi lần push code lên GitHub, Vercel tự deploy lại.

## Bắt đầu dùng (cho mỗi đội)

1. Trang đầu → **Đăng ký & tạo đội**: nhập tên đội, khu vực, **mật khẩu đội**.
2. **Thêm → Cài đặt đội → Tài khoản nhận tiền**: chụp màn hình mã QR trong app ngân hàng, tải lên. Web tự đọc ngân hàng + số tài khoản. **Quét thử QR xem trước bằng app ngân hàng** rồi mới gửi cả đội.
3. **Cài đặt đội → Các loại lỗi phạt**: kiểm tra mức phạt. “Vắng không báo” mặc định bằng tiền trận mỗi người.
4. **Thêm → Cầu thủ → Thêm nhanh nhiều người**: dán danh sách tên từ nhóm Zalo.
5. **Lịch → Lịch cố định**: tạo lịch (thứ, giờ, sân, chi phí, chế độ vote, hạn chót).
6. Có sẵn số dư cũ? Vào **Quỹ → Điều chỉnh / nhập số dư ban đầu**.
7. **Cài đặt đội → Copy lời mời** gửi nhóm Zalo, kèm mật khẩu đội. Thành viên vào trang đầu, gõ tên đội + mật khẩu, rồi chọn tên mình để vote.
8. Có người cùng quản lý? Họ đăng ký tài khoản, bạn thêm tên đăng nhập của họ ở **Cài đặt đội → Quản trị viên**.

## Mỗi tuần

1. Trước hạn chót: admin vào **Vote** → **Copy nhắc vote** → dán Zalo.
2. Ngày đá: mở buổi → **Điểm danh** (đã điền sẵn theo vote) → sửa người không đến, thêm khách → **Chốt tiền trận**.
3. Mục **Phạt** của buổi: web gợi ý ai vắng không báo → **Xác nhận phạt**.
4. Ai chuyển tiền thì bấm **Đã trả** (ngay trong buổi đá, hoặc ở **Công nợ**). Chốt nhầm thì bấm **Mở lại trận** rồi chốt lại.
5. Cuối tháng: **Tổng kết** → **Copy tổng kết** gửi nhóm, hoặc tải CSV.

Mỗi tháng nên vào **Cài đặt → Tải toàn bộ dữ liệu** một lần để sao lưu.

## Cấu trúc code

```
src/
  app/            trang đầu (vào đội), đăng ký, đăng nhập, tạo đội, tài khoản
  app/doi/[slug]/ các trang của 1 đội (cần mật khẩu đội hoặc là admin đội)
  app/doi/[slug]/api/   xuất JSON, CSV tổng kết của đội
  actions/        server actions: ghi dữ liệu, luôn kiểm tra quyền admin của đúng đội
  components/     giao diện; MatchManager (điểm danh + chốt tiền), PenaltyForm
  db/             schema Drizzle, kết nối Postgres / PGlite, dữ liệu mặc định
  lib/            tính tiền, gạch nợ (money.ts), giờ VN + hạn vote (time.ts),
                  VietQR tạo + đọc (vietqr.ts), quyền theo đội (team.ts, auth.ts),
                  truy vấn (data.ts), tổng kết (summary.ts)
drizzle/          file migration SQL
tests/            test phần tính toán
```

Mọi bảng đều có `team_id`; quyền admin luôn kiểm tra theo đội (`teamAdmin()` trong `lib/team.ts`). Muốn thu phí tạo đội sau này: chặn trong `createTeam` (`actions/teams.ts`).

Mọi con số (số dư, công nợ, tổng kết) đều tính từ bảng `transactions`. Giao dịch không bao giờ bị xoá, chỉ bị đánh dấu huỷ.

Muốn đổi cấu trúc bảng: sửa `src/db/schema.ts` → `npm run db:generate` → commit thư mục `drizzle/` → deploy (web tự migrate khi build).
