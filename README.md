# ⚽ Web quản lý đội bóng

Web cho các đội bóng phủi, dùng chủ yếu trên điện thoại. **Một web cho nhiều đội**: đội trưởng đăng ký, tạo đội (tên + mật khẩu); thành viên vào bằng tên đội + mật khẩu đội, không cần tài khoản.

- **Vote đi / nghỉ** cho mọi buổi, có hạn chót:
  - **Lịch cố định** hằng tuần: admin chọn *vote nghỉ* (không vote = đi) hoặc *vote đi* (không vote = không đi), hạn chót VD 23:59 chủ nhật.
  - **Lịch lẻ** (giao hữu, đá bù): mặc định *vote đi*, hạn chót 2 tiếng trước giờ đá (sửa được).
- **Điểm danh sau trận** chia nhóm theo vote: vote đi / vote nghỉ / chưa vote / khách. Admin tick ai có đá, web hiện ngay kết quả từng người.
- **Quỹ cá nhân**: mỗi người có một con số "còn bao nhiêu trong quỹ" (đã nộp − tiền trận − tiền phạt). Chọn tên là thấy ngay ở trang chủ.
- **Phạt**: *vote đi mà không đến* → gợi ý phạt bằng tiền trận mỗi người. *Không vote mà đi* → admin tuỳ phạt hoặc chỉ ghi chú. **Tích nhanh** nhiều người cùng lỗi (đi muộn, quên áo, lỗi tự ghi), admin tự ghi giá. Tiền phạt trừ vào quỹ cá nhân, chuyển sang **quỹ phạt**.
- **Chốt tiền trận**: chia đều / giá cố định / khách giá riêng / quỹ bao, làm tròn, có xem trước. Chốt xong tự trừ vào quỹ cá nhân từng người. Khách tính tiền cho người dẫn.
- **Tích ai đã trả**, tiền nộp trước tự gạch các trận nợ cũ nhất.
- **2 quỹ riêng**: quỹ bóng và quỹ phạt. Mỗi quỹ có sổ thu chi, thu khác (tự nhập nguồn), chi, chuyển quỹ.
- **QR chuyển khoản**: admin tải ảnh QR từ app ngân hàng, web tự đọc số tài khoản để tạo QR có sẵn số tiền + nội dung.
- **Link nộp tiền**: admin tạo link (VD quỹ tháng 11, 200k) gửi Zalo. Thành viên bấm link, chọn tên là hiện ngay mã QR có sẵn số tiền, nội dung là tên người nộp; quét bằng app ngân hàng. Admin bấm *Đã nhận* khi tiền về.
- **Máy cũ** (dưới iOS 16.4 / Chrome 111, không chạy được JavaScript của web): vẫn vào đội, chọn tên, vote, thấy mã QR (ảnh QR tạo sẵn trên server).
- **Quy định của đội** ở cuối trang chủ, admin tự viết.
- **Thông số từng thành viên** (tab *Từng thành viên* trong Tổng kết: quỹ cá nhân, số buổi đi lên đầu), **tổng kết tháng** (đi, nghỉ, vote đi mà không đến, không vote mà đi, đã đóng, bị phạt), xếp hạng, copy gửi Zalo, xuất Excel.
- **Lịch sử** giao dịch và nhật ký thao tác (ai làm gì, lúc nào).

Yêu cầu chi tiết: [REQUIREMENTS.md](REQUIREMENTS.md).

## Chạy trên máy

Cần Node.js 20 trở lên.

```bash
npm install
npm run dev
```

Mở http://localhost:3000 → **Đăng ký & tạo đội**.

Dữ liệu khi chạy trên máy nằm trong `.data/` (PGlite: Postgres chạy ngay trong Node, không phải cài gì). Xoá thư mục này để làm lại từ đầu.

```bash
npm run lint
npm test                 # tính tiền, gạch nợ, hạn vote, phân loại sau trận, VietQR
```

**Test toàn bộ luồng trên Chrome** (đăng ký, tạo đội, vote, chốt tiền, phạt, nộp tiền…). Cần Chrome và database trống:

```bash
rm -rf .data && npm run dev                      # cửa sổ 1
BASE=http://localhost:3000 npm run e2e            # cửa sổ 2
```

Chrome ở chỗ khác thì thêm `CHROME_PATH=/đường/dẫn/chrome`.

## Deploy miễn phí: Vercel + Neon

Vercel chạy web, Neon là Postgres. Cả hai có gói miễn phí, dư sức cho vài chục đội.

1. **Vercel**: vào [vercel.com](https://vercel.com) → đăng ký bằng tài khoản GitHub (gói *Hobby*, miễn phí).
2. **Add New → Project** → chọn repo `quan-ly-doi-bong` → **Import**.
   Không thấy repo? Bấm *Adjust GitHub App Permissions* và cho Vercel quyền đọc repo đó.
   Giữ nguyên cài đặt build (Vercel tự nhận Next.js) → **Deploy**.
   Lần build đầu **sẽ báo lỗi** “Chưa cấu hình DATABASE_URL”. Đây là bình thường, làm tiếp bước 3.
3. **Database**: trong project → tab **Storage** → **Create Database** → **Neon** → chọn vùng **Singapore**, gói **Free** → **Connect** vào project.
   Vercel tự thêm biến `DATABASE_URL`. Nếu được hỏi về bản *Preview*, xem mục [Bản xem thử và database](#bản-xem-thử-preview-và-database).
4. Tab **Deployments** → bản lỗi ở bước 2 → **⋯ → Redeploy**. Lúc build, web tự tạo bảng trong database.
5. Mở `https://<tên-project>.vercel.app` → **Đăng ký & tạo đội**.

Không cần đặt thêm biến môi trường nào khác. Khoá ký cookie tự sinh và lưu trong database. Muốn tự đặt thì thêm `SESSION_SECRET`.

Web chạy ở vùng Singapore (`vercel.json`) cho gần Việt Nam và gần database. Tên miền riêng (`.com`, `.vn`): **Settings → Domains** (tên miền mất phí hằng năm, Vercel thì vẫn free).

**Dùng Supabase thay Neon**: tạo project (vùng Singapore) → **Connect** → copy chuỗi **Transaction pooler** (cổng 6543) → Vercel **Settings → Environment Variables** → thêm `DATABASE_URL` → Redeploy. Gói free của Supabase tạm dừng project nếu khoảng 7 ngày không ai truy cập.

## CI/CD và sửa code tiếp

- **CI (GitHub Actions)** — [.github/workflows/ci.yml](.github/workflows/ci.yml): mỗi lần push lên `main` hoặc mở Pull Request, GitHub tự chạy lint → test → build → test toàn bộ luồng trên Chrome. Kết quả xem ở tab **Actions** của repo. Khi lỗi có kèm log server và ảnh chụp màn hình (mục *Artifacts*).
- **CD (Vercel)**: push lên `main` → Vercel tự deploy bản chính thức. Push nhánh khác hoặc mở PR → Vercel tạo **bản xem thử (preview)** với link riêng, hiện ngay trong PR.

**Quy trình mỗi lần sửa:**

```bash
git checkout -b ten-tinh-nang          # làm trên nhánh riêng, không sửa thẳng main
npm run dev                            # sửa và xem thử trên máy
npm run lint && npm test
git add -A && git commit -m "Mô tả thay đổi"
git push -u origin ten-tinh-nang
gh pr create --fill                    # hoặc mở Pull Request trên github.com
```

Chờ CI xanh, mở link preview kiểm tra lại, rồi **Merge** PR. Vercel sẽ tự deploy bản chính thức.

**Đổi cấu trúc bảng**: sửa `src/db/schema.ts` → `npm run db:generate` → commit cả thư mục `drizzle/`. Lúc deploy, web tự chạy migration. Chỉ nên **thêm** cột/bảng; đổi tên hay xoá cột thì cần cẩn thận vì database thật đã có dữ liệu.

### Bản xem thử (preview) và database

Bản preview cũng chạy migration khi build. Nếu preview dùng chung database với bản chính thức, migration của một nhánh chưa merge sẽ chạy thẳng lên dữ liệu thật. Có 2 cách tránh:

- Khi kết nối Neon, nếu Neon cho chọn **tạo nhánh database (branch) cho Preview** thì bật lên. Mỗi bản preview sẽ có bản sao database riêng.
- Hoặc tạo thêm một database Neon thứ 2, rồi ở **Settings → Environment Variables** gán `DATABASE_URL` của nó cho môi trường **Preview**, còn database chính chỉ gán cho **Production**.

## Bắt đầu dùng (cho mỗi đội)

1. Trang đầu → **Đăng ký & tạo đội**: nhập tên đội, khu vực, **mật khẩu đội**.
2. **Thêm → Cài đặt đội → Tài khoản nhận tiền**: chụp màn hình mã QR trong app ngân hàng, tải lên. Web tự đọc ngân hàng + số tài khoản. **Quét thử QR xem trước bằng app ngân hàng** rồi mới gửi cả đội.
3. **Cài đặt đội → Các loại lỗi phạt**: kiểm tra mức phạt. “Vote đi mà không đến” mặc định bằng tiền trận mỗi người; “Không vote mà đi” mặc định 20.000đ (chỉ gợi ý).
4. **Thêm → Cầu thủ → Thêm nhanh nhiều người**: dán danh sách tên từ nhóm Zalo.
5. **Lịch → Lịch cố định**: tạo lịch (thứ, giờ, sân, chi phí, chế độ vote, hạn chót). Buổi lẻ: **Lịch → + Lịch lẻ**.
6. Có sẵn số dư cũ? Vào **Quỹ → Điều chỉnh / nhập số dư ban đầu**.
7. Cuối trang chủ → **Viết quy định** (tiền phạt, giờ giấc…) cho cả đội xem.
8. **Cài đặt đội → Copy lời mời** gửi nhóm Zalo, kèm mật khẩu đội. Thành viên vào trang đầu, gõ tên đội + mật khẩu, rồi chọn tên mình để vote.
9. Có người cùng quản lý? Họ đăng ký tài khoản, bạn thêm tên đăng nhập của họ ở **Cài đặt đội → Quản trị viên**.

## Mỗi buổi đá

1. Trước hạn chót: admin vào **Vote** → **Copy nhắc vote** → dán Zalo.
2. Sau trận: mở buổi → **Điểm danh**. Danh sách chia theo vote, ai vote đi đã được tick sẵn. Tick lại cho đúng thực tế, thêm khách → **Chốt tiền trận**. Tiền trận tự trừ vào quỹ cá nhân của từng người.
3. Mục **Phạt**: web gợi ý *vote đi mà không đến* (tick sẵn) và *không vote mà đi* (không tick sẵn, tuỳ bạn phạt hay ghi chú). Lỗi khác (đi muộn…) dùng **Tích nhanh**: chọn lỗi, ghi giá, tích người → **Xác nhận**. Tiền phạt trừ vào quỹ cá nhân.
4. Thu tiền: **Thao tác nhanh → Tạo link / QR nộp tiền** → **Copy link gửi nhóm**. Tiền về thì bấm **Đã nhận** cho từng người (hoặc **Đã trả** trong buổi đá / **Công nợ**). Chốt nhầm thì bấm **Mở lại trận** rồi chốt lại.
5. Cuối tháng: **Tổng kết** → **Copy tổng kết** gửi nhóm, hoặc tải CSV.

Mỗi tháng nên vào **Cài đặt đội → Tải toàn bộ dữ liệu** một lần để sao lưu.

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
                  phân loại sau trận (labels.ts), VietQR tạo + đọc (vietqr.ts),
                  quyền theo đội (team.ts, auth.ts), truy vấn (data.ts), tổng kết (summary.ts)
drizzle/          file migration SQL (chạy tự động khi build trên Vercel)
tests/            lib.test.ts (vitest), e2e.mjs (Chrome)
.github/workflows CI
```

Mọi bảng đều có `team_id`; quyền admin luôn kiểm tra theo đội (`teamAdmin()` trong `lib/team.ts`). Muốn thu phí tạo đội sau này: chặn trong `createTeam` (`actions/teams.ts`).

Mọi con số (số dư, công nợ, tổng kết) đều tính từ bảng `transactions`. Giao dịch không bao giờ bị xoá, chỉ bị đánh dấu huỷ.
