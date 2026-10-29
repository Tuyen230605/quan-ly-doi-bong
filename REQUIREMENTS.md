# Web Quản Lý Đội Bóng — Yêu cầu tính năng

> Bản 0.6 · 29/10/2026 · Đã có code, cách chạy và deploy xem [README.md](README.md)

## 1. Mục tiêu

Một web đơn giản, dùng chủ yếu trên điện thoại, giúp đội bóng trả lời nhanh 5 câu hỏi:

1. Tuần tới đá khi nào, ở đâu, ai đi, ai nghỉ?
2. Trận nào ai đá?
3. Ai đã trả tiền, ai còn nợ?
4. Quỹ bóng và quỹ phạt còn bao nhiêu, đã chi vào việc gì?
5. Cuối tháng: ai chuyên cần, ai hay nghỉ, ai đóng bao nhiêu, ai bị phạt bao nhiêu?

Quy mô: **một web cho nhiều đội**. Mỗi đội khoảng 15–40 cầu thủ, 1–3 người quản lý. Ai cũng đăng ký và tạo đội được (sau này có thể thu phí tạo đội).

### Đối chiếu yêu cầu → tính năng

| Yêu cầu của đội | Tính năng |
|---|---|
| Một web nhiều đội; quản trị tạo đội gồm tên + mật khẩu | [Mục 2](#2-vai-trò-người-dùng) |
| Thành viên vào xem bằng tên đội + mật khẩu đội | [Mục 2](#2-vai-trò-người-dùng) |
| Nhập tay cầu thủ | [F1](#f1-quản-lý-cầu-thủ-nhập-tay) |
| Dán QR chuyển tiền (mã ngân hàng do admin tải lên) | [F2](#f2-tài-khoản-nhận-tiền--mã-qr-chuyển-khoản) |
| Tạo QR quỹ | [F3](#f3-tạo-qr-quỹ-qr-có-sẵn-số-tiền--nội-dung) |
| Tạo lịch mới (không cố định) | [F4](#f4-tạo-lịch-mới-buổi-đá-đơn-lẻ) |
| Tạo lịch cố định hằng tuần, có hạn chót vote | [F5](#f5-tạo-lịch-cố-định--vote-hằng-tuần) |
| Vote nghỉ (hoặc vote đi), người tạo lịch chọn | [F6](#f6-vote-đinghỉ--điểm-danh) |
| Trận nào ai đá | [F6](#f6-vote-đinghỉ--điểm-danh) |
| Trừ tiền mỗi trận | [F7](#f7-trừ-tiền-mỗi-trận-chốt-tiền) |
| Tích những ai đã trả | [F8](#f8-tích-ai-đã-trả--công-nợ) |
| Trừ tiền chuyên cần: phạt người không vote nghỉ mà không đi (nhập tay) | [F9](#f9-trừ-tiền-chuyên-cần-phạt) |
| Quỹ bóng riêng, quỹ phạt riêng | [F10](#f10-quỹ-bóng--quỹ-phạt-2-quỹ-riêng) |
| Quỹ phạt: admin tự nhập thêm nguồn và số tiền | [F10](#f10-quỹ-bóng--quỹ-phạt-2-quỹ-riêng) |
| Vào link xem được thông số từng thành viên: số dư, số nợ, số trận… | [F1](#f1-quản-lý-cầu-thủ-nhập-tay), [F11.3](#f11-lịch-sử) |
| Có lịch sử | [F11](#f11-lịch-sử) |
| Tổng kết tháng: ai đi bao nhiêu, nghỉ thế nào, đóng tiền thế nào, bị phạt bao nhiêu | [F13](#f13-tổng-kết--phân-tích) |
| Trang chủ có ô quỹ cá nhân, chọn tên là biết mình còn bao nhiêu; bỏ “Đang nợ nhiều nhất” | [Bản 0.6](#thay-đổi-bản-06) |
| Bảng từng thành viên thành tab riêng, số dư hiện tại + số buổi đi lên trước | [Bản 0.6](#thay-đổi-bản-06) |
| Chốt trận = trừ tiền mỗi người tham gia; ai phạt thì trừ riêng | [Bản 0.6](#thay-đổi-bản-06) |
| Link nộp tiền: bấm là vào app ngân hàng, điền sẵn số tiền, nội dung là tên người nộp | [Bản 0.6](#thay-đổi-bản-06) |
| Admin tự viết quy định đội ở cuối trang chủ | [Bản 0.6](#thay-đổi-bản-06) |
| Cuối trận tích nhanh người bị phạt (đi muộn, vote không đi…), admin tự ghi giá, có ghi chú | [Bản 0.6](#thay-đổi-bản-06) |

### Thay đổi bản 0.6

1. **Quỹ cá nhân** = tiền một người còn trong quỹ đội = đã nộp − tiền trận − tiền phạt (gộp số dư quỹ bóng và nợ phạt cũ nếu có). Âm là đang nợ.
   - Trang chủ: 3 ô *Quỹ bóng · Quỹ phạt · Quỹ cá nhân*. Chưa chọn tên thì ô quỹ cá nhân dẫn tới trang chọn tên. Bỏ mục “Đang nợ nhiều nhất” (vẫn xem ở Công nợ).
   - Trang cầu thủ, danh sách cầu thủ, bảng thành viên, CSV đều hiện quỹ cá nhân.
2. **Tab “Từng thành viên”** trong Tổng kết (cũng có ở menu Thêm → Bảng thành viên). Cột theo thứ tự: Tên · Quỹ cá nhân (hiện tại) · Đi/buổi · Chuyên cần · Nghỉ · Vote đi không đến · Không vote mà đi · Bị phạt · Tiền trận · Đã đóng. Mặc định xếp theo quỹ cá nhân (ai nợ nhiều lên đầu). Cột tên đứng yên khi kéo ngang trên điện thoại.
3. **Chốt trận = trừ quỹ cá nhân**: tiền trận của mỗi người trừ vào quỹ cá nhân (khách có người dẫn thì trừ của người dẫn). Danh sách sau trận hiện “quỹ còn …” của từng người. Ai quỹ đủ thì tự tính là đã trả; quỹ âm thì vẫn bấm “Đã trả” khi người đó nộp bù.
   **Phạt trừ riêng**: mỗi khoản phạt trừ thẳng vào quỹ cá nhân và tiền chuyển từ quỹ bóng sang quỹ phạt ngay (giao dịch `fine_pay`). Quỹ phạt tăng ngay, người bị phạt không còn khoản “nợ phạt” riêng. Huỷ khoản phạt thì quỹ cá nhân được trả lại.
4. **Link nộp tiền** (Thao tác nhanh → *Tạo link / QR nộp tiền*): admin nhập nộp gì, số tiền, vào quỹ nào, chữ thêm vào nội dung (VD `T11`). Web tạo link gửi Zalo.
   - Thành viên mở link → (nhập mật khẩu đội nếu máy chưa vào) → **phải chọn tên trước** → thấy danh sách app ngân hàng. Bấm app của mình là mở app ngân hàng với tài khoản nhận, số tiền và nội dung `<TÊN> <chữ thêm>` điền sẵn. Không có nút tải QR hay copy số TK / nội dung; mã QR chỉ để dự phòng (thu gọn).
   - Link dùng dịch vụ miễn phí của VietQR: `https://dl.vietqr.io/pay?app=<app>&ba=<STK>@<mã NH>&am=<số tiền>&tn=<nội dung>&bn=<tên TK>&url=<trang quay lại>`. App **MB Bank, VietinBank, BIDV, ACB, OCB** điền sẵn; các app khác (Vietcombank, Techcombank…) hiện chỉ mở app lên, người chuyển nhập theo thông tin trên trang.
   - Admin thấy danh sách ai đã nộp, bấm **Đã nhận** khi tiền về → ghi khoản nộp, cộng vào quỹ cá nhân. Đóng link khi thu xong.
5. **Quy định của đội** ở cuối trang chủ: admin tự viết (lần đầu có mẫu lấy từ các mức phạt đang dùng), mọi thành viên xem được.
6. **Phạt cuối trận – tích nhanh**: trong mục Phạt của buổi đã chốt, chọn lỗi (hoặc *Lỗi khác* tự ghi tên lỗi), admin tự ghi mức phạt, tích nhiều người (người có đá buổi đó lên đầu), thêm ghi chú → vào danh sách phạt, sửa được từng dòng trước khi xác nhận. Khoản phạt hiện ngay dưới tên người đó trong danh sách “Ai đá & tiền trận”.

---

## 2. Vai trò người dùng

| Vai trò | Ai | Quyền |
|---|---|---|
| **Quản trị (Admin)** | Đội trưởng, thủ quỹ | Đăng ký tài khoản, **tạo đội** (tên đội + mật khẩu đội), quản lý được nhiều đội. Trong đội: toàn quyền thêm cầu thủ, tạo lịch, sửa vote hộ, điểm danh, chốt tiền, phạt, ghi thu/chi, cài đặt, thêm admin khác |
| **Thành viên** | Mọi người trong đội | **Không cần tài khoản**: nhập **tên đội + mật khẩu đội** để vào. Tự vote đi/nghỉ cho mình. Xem lịch, ai đá, thông số từng người, công nợ, quỹ, tổng kết, mã QR chuyển tiền |

- Trang đầu của web có ô **Vào đội** (tên đội + mật khẩu) và nút **Đăng ký & tạo đội** cho admin.
- Tên đội không được trùng giữa các đội (so sánh không dấu, không phân biệt hoa thường), vì thành viên gõ tên để vào. Mỗi đội có link riêng `/doi/<tên-đội-không-dấu>`.
- Máy đã vào đội thì được ghi nhớ. Admin đổi mật khẩu đội (khi lộ hoặc có người rời đội) thì mọi máy phải nhập lại.
- Vào đội rồi, thành viên chọn tên mình một lần để vote. Có thể bật mã PIN 4 số để không ai vote hộ người khác (F6.1).
- Một tài khoản admin quản nhiều đội được. Muốn thêm admin cho đội: người đó đăng ký, rồi admin hiện tại thêm tên đăng nhập của họ trong Cài đặt đội.
- Dữ liệu các đội tách biệt hoàn toàn. Mọi thao tác của admin đều ghi lại ai làm, lúc nào (F11).

---

## 3. Khái niệm và cách tính tiền

### 3.1 Thuật ngữ

- **Cầu thủ**: có 2 loại.
  - *Thành viên*: có trong danh sách đội, được theo dõi số dư, vote và chuyên cần.
  - *Khách*: đá vãng lai, thường trả tiền ngay tại sân.
- **Buổi đá / Trận**: 1 lần đá cụ thể (ngày, giờ, sân).
- **Lịch cố định**: mẫu lặp lại hằng tuần (VD tối thứ 4). Lịch này tự sinh ra các buổi đá và phiếu vote mỗi tuần.
- **Lịch lẻ**: buổi đá tạo riêng (giao hữu, đá bù). Cũng có vote + hạn chót, mặc định *không vote = không đi*.
- **Phiếu vote tuần**: mỗi tuần của lịch cố định có 1 phiếu để thành viên báo đi hay nghỉ. Phiếu tự khoá vào hạn chót mà người tạo lịch chọn (VD 23:59 chủ nhật).
- **Vắng không báo**: vote đi (hoặc không vote nghỉ) nhưng không đến. Admin có thể đưa vào danh sách phạt.
- **Quỹ cá nhân**: tiền của một người còn trong quỹ đội (đã nộp − tiền trận − tiền phạt). Âm = đang nợ.
- **Quỹ bóng** và **Quỹ phạt**: 2 quỹ tách biệt hoàn toàn. Mỗi quỹ có số dư, sổ thu chi và mã QR riêng.
- **Giao dịch**: mọi lần tiền ra hoặc vào. **Mọi con số (số dư, công nợ, tổng kết) đều tính từ danh sách giao dịch**, không có số nào nhập tay.

### 3.2 Hai con số cần phân biệt

| Con số | Ý nghĩa | Ví dụ |
|---|---|---|
| **Tiền quỹ thực có** | Tiền mặt và tiền trong tài khoản mà thủ quỹ đang giữ cho quỹ đó | Quỹ bóng: 1.240.000đ |
| **Số dư cầu thủ** | Tính riêng cho mỗi người, mỗi quỹ. **Dương** = đã nộp trước, còn tiền trong quỹ. **Âm** = đang nợ | An: +245.000đ · Bình: −55.000đ |

### 3.3 Ví dụ

1. An nộp trước 300.000đ vào quỹ bóng → tiền quỹ bóng +300k, số dư An = +300k.
2. Trận 15/10: tiền sân 600k + nước 60k = 660k, có 12 người đá → mỗi người 55k. Thủ quỹ trả sân và nước 660k → tiền quỹ bóng −660k.
3. Mỗi người đá bị trừ 55k: An còn +245k (tự động "Đã trả" vì có sẵn tiền trong quỹ). Bình chưa nộp gì → −55k → hiện "Chưa trả".
4. Bình đưa 55k tiền mặt → admin tích "Đã trả" → tiền quỹ bóng +55k, số dư Bình = 0.
5. Buổi 22/10 chia 55k/người. Bình không vote nghỉ nhưng cũng không đến → web gợi ý phạt Bình **55k (bằng tiền trận của các thành viên khác)**, admin xác nhận. Quỹ phạt ghi nhận 55k tiền phạt, Bình nợ phạt 55k cho đến khi nộp. Quỹ bóng không bị ảnh hưởng.

---

## 4. Tính năng chi tiết

### F1. Quản lý cầu thủ (nhập tay)

**Mục đích:** có danh sách đội để vote, điểm danh, tính tiền và tính phạt.

**Thông tin mỗi cầu thủ:**

| Trường | Bắt buộc | Ghi chú |
|---|:-:|---|
| Họ tên | ✔ | |
| Tên gọi | | Tên hay gọi ở sân, được hiển thị ưu tiên. VD "Tuấn Gầy" |
| Số điện thoại | | Chỉ admin xem được |
| Số áo | | |
| Vị trí | | Thủ môn / Hậu vệ / Tiền vệ / Tiền đạo |
| Loại | ✔ | Thành viên / Khách |
| Trạng thái | ✔ | Đang đá / Tạm nghỉ / Đã rời đội |
| Ghi chú | | |

**Thao tác:**
- Thêm từng người bằng form.
- **Thêm nhanh nhiều người**: dán danh sách tên (copy từ nhóm Zalo), mỗi dòng 1 người → tạo hàng loạt, bổ sung thông tin sau.
- Sửa thông tin. Đổi Khách → Thành viên khi khách đá thường xuyên.
- Tìm theo tên hoặc tên gọi, lọc theo loại và trạng thái.
- Danh sách hiển thị kèm số dư quỹ bóng, nợ phạt, số trận và tỷ lệ chuyên cần của từng người. **Mọi thành viên đã vào đội đều xem được** (trừ số điện thoại).

**Quy tắc:**
- Hai cầu thủ đang đá trùng tên gọi → cảnh báo.
- Cầu thủ đã có giao dịch hoặc điểm danh thì **không xoá được**, chỉ chuyển sang "Đã rời đội" để giữ lịch sử. Người đã rời đội mà còn nợ vẫn hiện trong Công nợ.
- Cầu thủ "Tạm nghỉ" hoặc "Đã rời đội" không có trong phiếu vote, không hiện sẵn khi điểm danh, và không có trong gợi ý phạt.

**Hoàn thành khi:**
- [ ] Dán 20 tên (mỗi dòng 1 tên) → tạo đủ 20 cầu thủ trong 1 lần bấm.
- [ ] Bấm xoá một cầu thủ đã từng đá → hệ thống chặn và gợi ý chuyển sang "Đã rời đội".

---

### F2. Tài khoản nhận tiền & mã QR chuyển khoản

**Mục đích:** thành viên mở web là có QR để chuyển tiền, không phải hỏi số tài khoản.

Admin của đội **tải lên ảnh QR ngân hàng** cho từng quỹ (quỹ bóng, quỹ phạt): chụp màn hình mã QR trong app ngân hàng rồi chọn ảnh (trên máy tính có thể Ctrl+V).

- Web **tự đọc mã trong ảnh** để lấy ngân hàng + số tài khoản. Nhờ vậy web tạo được QR có sẵn số tiền và nội dung (F3), mà mã ngân hàng vẫn lấy đúng từ QR thật của admin.
- Không đọc được (ảnh mờ, QR thẻ / QR cửa hàng): web vẫn lưu và hiện nguyên ảnh. Admin có thể chọn ngân hàng + nhập số tài khoản bằng tay.
- Tên chủ tài khoản nhập thêm để hiện dưới QR.

**Quy tắc:**
- Hai quỹ có thể dùng **2 tài khoản khác nhau** hoặc **chung 1 tài khoản**. Nếu dùng chung, phân biệt bằng nội dung chuyển khoản (bắt đầu bằng `QB` hoặc `PHAT`).
- Dưới mã QR luôn hiện: tên ngân hàng, số tài khoản (kèm nút **Sao chép**), tên chủ tài khoản.
- Ảnh QR tải lên: JPG/PNG, tối đa 5MB.

**Hoàn thành khi:**
- [ ] Thành viên vào đội trên điện thoại thấy QR của 2 quỹ, quét bằng app ngân hàng ra đúng tài khoản.
- [x] Admin tải ảnh QR từ app ngân hàng → web đọc đúng ngân hàng + số tài khoản.
- [ ] Nút sao chép số tài khoản hoạt động trên điện thoại.

---

### F3. Tạo QR quỹ (QR có sẵn số tiền & nội dung)

**Mục đích:** tạo nhanh QR để người nộp chỉ cần quét rồi xác nhận, không gõ sai số tiền hay nội dung. Tính năng này cần F2 cách 2.

**Thao tác — admin chọn:**
- **Quỹ**: quỹ bóng hoặc quỹ phạt.
- **Người nộp**: 1 cầu thủ, hoặc "Cả đội" (QR chung, VD thu quỹ đầu tháng).
- **Số tiền**: nhập tay; hoặc để web tự gợi ý bằng số người đó đang nợ; hoặc để trống cho người chuyển tự nhập.
- **Nội dung chuyển khoản**: web tự sinh theo mẫu, admin sửa được.

**Mẫu nội dung** (không dấu, tối đa 25 ký tự):

| Trường hợp | Mẫu | Ví dụ |
|---|---|---|
| Nộp quỹ bóng theo tháng | `QB <tên gọi> T<tháng>` | `QB TUANGAY T10` |
| Trả tiền 1 trận | `QB <tên gọi> <ngày><tháng>` | `QB TUANGAY 1510` |
| Đóng phạt | `PHAT <tên gọi>` | `PHAT TUANGAY` |

**Chia sẻ:**
- Tải ảnh QR về máy (ảnh có kèm dòng chữ: quỹ, tên người nộp, số tiền) để gửi qua Zalo.
- Sao chép link QR.
- **Tạo QR hàng loạt**: tạo QR đòi nợ cho tất cả người đang nợ chỉ với 1 lần bấm, mỗi người 1 ảnh hoặc 1 link.

**Quy tắc:**
- Tạo QR **không** có nghĩa là đã thu được tiền. Khi tiền về tài khoản, admin xác nhận ở F8. Bản sau có thể tự đối soát (mục 9).
- Nội dung chuyển khoản tự bỏ dấu tiếng Việt và ký tự đặc biệt.

**Hoàn thành khi:**
- [ ] Quét QR bằng app ngân hàng: tự điền đúng tài khoản, số tiền và nội dung.
- [ ] Từ màn hình Công nợ, 1 chạm tạo được QR đòi nợ đúng số tiền người đó đang nợ.

---

### F4. Tạo lịch mới (buổi đá đơn lẻ)

**Mục đích:** tạo 1 buổi đá không nằm trong lịch cố định (giao hữu, đá bù, đá giải). Lịch lẻ **cũng có vote** như lịch cố định:

- Bật/tắt vote cho từng buổi (mặc định bật). Danh sách vote: mọi thành viên đang đá.
- Chế độ mặc định **Vote đi: không vote = không đi** (đổi được sang vote nghỉ).
- **Hạn vote** chọn ngày + giờ; để trống = khoá trước giờ đá 2 tiếng. Hạn vote phải trước giờ đá.
- Sau trận xử lý giống lịch cố định: điểm danh theo vote (F6.2), gợi ý phạt (F9).

**Thông tin:**

| Trường | Bắt buộc | Ghi chú |
|---|:-:|---|
| Ngày | ✔ | |
| Giờ bắt đầu – kết thúc | ✔ | VD 19:00–20:30 |
| Sân | ✔ | Chọn từ danh sách sân đã lưu, hoặc nhập mới (tên, địa chỉ, link Google Maps) |
| Loại | | Nội bộ / Giao hữu / Giải đấu |
| Đối thủ | | Khi là giao hữu hoặc giải |
| Chi phí dự kiến | | Tiền sân, nước, trọng tài, khác. Dùng làm số mặc định khi chốt tiền (F7) |
| Ghi chú | | VD "mặc áo trắng" |

**Trạng thái buổi đá** (dùng chung cho cả lịch lẻ và lịch cố định):

```
Sắp diễn ra ──(chốt tiền)──► Đã chốt
     │    ◄──(mở lại)─────────┘
     └──(huỷ)──► Đã huỷ
```

**Thao tác:**
- Tạo, sửa, huỷ buổi đá. Khi huỷ, ghi lý do: mưa, thiếu người, sân bận...
- Nút **Copy thông tin** để dán vào Zalo, VD: `⚽ Thứ 5, 15/10 · 19:00–20:30 · Sân Hoàng Mai (link bản đồ)`.
- Xem lịch dạng danh sách (mặc định) hoặc dạng tháng.

**Quy tắc:**
- Buổi bị huỷ: không trừ tiền, không xét phạt. Nếu mất tiền cọc sân thì ghi một khoản chi riêng từ quỹ bóng (F10).
- Buổi đã chốt tiền thì không sửa trực tiếp ngày, giờ hay chi phí. Muốn sửa phải "Mở lại" (F7).

**Hoàn thành khi:**
- [ ] Tạo được 1 buổi đá trên điện thoại trong khoảng 30 giây (sân đã lưu, chi phí tự điền).

---

### F5. Tạo lịch cố định & vote hằng tuần

**Mục đích:** đội đá đều đặn hằng tuần thì admin chỉ tạo lịch 1 lần. Mỗi tuần hệ thống tự sinh buổi đá và phiếu vote để thành viên báo đi/nghỉ trước hạn chót.

**Thông tin:**

| Trường | Bắt buộc | Ghi chú |
|---|:-:|---|
| Tên lịch | ✔ | VD "Tối thứ 4" |
| Thứ trong tuần | ✔ | Chọn 1 hoặc nhiều thứ |
| Giờ bắt đầu – kết thúc | ✔ | |
| Sân | ✔ | |
| Chi phí mặc định | | |
| Ngày bắt đầu | ✔ | |
| Ngày kết thúc | | Để trống = không giới hạn |
| Thành viên của lịch | ✔ | Những người phải vote cho lịch này. Mặc định: tất cả thành viên đang đá |
| **Chế độ vote** | ✔ | **Vote nghỉ** (mặc định) hoặc **Vote đi**. Xem F6.1 |
| **Hạn chót vote** | ✔ | Chọn thứ và giờ, VD **Chủ nhật 23:59** |

**Cách tính hạn chót:** hạn chót là lần gần nhất của thứ + giờ đã chọn, **trước buổi đá đầu tiên của tuần** (tuần tính từ thứ 2 đến chủ nhật).
- VD đá thứ 4, hạn "Chủ nhật 23:59" → vote cho buổi thứ 4 ngày 04/11 khoá lúc 23:59 chủ nhật 01/11.
- VD đá thứ 4, hạn "Thứ 3 12:00" → khoá lúc 12:00 thứ 3 ngày 03/11.

**Thao tác và quy tắc:**
- Hệ thống luôn có sẵn các buổi đá và phiếu vote của **4 tuần tới**. Thành viên vote trước được nhiều tuần (VD báo nghỉ 3 tuần liền vì đi công tác).
- Mỗi tuần có **1 phiếu vote**, gồm các buổi của lịch trong tuần đó. Phiếu tự **khoá** đúng hạn chót.
- Mỗi buổi được sinh ra là một buổi đá bình thường như F4: sửa riêng được (đổi sân, đổi giờ) mà không ảnh hưởng buổi khác.
- **Bỏ 1 buổi** (nghỉ Tết, sân bảo trì): huỷ riêng buổi đó, phiếu vote của buổi đó cũng bị huỷ, lịch vẫn tiếp tục.
- **Sửa lịch cố định** (VD đổi giờ từ 19:00 sang 19:30, đổi hạn chót, đổi chế độ vote): chỉ áp dụng cho các buổi **chưa chốt** và các phiếu **chưa khoá**, kể từ ngày được chọn. Buổi đã chốt giữ nguyên.
- **Tạm dừng / Kết thúc lịch**: không sinh buổi mới. Các buổi tương lai chưa chốt sẽ bị huỷ (hỏi xác nhận trước).
- Có thể có nhiều lịch cố định cùng lúc (VD tối thứ 4 ở sân A, sáng chủ nhật ở sân B), mỗi lịch có chế độ vote và hạn chót riêng.

**Hoàn thành khi:**
- [ ] Tạo lịch "Thứ 4, 19:00", hạn vote "Chủ nhật 23:59" → thấy ngay 4 buổi trong 4 tuần tới, mỗi buổi có phiếu vote khoá lúc 23:59 chủ nhật tuần trước đó.
- [ ] Đổi giờ của lịch → các buổi đã chốt không đổi, các buổi sắp tới đổi theo.

---

### F6. Vote đi/nghỉ & điểm danh

**Mục đích:** biết trước ai đi, ai nghỉ (vote). Ghi lại ai thực sự đá (điểm danh) để chia tiền (F7) và để gợi ý phạt (F9).

#### 6.1 Vote (lịch cố định và lịch lẻ)

**Hai chế độ**, người tạo lịch chọn:

| Chế độ | Thành viên làm gì | Ai không vote thì coi là |
|---|---|---|
| **Vote nghỉ** (mặc định) | Ai nghỉ thì vote "Nghỉ" trước hạn chót | **Đi** |
| **Vote đi** | Ai đi thì vote "Đi" trước hạn chót | **Không đi** |

**Thành viên vote như sau:**
- Vào đội (tên đội + mật khẩu) → chọn tên mình (chỉ lần đầu, web nhớ trên điện thoại đó) → thấy phiếu tuần này → bấm **Đi** hoặc **Nghỉ** cho từng buổi. Có thể ghi lý do (VD "đi công tác").
- Trước hạn chót thì đổi ý thoải mái. Sau hạn chót phiếu khoá, thành viên không sửa được nữa. Muốn đổi thì nhắn admin, admin sửa hộ, và web ghi rõ "Admin sửa lúc …".
- **Chống vote hộ** (tuỳ chọn): admin bật "Yêu cầu mã PIN" → mỗi thành viên tự đặt PIN 4 số ở lần vote đầu tiên. Admin reset PIN được khi thành viên quên.
- Mọi lần vote và đổi vote đều lưu thời gian, nên xem được ai đổi vào phút chót.

**Màn hình phiếu vote:**
- Đếm trực tiếp, VD `Đi 14 · Nghỉ 3 · Chưa vote 4`, kèm danh sách tên từng nhóm.
- Đồng hồ đếm ngược tới hạn chót.
- Admin vote hộ được (VD cho người không dùng điện thoại).
- Nút **Copy nhắc vote** để dán vào Zalo:

  ```
  ⚽ Vote tuần 02/11–08/11: Thứ 4 04/11, 19:00, sân Hoàng Mai
  Hạn: 23:59 chủ nhật 01/11. Ai NGHỈ thì vote, không vote = ĐI.
  Đang nghỉ: Bình, Cường, Dũng
  Link: <link>
  ```

#### 6.2 Điểm danh (mọi buổi đá)

- **Buổi có vote** (lịch cố định, lịch lẻ bật vote): sau trận, danh sách điểm danh **chia nhóm theo vote**: *Vote ĐI*, *Vote NGHỈ*, *Chưa vote*, *Ngoài danh sách / khách*. Người “đi” (vote đi, hoặc chưa vote ở chế độ vote nghỉ) được tích sẵn “Có đá”. Admin tích lại cho đúng thực tế; dưới mỗi tên hiện ngay kết quả (bảng dưới). Đầu danh sách đếm: vote đi mà không đến / không vote mà đi / vote nghỉ vẫn đến.
- **Buổi tắt vote**: admin tích tay ai đá.
- **Thêm khách**: gõ tên → chọn khách cũ, hoặc tạo khách mới ngay tại chỗ (chỉ cần tên). Có thể chọn thêm "Khách của: <thành viên>". Khi đó tiền của khách được tính vào số dư của người dẫn.
- Đầu màn hình luôn hiện tổng số người đá, VD: `14 người · 12 thành viên + 2 khách`.
- Nút **Copy danh sách** để dán vào Zalo.

**Kết hợp vote và điểm danh** (mọi buổi có vote):

| Vote (sau hạn chót) | Thực tế | Kết quả | Trừ tiền trận | Có trong gợi ý phạt |
|---|---|---|:-:|:-:|
| Đi | Có đá | ✅ Đi đúng hẹn | Có | Không |
| Đi | Không đến | ❌ **Vắng không báo** | Không | **Có** |
| Nghỉ | Không đến | 🟡 Nghỉ có báo | Không | Không |
| Nghỉ | Có đá | 🔄 Đổi ý, vẫn đến | Có | Không |
| Chưa vote (chế độ vote đi) | Có đá | ⚠️ **Không vote mà đi** | Có | Có, **không tích sẵn**: admin tuỳ phạt hoặc chỉ ghi chú |
| Chưa vote (chế độ vote đi) | Không đến | Không vote, không đến | Không | Không |

> Ở chế độ **Vote nghỉ**, người không vote được tính là "Đi" (không đến = vắng không báo). Ở chế độ **Vote đi** (mặc định của lịch lẻ), người không vote được tính là "không đi"; nếu vẫn đến thì là *không vote mà đi*.
>
> Người **vắng không báo** không bị trừ tiền trận, nhưng bị phạt **số tiền bằng tiền trận của các thành viên khác**, tiền đó vào quỹ phạt (F9).

**Quy tắc:**
- Khi buổi chưa chốt, điểm danh sửa thoải mái. Sau khi chốt, muốn sửa phải "Mở lại".

**Hoàn thành khi:**
- [ ] Chế độ Vote nghỉ, lịch có 20 thành viên, 3 người vote nghỉ, 17 người không vote → sau hạn chót, điểm danh tích sẵn đúng 17 người.
- [ ] Thành viên vote sau hạn chót bị chặn. Admin vẫn sửa hộ được và web có ghi lại.
- [ ] Điểm danh 15 người trên điện thoại trong dưới 1 phút. Thêm khách mới chỉ cần nhập tên.

---

### F7. Trừ tiền mỗi trận (chốt tiền)

**Mục đích:** sau mỗi buổi, chia chi phí cho những người đá và trừ vào số dư quỹ bóng của họ.

**Thao tác "Chốt tiền":**

1. Nhập hoặc xác nhận chi phí thực tế: tiền sân, nước, trọng tài, khác (tự điền sẵn từ chi phí dự kiến).
2. Chọn cách chia. Mặc định lấy từ Cài đặt, đổi được cho từng trận:

   | Cách chia | Cách tính | Phần thừa/thiếu |
   |---|---|---|
   | **Chia đều** | Tổng chi phí ÷ số người đá, làm tròn **lên** (bước làm tròn 1.000đ hoặc 5.000đ) | Phần dư vào quỹ bóng |
   | **Giá cố định/người** | Mỗi người X đồng (VD 50k), bất kể tổng chi phí | Quỹ bóng hưởng phần thừa hoặc bù phần thiếu |
   | **Khách giá riêng** | Khách trả Y đồng (VD 70k), thành viên chia đều phần còn lại | Phần dư vào quỹ bóng |
   | **Quỹ bao** | Không trừ ai | Quỹ bóng trả toàn bộ |

3. **Xem trước** một bảng: từng người, số tiền bị trừ, số dư trước → sau. Có thể sửa tay số tiền của 1 người (VD đá nửa trận, thủ môn được miễn), kèm lý do.
4. Bấm **Xác nhận** → hệ thống tạo các giao dịch:
   - Mỗi người đá có 1 giao dịch "Tiền trận" trừ vào số dư quỹ bóng của họ. Khách có người dẫn thì trừ vào người dẫn.
   - Quỹ bóng có 1 giao dịch "Chi phí trận" bằng chi phí thực tế (tiền thủ quỹ trả cho sân).
5. Với buổi thuộc lịch cố định, web chuyển sang tab **Phạt** của buổi đó (F9) để admin xét phạt.

**Ví dụ làm tròn:** chi phí 600k, 14 người đá → 42.857đ → làm tròn lên 43.000đ/người → thu được 602k, dư 2k vào quỹ bóng.

**Quy tắc:**
- Mỗi trận chỉ chốt 1 lần. Muốn sửa thì bấm **Mở lại trận**: các giao dịch của trận chuyển sang "Đã huỷ" (vẫn hiện trong lịch sử, có gạch ngang). Sửa xong chốt lại, hệ thống tạo giao dịch mới.
- Không chốt được nếu chưa có ai "Có đá".
- Nếu một cầu thủ trả hộ chi phí bằng tiền túi (VD An trả tiền sân 600k) thì chọn "Người trả: An". Khi đó số dư của An được **cộng** 600k thay vì trừ vào tiền quỹ thực có.

**Hoàn thành khi:**
- [ ] Chốt trận 14 người, chi phí 600k, chia đều → mỗi người bị trừ 43.000đ, quỹ bóng ghi chi 600k, dư 2k.
- [ ] Mở lại trận đó, sửa thành 13 người rồi chốt lại → số dư của mọi người đúng như chưa từng chốt sai, lịch sử vẫn thấy lần chốt cũ đã bị huỷ.

---

### F8. Tích ai đã trả & công nợ

**Mục đích:** biết ngay trận nào ai đã trả, ai còn nợ; ghi nhận các lần nộp tiền.

#### 8.1 Cột "Đã trả" trong mỗi trận đã chốt

| Trạng thái | Khi nào |
|---|---|
| ✅ **Đã trả** | Số dư sẵn có đủ để trừ (tự động), hoặc admin đã tích khi nhận tiền |
| 🟠 **Thiếu X đ** | Số dư có nhưng không đủ |
| 🔴 **Chưa trả** | Không có tiền trong quỹ |

- Tích "Đã trả" → web hỏi hình thức (tiền mặt hoặc chuyển khoản, mặc định giống lần trước) → tạo giao dịch nộp tiền vào quỹ bóng, đúng số còn thiếu của trận đó.
- Bỏ tích (khi tích nhầm) → huỷ giao dịch nộp tiền vừa tạo.
- Khách không có người dẫn: cũng tích "Đã trả" tại sân như trên.

#### 8.2 Ghi nhận nộp tiền

- Chọn cầu thủ, quỹ, số tiền, hình thức, ngày, ghi chú.
- **Nộp gộp**: chọn nhiều người cùng nộp 1 mức trong 1 lần (VD cả đội nộp quỹ tháng 200k).
- Cách tính trận nào đã được trả:
  - Khoản nộp tạo bằng cách tích ở **một trận cụ thể** thì trả cho trận đó.
  - Khoản nộp **không gắn trận** thì trả cho các trận đang nợ **cũ nhất trước**. Phần còn dư trở thành số dư trả trước.
  - Ví dụ: Bình nợ trận 15/10 (55k) và trận 18/10 (50k), rồi chuyển khoản 200k → cả 2 trận chuyển "Đã trả", số dư Bình còn +95k.

#### 8.3 Màn hình Công nợ

- 2 tab: Quỹ bóng / Quỹ phạt. Liệt kê những người có số dư âm, ai nợ nhiều nhất xếp trước, kèm tổng nợ.
- Mỗi dòng có nút **Tạo QR đòi nợ** (F3) và nút **Đã trả**.
- Nút **Copy tin nhắc nợ** để dán vào Zalo:

  ```
  📢 Công nợ quỹ bóng (đến 29/10):
  - Bình: 105.000đ
  - Cường: 43.000đ
  Tổng: 148.000đ. QR chuyển khoản: <link>
  ```

**Hoàn thành khi:**
- [ ] Người có số dư +300k, sau trận 55k, tự hiện "Đã trả" mà admin không phải làm gì.
- [ ] Ghi khoản nộp 200k không gắn trận cho người đang nợ 2 trận → cả 2 trận tự chuyển "Đã trả".

---

### F9. Trừ tiền chuyên cần (phạt)

**Mục đích:** phạt những người vote đi (hoặc không vote nghỉ) mà không đến, và các lỗi khác. Tiền phạt **trừ vào quỹ cá nhân** của người bị phạt và cộng vào **quỹ phạt**.

**Quy tắc đã chốt:** người vắng không báo phải trả **bằng tiền trận của các thành viên khác** trong buổi đó, số tiền này vào quỹ phạt (không vào quỹ bóng).

**Danh sách phạt của 1 buổi** — admin nhập tay, web gợi ý:
1. Mở buổi đá → tab **Phạt**.
2. Web gợi ý sẵn (theo bảng ở F6.2):
   - **Vote đi mà không đến**: tích sẵn, mức phạt = tiền trận mỗi người.
   - **Không vote mà đi**: *không* tích sẵn. Admin tuỳ tích để phạt (mức mặc định của lỗi “Không vote mà đi”, VD 20.000đ), hoặc chỉ ghi chú (ghi chú hiện dưới tên người đó trong buổi).
3. Admin **thêm tay** bất kỳ ai, với bất kỳ lỗi nào (đi muộn, quên áo...), hoặc **tích nhanh** nhiều người cùng một lỗi, tự ghi mức phạt và ghi chú.
4. Mức phạt được điền sẵn theo Cài đặt, sửa được cho từng người. Người được gợi ý mà admin không phạt thì nên ghi lý do (ốm, việc gấp...).
5. Bấm **Xác nhận** → mỗi người có 1 giao dịch phạt, trừ ngay vào quỹ cá nhân, tiền chuyển từ quỹ bóng sang quỹ phạt. Quỹ cá nhân không đủ thì thành âm (đang nợ).

**Phạt ngoài buổi đá:** admin phạt bất kỳ lúc nào từ trang quỹ phạt hoặc trang cầu thủ: chọn người, lỗi, số tiền, ghi chú.

**Các loại lỗi và mức phạt mặc định** (admin thêm, sửa, xoá được), ví dụ:

| Lỗi | Mức phạt mặc định |
|---|---|
| Vắng không báo (vote đi mà không đến) | **Bằng tiền trận mỗi thành viên** của buổi đó (buổi “quỹ bao” thì dùng mức cố định, VD 50.000đ) |
| Đi muộn | 10.000đ |
| Quên áo | 10.000đ |
| Khác | Nhập tay |

**Quy tắc:**
- Web chỉ **gợi ý**, không tự phạt ai. Admin luôn là người quyết định.
- Gợi ý không bao gồm: khách, người ngoài danh sách vote, buổi đã huỷ, buổi tắt vote. Admin vẫn thêm tay những người này được nếu muốn.
- Tiền phạt vào quỹ phạt, trừ vào quỹ cá nhân (từ bản 0.6; khoản phạt cũ trước đó vẫn là nợ phạt riêng cho đến khi nộp).
- Đã phạt rồi muốn huỷ → giao dịch phạt chuyển "Đã huỷ" kèm lý do, không bị xoá; khoản trừ quỹ cá nhân đi kèm cũng huỷ theo.
- Trạng thái đã nộp / chưa nộp phạt tính giống F8. Thành viên nộp phạt bằng QR có nội dung `PHAT <tên gọi>` (F3).

**Hoàn thành khi:**
- [x] Buổi chia 110k/người, có 1 người vote đi mà không đến → tab Phạt gợi ý đúng người đó với mức 110k. Xác nhận → quỹ phạt tăng 110k, quỹ cá nhân người đó giảm 110k.
- [x] Tích nhanh 1 người đi muộn 15k → quỹ cá nhân người đó giảm 15k; huỷ khoản phạt → trả lại 15k.

---

### F10. Quỹ bóng & Quỹ phạt (2 quỹ riêng)

**Mục đích:** tiền đá bóng và tiền phạt không lẫn vào nhau; ai cũng xem được mỗi quỹ còn bao nhiêu và đã chi vào đâu.

**Mỗi quỹ có trang riêng, gồm:**
- **Tiền quỹ thực có** (số to nhất trên trang), tổng thu và tổng chi trong tháng.
- Tổng số tiền thành viên đang nợ, tổng số tiền thành viên đã nộp trước.
- Sổ thu chi của riêng quỹ đó.
- Mã QR của quỹ (F2).
- Riêng **quỹ phạt** hiện thêm: **Tiền phạt phát sinh = Đã thu + Còn nợ**. VD: Tháng 10 phát sinh 450k · đã thu 300k · còn nợ 150k.

**Các loại giao dịch:**

| Loại | Quỹ | Tiền quỹ thực có | Số dư cầu thủ | Ví dụ |
|---|---|:-:|:-:|---|
| Nộp tiền | Bóng / Phạt | ＋ | ＋ người nộp | Bình chuyển khoản 200k |
| Tiền trận | Bóng | — | − người đá | Trừ 43k mỗi người |
| Chi phí trận | Bóng | − | — | Trả tiền sân 600k |
| Cầu thủ trả hộ | Bóng | — | ＋ người trả hộ | An trả tiền sân 600k bằng tiền túi |
| Phạt | Phạt | — | − người bị phạt | Vắng không báo 50k |
| Chi khác | Bóng / Phạt | − | — | Mua bóng 400k; liên hoan từ quỹ phạt |
| Thu khác | Bóng / Phạt | ＋ | — | Tài trợ, bán đồ cũ |
| Chuyển quỹ | Cả 2 quỹ | − quỹ này, ＋ quỹ kia | — | Lấy 500k quỹ phạt bù quỹ bóng |
| Điều chỉnh | Bóng / Phạt | ± | ± | Sửa sai lệch, bắt buộc ghi lý do |

**Thu khác (tự nhập nguồn):** admin nhập **nguồn** (tài trợ, bán áo cũ, tiền thưởng…) và **số tiền** cho quỹ bóng hoặc quỹ phạt. Nguồn hiện trong sổ thu chi và tổng kết.

**Ghi khoản thu/chi:** quỹ, số tiền, hạng mục (Tiền sân, Nước, Trọng tài, Dụng cụ, Áo đấu, Liên hoan, Khác), ngày, người chi, ghi chú, **ảnh hoá đơn hoặc ảnh chuyển khoản** (không bắt buộc).

**Số dư ban đầu:** khi bắt đầu dùng web, admin nhập số tiền hiện có của mỗi quỹ và số dư/nợ hiện tại của từng thành viên (chuyển từ Excel hoặc sổ cũ sang).

**Đối chiếu quỹ** (không bắt buộc): thủ quỹ nhập số tiền thực tế đang có (tài khoản + tiền mặt) → web báo chênh lệch so với sổ. Nếu khớp thì lưu mốc "Đã đối chiếu ngày …".

**Hoàn thành khi:**
- [ ] Ghi chi 300k "Liên hoan" từ quỹ phạt → quỹ phạt giảm 300k, quỹ bóng không đổi.
- [ ] Tiền quỹ thực có luôn bằng tổng các giao dịch còn hiệu lực của quỹ đó.

---

### F11. Lịch sử

**11.1 Lịch sử giao dịch** — toàn bộ giao dịch của 2 quỹ, mới nhất xếp trước. Lọc theo quỹ, loại, cầu thủ, khoảng ngày; tìm theo ghi chú. Giao dịch đã huỷ hiện gạch ngang.

**11.2 Lịch sử trận** — các buổi đã đá: ngày, sân, số người, tổng chi phí, mỗi người bao nhiêu. Bấm vào một buổi để xem kết quả vote, ai đá, ai đã trả, ai bị phạt.

**11.3 Trang cá nhân cầu thủ** — số dư quỹ bóng, nợ phạt, các trận đã đá, lịch sử vote, các khoản đã nộp, các khoản phạt, tỷ lệ chuyên cần từng tháng. Mọi thành viên đã vào đội đều xem được trang này của mọi người (không thấy số điện thoại).

**11.4 Nhật ký thao tác** — ai làm gì, lúc nào, giá trị trước và sau khi sửa. Bao gồm cả các lần vote, đổi vote, admin sửa vote hộ. VD: `Hùng (thủ quỹ) · 21:05 15/10 · Chốt tiền trận 15/10 (14 người, 43.000đ/người)`.

**Quy tắc chung:**
- **Không xoá hẳn** giao dịch hay trận đã chốt. Chỉ huỷ hoặc điều chỉnh, và luôn để lại dấu vết.

**Hoàn thành khi:**
- [ ] Từ trang của 1 cầu thủ, xem được đủ các khoản cộng/trừ để giải thích số dư hiện tại.

---

### F12. Trang chủ & Cài đặt

**Trang chủ của đội** (vào đội là thấy ngay):
- **Phiếu vote tuần tới**: hạn chót còn bao lâu, bạn đã vote chưa, nút Vote.
- Buổi đá tiếp theo: ngày, giờ, sân, link bản đồ, số người đi theo vote.
- Tiền quỹ bóng và quỹ phạt hiện có.
- Những người đang nợ nhiều nhất.
- 2 mã QR của 2 quỹ.
- (Chỉ admin) nút tắt: Điểm danh buổi hôm nay · Ghi nộp tiền · Ghi khoản chi · Phạt.

**Cài đặt** (chỉ admin):
- Thông tin đội: tên, logo.
- Tài khoản ngân hàng / QR cho từng quỹ (F2).
- Cách chia tiền mặc định và bước làm tròn (F7).
- Các loại lỗi và mức phạt mặc định (F9).
- Bật/tắt mã PIN khi vote (F6.1).
- Danh sách sân.
- Quản lý admin: mời thêm bằng email, gỡ quyền.
- Thành viên vào đội: copy lời mời gửi Zalo, đổi mật khẩu đội.
- Quản trị viên của đội: thêm theo tên đăng nhập, bỏ quyền.
- Tên đội, khu vực (để sau này tìm đối).

---

### F13. Tổng kết & phân tích

**Mục đích:** cuối mỗi tháng (hoặc khoảng thời gian bất kỳ) nhìn được ai đi bao nhiêu, nghỉ thế nào, đóng tiền thế nào, bị phạt bao nhiêu. Từ đó biết ai chuyên cần, ai hay nghỉ.

**Chọn khoảng thời gian:** tháng này / tháng trước / chọn tháng / cả năm / từ ngày – đến ngày.

#### 13.1 Bảng tổng kết theo thành viên

Mỗi người 1 dòng. Bấm tiêu đề cột để sắp xếp.

| Cột | Cách tính |
|---|---|
| Số buổi có vote | Số buổi có vote (lịch cố định hoặc lịch lẻ) mà người đó thuộc danh sách, không tính buổi đã huỷ |
| Số buổi đi | Số buổi "Có đá", gồm cả lịch cố định và lịch lẻ |
| Nghỉ có báo | Số buổi vote nghỉ và không đến |
| Vote đi mà không đến | Số buổi vote đi (hoặc không vote ở chế độ vote nghỉ) mà không đến |
| Không vote mà đi | Số buổi không vote (chế độ vote đi) mà vẫn đến |
| **Tỷ lệ chuyên cần** | Số buổi đi (trong các buổi có vote) ÷ Số buổi có vote |
| Tiền trận | Tổng tiền trận bị trừ |
| Đã đóng quỹ bóng | Tổng tiền đã nộp vào quỹ bóng |
| Bị phạt | Tổng tiền phạt (và số lần bị phạt) |
| Đã nộp phạt | Tổng tiền phạt đã nộp |
| Số dư cuối kỳ | Quỹ bóng và quỹ phạt. Số âm = còn nợ |

#### 13.2 Xếp hạng trong kỳ

- 🏅 Chuyên cần nhất: tỷ lệ chuyên cần cao nhất, ít vắng không báo nhất.
- 😴 Nghỉ nhiều nhất.
- 🚨 Bị phạt nhiều nhất.
- 💰 Đóng quỹ nhiều nhất.
- 📌 Đang nợ nhiều nhất.

#### 13.3 Tổng kết từng quỹ

- **Quỹ bóng**: tiền đầu kỳ → thu (theo từng người, theo loại) → chi (theo hạng mục: sân, nước, dụng cụ...) → tiền cuối kỳ. Kèm số buổi đá, chi phí trung bình mỗi buổi, số người trung bình mỗi buổi.
- **Quỹ phạt**: tiền đầu kỳ, tiền phạt phát sinh (theo từng người, theo loại lỗi), đã thu, còn nợ, đã chi, tiền cuối kỳ.

#### 13.4 Biểu đồ

- Số người đá ở từng buổi trong tháng (biểu đồ cột).
- Tiền quỹ bóng và quỹ phạt cuối mỗi tháng, trong 6–12 tháng gần nhất (biểu đồ đường).
- Tỷ lệ chuyên cần của từng người (thanh ngang, sắp xếp từ cao xuống thấp).

#### 13.5 Chia sẻ

- Nút **Copy tổng kết** để dán vào Zalo, VD:

  ```
  📊 TỔNG KẾT THÁNG 10
  Số buổi: 8 · Trung bình 15 người/buổi
  🏅 Chuyên cần: An 8/8, Hùng 8/8, Tuấn 7/8
  😴 Nghỉ nhiều: Cường 5/8
  🚨 Vắng không báo: Bình 2 lần (100k)
  💰 Quỹ bóng: đầu tháng 1.200k → cuối tháng 950k
  ⚖️ Quỹ phạt: phát sinh 300k, đã thu 200k, còn nợ 100k
  ```

- Xuất bảng tổng kết ra Excel/CSV.
- Thành viên đã vào đội xem được tổng kết (chỉ xem).

**Hoàn thành khi:**
- [ ] Tháng có 8 buổi theo lịch, An đi 7 buổi và vote nghỉ 1 buổi → bảng hiện An: 8 buổi theo lịch, đi 7, nghỉ có báo 1, vắng không báo 0, chuyên cần ≈ 88%.
- [ ] Ở mỗi quỹ: tiền cuối kỳ = tiền đầu kỳ + tổng thu − tổng chi, và khớp với trang quỹ (F10).

---

## 5. Yêu cầu chung

- **Ưu tiên điện thoại**: các thao tác chính làm được bằng 1 tay, nút bấm to. Bảng dài hiển thị thành danh sách thẻ.
- Giao diện tiếng Việt. Tiền là VND, số nguyên, hiển thị `55.000đ` (danh sách dài có thể rút gọn `55k`).
- Ngày giờ theo giờ Việt Nam (UTC+7), định dạng `dd/mm/yyyy`. Hạn chót vote cũng tính theo giờ Việt Nam.
- Tải nhanh trên 4G. "Thêm vào màn hình chính" được để dùng như app (PWA).
- Xuất toàn bộ dữ liệu ra file (CSV/JSON) bất kỳ lúc nào để sao lưu.
- Chỉ admin sửa được dữ liệu (thành viên chỉ vote cho chính mình). Thành viên không thấy số điện thoại của người khác. Dữ liệu các đội tách biệt hoàn toàn.

## 6. Danh sách màn hình

```
Trang chủ
├── Vote        (phiếu tuần này và các tuần tới)
├── Lịch        → Chi tiết buổi đá (Vote · Điểm danh · Chốt tiền · Đã trả · Phạt)
├── Cầu thủ     → Trang cá nhân cầu thủ
├── Quỹ         → Quỹ bóng | Quỹ phạt (sổ thu chi, QR, ghi thu/chi)
├── Công nợ
├── Tổng kết    (theo kỳ: thành viên · xếp hạng · quỹ · biểu đồ)
├── Lịch sử     (Giao dịch · Trận · Nhật ký thao tác)
└── Cài đặt     (chỉ admin)
```

Trên điện thoại dùng thanh menu dưới đáy: **Trang chủ · Vote · Lịch · Quỹ · Thêm**.

## 7. Mô hình dữ liệu

Định nghĩa đầy đủ ở `src/db/schema.ts`. Các bảng chính:

| Bảng | Nội dung |
|---|---|
| `users` | Tài khoản admin (dùng chung cho mọi đội) |
| `teams` + `team_admins` | Đội: tên, mã link, mật khẩu đội, khu vực, cài đặt tiền trận; ai là admin của đội nào |
| `players` | Cầu thủ: tên, tên gọi, số áo, vị trí, loại (thành viên/khách), trạng thái, khách của ai, mã PIN |
| `schedules` + `schedule_players` | Lịch cố định: thứ, giờ, sân, chi phí, chế độ vote, hạn chót; danh sách thành viên của lịch |
| `matches` | Buổi đá (sinh từ lịch cố định hoặc lịch lẻ): chi phí, hạn vote (`vote_deadline`), cách chia, trạng thái |
| `votes` | Vote đi/nghỉ của từng người cho từng buổi, lý do, thời gian, admin sửa hộ |
| `attendances` | Điểm danh. Trước khi chốt chỉ lưu chỗ admin sửa khác vote; khi chốt lưu ảnh chụp cả đội (kết quả, tiền) để tổng kết không đổi |
| `transactions` | Mọi khoản tiền, 2 cột `cash_amount` (tiền quỹ thực có) và `player_amount` (số dư cầu thủ) |
| `funds` | 2 quỹ và tài khoản nhận tiền / ảnh QR |
| `penalty_types` | Loại lỗi, mức phạt cố định hoặc “bằng tiền trận” |
| `settings`, `audit_logs`, `venues` | Cài đặt chung của web, nhật ký thao tác, sân |

**Nguyên tắc:**
- Tiền quỹ thực có = tổng `cash_amount`; số dư cầu thủ = tổng `player_amount` (theo từng người, từng quỹ), chỉ tính giao dịch `active`.
- Mọi bảng dữ liệu đều có `team_id`; mọi truy vấn và thao tác đều kiểm tra đúng đội.
- Không xoá giao dịch, chỉ đánh dấu `cancelled`.
- Phiếu vote tự khoá vì web so thời điểm hiện tại với `vote_deadline` mỗi lần có người vote, nên không cần cron.

## 8. Phân kỳ

**Đã làm (bản 1):** F1–F13, gồm cả mã PIN khi vote, nhật ký thao tác, xuất CSV tổng kết và sao lưu JSON.

**Chưa làm (bản 1.1):** tạo QR hàng loạt cho mọi người đang nợ, biểu đồ tổng kết (hiện mới có thanh chuyên cần trong bảng), đối chiếu quỹ, ảnh hoá đơn, nhật ký lưu giá trị trước/sau.

**Bản 2:** các ý tưởng ở mục 9.

## 9. Ý tưởng cho bản sau (chưa làm)

- Giới hạn số người mỗi buổi; có danh sách chờ khi đã đủ người.
- Nhắc vote và nhắc nợ tự động qua Zalo OA hoặc Telegram bot (VD nhắc người chưa vote 3 tiếng trước hạn chót).
- Tự đối soát chuyển khoản: kết nối dịch vụ đọc biến động số dư (VD SePay, Casso). Tiền về tài khoản là tự tích "Đã trả" theo nội dung chuyển khoản. Có thể mất phí và cần ngân hàng được hỗ trợ.
- Chia đội ngẫu nhiên, cân bằng trình độ.
- Thống kê bàn thắng, kiến tạo, cầu thủ xuất sắc.
- **Tìm đối giao hữu** giữa các đội trên web (dựa trên khu vực, khung giờ đá).
- **Thu phí tạo đội** nếu web nhiều người dùng (chặn ở bước tạo đội).

## 10. Đã chốt / còn mở

**Đã chốt:**
- “Tiền chuyên cần” = tiền phạt. Người vắng không báo trả bằng tiền trận của các thành viên khác, tiền đó vào quỹ phạt.
- Lịch cố định có vote hằng tuần; người tạo lịch chọn vote nghỉ hay vote đi và hạn chót (VD đêm chủ nhật trước tuần đá).
- Lịch lẻ cũng có vote + hạn vote; mặc định không vote = không đi. Vote đi mà không đến → phạt; không vote mà đi → admin tuỳ ghi chú hoặc phạt. Sau trận admin tích ai đi / không đi theo từng nhóm vote. Lịch cố định xử lý giống hệt.
- Ở chế độ vote đi: không vote mà vẫn đến thì không sao (tính tiền trận bình thường, không phạt).
- Danh sách phạt do admin quyết định (web chỉ gợi ý); quỹ phạt cho phép admin tự nhập nguồn thu và số tiền.
- Thành viên xem được thông số từng người (số dư, số nợ, số trận…).
- Một web nhiều đội: ai cũng đăng ký, tạo đội (tên + mật khẩu); thành viên vào bằng tên đội + mật khẩu đội. Sau này có thể thu phí tạo đội, thêm tìm đối.
- Mã QR ngân hàng do admin của đội tải lên; web đọc số tài khoản trong ảnh.

**Còn mở** (đều chỉnh được trong Cài đặt, không chặn việc dùng):
1. Hai quỹ dùng 2 tài khoản ngân hàng riêng hay chung 1 tài khoản?
2. Tiền trận mặc định: chia đều hay giá cố định mỗi người? Khách có giá riêng không?
3. Đội có thu quỹ trả trước (nộp đầu tháng) hay chủ yếu trả theo từng trận?
4. Có cần mã PIN khi vote để chống vote hộ không?
5. Ngoài vắng không báo, có phạt lỗi khác (đi muộn, quên áo…) không, mức bao nhiêu?

## 11. Công nghệ & triển khai

| Phần | Dùng |
|---|---|
| Web | Next.js (React), Tailwind CSS. Giao diện ưu tiên điện thoại, thêm được vào màn hình chính |
| Cơ sở dữ liệu | Postgres qua Drizzle ORM. Chạy trên máy: PGlite (Postgres nhúng, không cần cài). Chạy thật: **Neon** hoặc **Supabase** (gói free) |
| Đăng nhập | Admin: tài khoản tự đăng ký (mật khẩu mã hoá scrypt). Thành viên: tên đội + mật khẩu đội, chọn tên (+ PIN tuỳ chọn) |
| Ảnh QR | Lưu trong cơ sở dữ liệu (đã thu nhỏ), không cần dịch vụ lưu file |
| Mã QR | Đọc ảnh QR admin tải lên (jsQR, chạy trên trình duyệt), tự sinh lại mã VietQR chuẩn EMVCo kèm số tiền, không phụ thuộc dịch vụ ngoài |
| Hosting | **Vercel** (gói Hobby, miễn phí). Push code lên GitHub là tự deploy, tự cập nhật bảng |

Chi phí: 0đ. Tên miền miễn phí dạng `ten-doi.vercel.app`; muốn tên miền riêng (`.com`, `.vn`) thì mất phí hằng năm.

Các bước deploy chi tiết: xem [README.md](README.md#deploy-miễn-phí-vercel--neon).

> Nên vào Cài đặt → “Tải toàn bộ dữ liệu” mỗi tháng một lần để dự phòng.
