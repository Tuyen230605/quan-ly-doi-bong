// Kiểm thử đầu-cuối: mở Chrome thật, bấm như người dùng, kiểm tra số tiền.
// Cần server đang chạy trên DATABASE TRỐNG (VD: rm -rf .data && npm run dev).
// Chạy: BASE=http://localhost:3000 npm run e2e
// Biến môi trường: BASE (mặc định http://localhost:3000), CHROME_PATH (mặc định /usr/bin/google-chrome).
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jsQR from "jsqr";
import { chromium } from "playwright-core";
import pngjs from "pngjs";
import QRCode from "qrcode";

const BASE = process.env.BASE ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const SHOTS = join(process.cwd(), "e2e-shots");
const T = `${BASE}/doi/fc-van-phong`;
const QR_FILE = join(tmpdir(), "e2e-bank-qr.png");
mkdirSync(SHOTS, { recursive: true });

const errors = [];
let step = "";
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  throw new Error(`[${step}] ${msg}`);
};
const expectText = async (page, text, timeout = 15000) => {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout });
  } catch {
    await page.screenshot({ path: join(SHOTS, "fail.png"), fullPage: true, caret: "initial" });
    fail(`Không thấy "${text}" trên ${page.url()}`);
  }
};
const button = (page, name) => page.getByRole("button", { name, exact: true });
/** Đọc nội dung mã QR từ ảnh trên trang (ảnh PNG dạng data URL). */
const readQr = async (page, alt) => {
  const img = page.locator(`img[alt="${alt}"]`).first();
  await img.waitFor();
  const src = await img.getAttribute("src");
  if (!src?.startsWith("data:image/png;base64,")) fail(`ảnh QR "${alt}" không có: ${src?.slice(0, 40)}`);
  const png = pngjs.PNG.sync.read(Buffer.from(src.split(",")[1], "base64"));
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (!code) fail(`không đọc được mã QR "${alt}"`);
  return code.data;
};
const vnDate = (addDays = 0) => new Date(Date.now() + 7 * 3600e3 + addDays * 864e5).toISOString().slice(0, 10);

/** Ảnh QR ngân hàng giả lập: Vietcombank, STK 0123456789 (chuẩn VietQR). */
async function makeBankQr() {
  const tlv = (id, v) => id + String(v.length).padStart(2, "0") + v;
  const crc = (str) => {
    let c = 0xffff;
    for (let i = 0; i < str.length; i++) {
      c ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) c = (c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1) & 0xffff;
    }
    return c.toString(16).toUpperCase().padStart(4, "0");
  };
  const merchant = tlv("00", "A000000727") + tlv("01", tlv("00", "970436") + tlv("01", "0123456789")) + tlv("02", "QRIBFTTA");
  const body = tlv("00", "01") + tlv("01", "11") + tlv("38", merchant) + tlv("53", "704") + tlv("58", "VN") + "6304";
  await QRCode.toFile(QR_FILE, body + crc(body), { width: 600, margin: 4 });
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const mobile = { viewport: { width: 390, height: 844 }, locale: "vi-VN" };

function watch(page, who) {
  page.on("pageerror", (e) => errors.push(`${who} pageerror ${page.url()}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${who} console ${page.url()}: ${m.text()}`));
  page.on("response", (r) => r.status() >= 500 && errors.push(`${who} HTTP ${r.status()} ${r.url()}`));
  page.on("dialog", (d) => d.accept());
}

async function newPage(who, opts = {}) {
  const ctx = await browser.newContext({ ...mobile, ...opts });
  const page = await ctx.newPage();
  watch(page, who);
  return { ctx, page };
}

try {
  await makeBankQr();
  const { ctx: adminCtx, page: a } = await newPage("admin");

  step = "Đăng ký + tạo đội";
  await a.goto(`${BASE}/`);
  await a.getByRole("link", { name: "Đăng ký & tạo đội" }).click();
  await a.waitForURL("**/dang-ky");
  await a.fill("input[name=displayName]", "Hùng");
  await a.fill("input[name=username]", "hung");
  await a.fill("input[name=password]", "matkhau123");
  await button(a, "Đăng ký").click();
  await a.waitForURL("**/tao-doi");
  await a.fill("input[name=name]", "FC Văn Phòng");
  await a.fill("input[name=area]", "Cầu Giấy");
  await a.fill("input[name=password]", "bong123");
  await button(a, "Tạo đội").click();
  await a.waitForURL("**/doi/fc-van-phong");
  ok("đăng ký admin, tạo đội → /doi/fc-van-phong");

  step = "Tải ảnh QR ngân hàng";
  await a.goto(`${T}/cai-dat`);
  const fundBox = a.locator("details", { hasText: "Quỹ bóng" }).first();
  await fundBox.locator("summary").click();
  await fundBox.locator("input[type=file]").setInputFiles(QR_FILE);
  await expectText(a, "Đọc được: Vietcombank · 0123456789");
  await fundBox.locator("input[name=accountName]").fill("nguyen van hung");
  await fundBox.getByRole("button", { name: "Lưu" }).click();
  await expectText(a, "Đã lưu");
  await a.reload();
  await expectText(a, "Quỹ bóng · 0123456789");
  ok("web đọc được ngân hàng + số TK từ ảnh QR và lưu lại");

  step = "Thêm cầu thủ";
  await a.goto(`${T}/cau-thu`);
  await a.getByText("+ Thêm nhanh nhiều người").click();
  await a.fill("textarea[name=names]", "An\nBình\nCường\nDũng\nTuấn\nHải");
  await button(a, "Thêm tất cả").click();
  await expectText(a, "Đã thêm 6 người");
  ok("thêm 6 thành viên");

  step = "Lịch cố định";
  const today = new Date(Date.now() + 7 * 3600e3);
  const wd = today.getUTCDay() === 0 ? 7 : today.getUTCDay();
  await a.goto(`${T}/lich/co-dinh`);
  await a.fill("input[name=name]", "Đá tối hằng tuần");
  await a.check(`input[name=weekdays][value="${wd}"]`);
  await a.fill("input[name=newVenue]", "Sân Hoàng Mai");
  await a.fill("input[name=costField]", "600.000");
  await a.fill("input[name=costWater]", "60.000");
  await button(a, "Tạo lịch").click();
  await a.waitForURL(/\/lich\/co-dinh\/\d+/);
  await expectText(a, "6 thành viên");
  const matchLinks = a.locator("a[href^='/doi/fc-van-phong/tran/']");
  if ((await matchLinks.count()) !== 4) fail(`mong 4 buổi trong 4 tuần, thấy ${await matchLinks.count()}`);
  const todayHref = await matchLinks.first().getAttribute("href");
  const nextHref = await matchLinks.nth(1).getAttribute("href");
  ok(`tạo lịch, sinh 4 buổi; hôm nay ${todayHref}, tuần sau ${nextHref}`);

  step = "Thành viên vào đội bằng tên + mật khẩu";
  const { page: b } = await newPage("member");
  await b.goto(`${T}/cau-thu`);
  await expectText(b, "Mật khẩu đội");
  await b.goto(`${BASE}/`);
  await b.fill("input[name=team]", "fc van PHONG");
  await b.fill("input[name=password]", "sai-mat-khau");
  await button(b, "Vào đội").click();
  await expectText(b, "Sai tên đội hoặc mật khẩu đội");
  await b.fill("input[name=password]", "bong123");
  await button(b, "Vào đội").click();
  await b.waitForURL("**/doi/fc-van-phong");
  ok("gõ tên không dấu + mật khẩu đúng thì vào được, sai thì báo lỗi");

  step = "Thành viên vote";
  await b.goto(`${T}/toi`);
  await b.selectOption("select[name=playerId]", { label: "Bình" });
  await button(b, "Xác nhận").click();
  await b.waitForURL("**/vote");
  await expectText(b, "Phiếu đã khoá");
  const nextCard = b.locator("section.card", { has: b.locator(`a[href='${nextHref}']`) });
  await nextCard.locator("input[name=reason]").fill("Đi công tác");
  await nextCard.getByRole("button", { name: "❌ NGHỈ" }).click();
  await expectText(b, "Đã vote NGHỈ");
  await b.goto(`${BASE}${nextHref}`);
  await expectText(b, "Đi công tác");
  ok("Bình vote NGHỈ tuần sau; phiếu tuần này đã khoá");

  step = "Máy cũ / JS chưa chạy vẫn vào đội, chọn tên, vote được";
  const { page: old } = await newPage("nojs", { javaScriptEnabled: false });
  await old.goto(`${T}/vote`);
  await old.fill("input[name=password]", "bong123");
  await button(old, "Vào đội").click();
  await old.waitForURL(`**/doi/fc-van-phong/vote`);
  if (old.url().includes("password")) fail("mật khẩu bị lộ lên thanh địa chỉ");
  await old.goto(`${T}/toi`);
  await old.selectOption("select[name=playerId]", { label: "Hải" });
  await button(old, "Xác nhận").click();
  await old.waitForURL("**/vote");
  const oldNext = old.locator("section.card", { has: old.locator(`a[href='${nextHref}']`) });
  await oldNext.getByRole("button", { name: "✅ ĐI" }).click();
  await expectText(old, "Đã vote ĐI");
  ok("tắt JavaScript: nhập mật khẩu → quay lại trang vote, chọn tên Hải, vote ĐI tuần sau");

  step = "Điểm danh + chốt tiền";
  await a.goto(`${BASE}${todayHref}`);
  await expectText(a, "Điểm danh");
  await a.locator("li button", { hasText: "Cường" }).click();
  await a.fill("input[placeholder='Tên khách mới']", "Long");
  await button(a, "Thêm khách").click();
  await a.locator("li", { hasText: "Long" }).locator("select").selectOption({ label: "Khách của An" });
  await expectText(a, "6 người · 5 thành viên + 1 khách");
  await expectText(a, "110.000đ");
  await button(a, "Chốt tiền trận (6 người)").click();
  await expectText(a, "Ai đá & tiền trận (6 người)");
  await expectText(a, "Vote đi mà không đến");
  await expectText(a, "tính cho An");
  ok("chốt 6 người × 110.000đ, Cường vote đi (mặc định) mà không đến, khách Long tính cho An");

  step = "Tích đã trả";
  const binhRow = a.locator('li[data-player="Bình"]');
  await binhRow.locator("select[name=method]").selectOption("cash");
  await binhRow.getByRole("button", { name: "Đã trả" }).click();
  await a.locator('li[data-player="Bình"]').getByText("✅ Đã trả").waitFor();
  ok("Bình đã trả");

  step = "Phạt vote đi mà không đến";
  await expectText(a, "Xác nhận phạt 1 khoản");
  const penAmount = await a.locator("#phat input[inputmode=numeric]").first().inputValue();
  if (penAmount !== "110.000") fail(`mức phạt gợi ý ${penAmount}, mong 110.000`);
  await button(a, "Xác nhận phạt 1 khoản").click();
  await expectText(a, "trừ quỹ cá nhân, cộng 110.000đ vào quỹ phạt");
  await expectText(a, "✅ Đã trừ quỹ cá nhân");
  await a.locator('li[data-player="Cường"]').getByText("🚨 Vắng không báo 110.000đ").waitFor();
  ok("phạt Cường 110.000đ (bằng tiền trận), trừ vào quỹ cá nhân, chuyển sang quỹ phạt, ghi vào danh sách trận");

  step = "Nộp tiền, gạch nợ cũ trước";
  await a.goto(`${T}/quy?f=ball`);
  await a.getByText("+ Ghi nộp tiền").click();
  await a.locator("#nop label", { hasText: /^An$/ }).locator("input").check();
  await a.fill("#nop input[name=amount]", "300.000");
  await button(a, "Ghi nộp").click();
  await expectText(a, "Đã ghi 1 khoản nộp");
  await a.reload();
  await expectText(a, "-360.000đ");
  ok("An nộp 300k; quỹ bóng = 110k + 300k − 660k − 110k (phạt Cường chuyển sang quỹ phạt) = −360.000đ");
  await a.goto(`${BASE}${todayHref}`);
  await a.locator('li[data-player="An"]').getByText("✅ Đã trả").waitFor();
  ok("tiền trận của An (+ khách) tự gạch bằng tiền nộp trước");

  step = "Thu khác quỹ phạt";
  await a.goto(`${T}/quy?f=penalty`);
  await a.getByText("+ Ghi khoản thu khác").click();
  await a.fill("#thu input[name=source]", "Tài trợ");
  await a.fill("#thu input[name=amount]", "200.000");
  await button(a, "Ghi thu").click();
  await expectText(a, "Đã ghi khoản thu");
  await a.reload();
  await expectText(a, "310.000đ");
  ok("quỹ phạt = 110k phạt Cường + 200k từ nguồn “Tài trợ”");

  step = "Công nợ";
  await a.goto(`${T}/cong-no?f=ball`);
  await expectText(a, "4 người đang nợ");
  await expectText(a, "440.000đ");
  await a.goto(`${T}/cong-no?f=penalty`);
  await expectText(a, "Không ai nợ");
  ok("nợ quỹ bóng: 4 người 440k (Cường nợ vì phạt đã trừ quỹ cá nhân); quỹ phạt không ai nợ");

  step = "Thông số thành viên";
  await b.goto(`${T}/cau-thu`);
  await expectText(b, "80.000đ");
  await b.goto(`${T}/tong-ket`);
  await expectText(b, "Cường 1 lần");
  await b.getByRole("link", { name: /Từng thành viên/ }).click();
  await b.waitForURL(/tab=tv/);
  const headers = await b.locator("table th").allInnerTexts();
  if (headers.slice(0, 3).join("|") !== "Tên|Quỹ cá nhân|Đi/buổi") fail(`cột bảng thành viên: ${headers.join("|")}`);
  const anRow = b.locator("tr", { has: b.getByRole("link", { name: "An", exact: true }) });
  if (!(await anRow.innerText()).includes("80.000đ")) fail("bảng thành viên: An phải có quỹ 80.000đ");
  ok("thành viên xem được số dư (An +80k), tổng kết (Cường 1 lần), tab bảng thành viên: quỹ cá nhân + số buổi đi lên đầu");

  step = "Trang chủ: quỹ cá nhân";
  await b.goto(T);
  const myFund = b.locator("a", { hasText: "Quỹ cá nhân" });
  await myFund.waitFor();
  const myFundText = await myFund.innerText();
  if (!myFundText.includes("Bình") || !myFundText.includes("0đ")) fail(`ô quỹ cá nhân: ${myFundText}`);
  if (await b.getByText("Đang nợ nhiều nhất").count()) fail("trang chủ vẫn còn mục Đang nợ nhiều nhất");
  ok("trang chủ có ô Quỹ cá nhân của Bình (0đ), không còn Đang nợ nhiều nhất");

  step = "QR";
  await b.goto(`${T}/qr?fund=ball&player=4&amount=110000`);
  await b.locator("img[alt^='Quỹ bóng']").waitFor();
  ok("tạo được ảnh VietQR có số tiền");

  step = "CSV + sao lưu";
  const csv = await (await adminCtx.request.get(`${T}/api/tong-ket`)).text();
  if (!csv.includes("Cường")) fail("CSV thiếu dữ liệu");
  const json = await (await adminCtx.request.get(`${T}/api/export`)).json();
  if (!json.transactions?.length) fail("export rỗng");
  ok(`CSV + export JSON (${json.transactions.length} giao dịch)`);

  step = "Mở lại trận và chốt lại";
  await a.goto(`${BASE}${todayHref}`);
  await a.getByText("↺ Mở lại trận để sửa").click();
  await expectText(a, "Chốt tiền trận (6 người)");
  await button(a, "Chốt tiền trận (6 người)").click();
  await expectText(a, "Ai đá & tiền trận (6 người)");
  await a.locator('li[data-player="Bình"]').getByText("✅ Đã trả").waitFor();
  await a.goto(`${T}/quy?f=ball`);
  await expectText(a, "-360.000đ");
  ok("mở lại + chốt lại: Bình vẫn đã trả, quỹ bóng vẫn −360.000đ");

  step = "Lịch lẻ có vote";
  await a.goto(`${T}/lich/moi`);
  await a.fill("input[name=date]", vnDate(1));
  await a.selectOption("select[name=kind]", "friendly");
  await a.fill("input[name=opponent]", "FC Bạn");
  await a.fill("input[name=costField]", "300.000");
  await button(a, "Tạo buổi đá").click();
  await a.waitForURL(/\/tran\/\d+/);
  const oneOffHref = new URL(a.url()).pathname;
  await b.goto(`${T}/vote`);
  const oneOffCard = b.locator("section.card", { has: b.locator(`a[href='${oneOffHref}']`) });
  await oneOffCard.getByRole("button", { name: "✅ ĐI" }).click();
  await expectText(b, "Đã vote ĐI");
  await a.reload();
  const voteCard = a.locator("section.card", { has: a.locator("h2", { hasText: "Vote" }) });
  await voteCard.locator("li").filter({ hasText: /^An/ }).getByRole("button", { name: "Nghỉ", exact: true }).click();
  await expectText(a, "Vote NGHỈ · 1");
  await a.locator('li[data-player="Bình"] button').first().click();
  await a.locator('li[data-player="Dũng"] button').first().click();
  await expectText(a, "Vote đi mà không đến: 1");
  await expectText(a, "Không vote mà đi: 1");
  await button(a, "Chốt tiền trận (1 người)").click();
  await expectText(a, "Xác nhận phạt 1 khoản");
  const binhPenalty = await a.locator('#phat div[data-player="Bình"] input[inputmode=numeric]').inputValue();
  if (binhPenalty !== "300.000") fail(`phạt Bình ${binhPenalty}, mong 300.000`);
  await a.locator('#phat div[data-player="Dũng"] input[name=note]').fill("Lần đầu, nhắc nhở");
  const quick = a.locator("#phat [data-quick]");
  await quick.locator("select").selectOption({ label: "Đi muộn" });
  await quick.getByRole("textbox", { name: "Số tiền phạt mỗi người" }).fill("15.000");
  await quick.getByRole("button", { name: "Dũng", exact: true }).click();
  await quick.getByPlaceholder(/Ghi chú/).fill("muộn 20 phút");
  await button(quick, "+ Thêm 1 người vào danh sách phạt").click();
  await button(a, "Xác nhận phạt 2 khoản + 1 ghi chú").click();
  await expectText(a, "Đã phạt 2 khoản");
  await a.reload();
  await expectText(a, "📝 Lần đầu, nhắc nhở");
  const dung = a.locator('li[data-player="Dũng"]');
  await dung.getByText("Không vote mà đi").waitFor();
  await dung.getByText("🚨 Đi muộn 15.000đ · muộn 20 phút").waitFor();
  if (!(await dung.innerText()).includes("-425.000đ")) fail(`quỹ Dũng sau phạt: ${await dung.innerText()}`);
  ok("lịch lẻ: vote đi không đến → phạt bằng tiền trận; không vote mà đi → chỉ ghi chú; tích nhanh Dũng đi muộn 15k, quỹ còn −425k");

  step = "Huỷ phạt trả lại quỹ cá nhân";
  await a.locator("#phat li", { hasText: "Đi muộn" }).getByRole("button", { name: "Huỷ" }).click();
  await a.locator("#phat li", { hasText: "Đi muộn" }).getByText("Đã huỷ").waitFor();
  if (!(await dung.innerText()).includes("-410.000đ")) fail(`quỹ Dũng sau huỷ phạt: ${await dung.innerText()}`);
  ok("huỷ phạt đi muộn → quỹ Dũng về −410k");

  step = "Đội thứ 2 tách biệt";
  const { page: c } = await newPage("lan");
  await c.goto(`${BASE}/dang-ky`);
  await c.fill("input[name=displayName]", "Lan");
  await c.fill("input[name=username]", "lan");
  await c.fill("input[name=password]", "matkhau456");
  await button(c, "Đăng ký").click();
  await c.waitForURL("**/tao-doi");
  await c.fill("input[name=name]", "FC Văn Phòng");
  await c.fill("input[name=password]", "abcd");
  await button(c, "Tạo đội").click();
  await expectText(c, "Tên đội đã có đội khác dùng");
  await c.fill("input[name=name]", "Đội Bóng Thứ Hai");
  await button(c, "Tạo đội").click();
  await c.waitForURL("**/doi/doi-bong-thu-hai");
  await c.goto(`${BASE}/doi/doi-bong-thu-hai/cau-thu`);
  await expectText(c, "Chưa có ai");
  await c.goto(`${T}/cau-thu`);
  await expectText(c, "Mật khẩu đội");
  await a.goto(`${BASE}/doi/doi-bong-thu-hai/cai-dat`);
  await expectText(a, "Mật khẩu đội");
  ok("trùng tên bị chặn; đội 2 không thấy dữ liệu đội 1; admin đội 1 không vào được đội 2");

  step = "Đổi mật khẩu đội";
  await a.goto(`${T}/cai-dat`);
  await a.fill("input[placeholder='Mật khẩu đội mới']", "moi456");
  await button(a, "Đổi mật khẩu").click();
  await expectText(a, "Thành viên phải nhập mật khẩu mới");
  await b.goto(`${T}/cau-thu`);
  await expectText(b, "Mật khẩu đội");
  await b.fill("input[name=password]", "moi456");
  await button(b, "Vào đội").click();
  await b.waitForURL("**/doi/fc-van-phong/cau-thu");
  ok("đổi mật khẩu đội → thành viên phải nhập lại, nhập xong quay lại đúng trang đang mở");

  step = "Quy định đội";
  await a.goto(T);
  await a.locator("summary", { hasText: "Viết quy định" }).click();
  const rules = a.locator("textarea[name=rules]");
  if (!(await rules.inputValue()).includes("Đi muộn: 10.000đ")) fail("mẫu quy định chưa có mức phạt");
  await rules.fill("1. Đi muộn phạt 10k\n2. Vote trước 23h59 chủ nhật");
  await button(a, "Lưu quy định").click();
  await expectText(a, "Đã lưu quy định");
  await b.goto(T);
  await expectText(b, "Vote trước 23h59 chủ nhật");
  ok("admin viết quy định ở cuối trang chủ, thành viên xem được");

  step = "Link nộp tiền";
  await a.goto(T);
  await a.getByRole("link", { name: "🔳 Tạo link / QR nộp tiền" }).click();
  await a.waitForURL("**/nop");
  await a.fill("input[name=title]", "Quỹ tháng 11");
  await a.fill("input[name=amount]", "200.000");
  await a.fill("input[name=note]", "T11");
  await button(a, "Tạo link").click();
  await a.waitForURL(/\/nop\/\d+$/);
  const payPath = new URL(a.url()).pathname;
  await expectText(a, "Ai đã nộp (0/6)");
  // Thành viên mới: vào link → nhập mật khẩu đội → chọn tên → quay lại đúng link
  const { page: d } = await newPage("dung");
  await d.goto(`${BASE}${payPath}`);
  await d.fill("input[name=password]", "moi456");
  await button(d, "Vào đội").click();
  await expectText(d, "Chọn tên của bạn trước");
  if (await d.locator("a[data-app]").count()) fail("chưa chọn tên mà đã hiện app ngân hàng");
  await d.selectOption("select[name=playerId]", { label: "Dũng" });
  await button(d, "Xác nhận").click();
  await d.waitForURL(`**${payPath}`);
  await expectText(d, "Nộp cho Dũng");
  const dungQr = await readQr(d, "Quỹ tháng 11");
  for (const part of ["0123456789", "5406200000", "0808DUNG T11"]) if (!dungQr.includes(part)) fail(`mã QR của Dũng thiếu ${part}: ${dungQr}`);
  if (await d.getByRole("button", { name: /Copy/ }).or(d.getByRole("link", { name: /Tải ảnh/ })).count())
    fail("trang nộp tiền không được có nút copy / tải QR");
  ok("thành viên vào link → nhập mật khẩu → chọn tên → hiện ngay mã QR: STK quỹ, 200.000đ, nội dung DUNG T11");
  // Máy cũ (không chạy JavaScript) vẫn thấy mã QR
  await old.goto(`${BASE}${payPath}`);
  await old.fill("input[name=password]", "moi456");
  await button(old, "Vào đội").click();
  await old.waitForURL(`**${payPath}`);
  await expectText(old, "Nộp cho Hải");
  const haiQr = await readQr(old, "Quỹ tháng 11");
  for (const part of ["5406200000", "0807HAI T11"]) if (!haiQr.includes(part)) fail(`mã QR của Hải thiếu ${part}: ${haiQr}`);
  await old.goto(T);
  if (!(await readQr(old, "Quỹ bóng")).includes("0123456789")) fail("QR quỹ bóng ở trang chủ sai");
  ok("tắt JavaScript: vẫn thấy mã QR nộp tiền (HAI T11) và QR quỹ ở trang chủ");
  await a.locator('li[data-player="Bình"]').getByRole("button", { name: "Đã nhận" }).click();
  await a.locator('li[data-player="Bình"]').getByText("✅ Đã nộp").waitFor();
  await expectText(a, "Ai đã nộp (1/6)");
  await b.goto(`${BASE}${payPath}`);
  await expectText(b, "Bình đã nộp");
  await expectText(b, "-100.000đ");
  await b.goto(T);
  await b.locator("a", { hasText: "Quỹ tháng 11" }).getByText("✅ Đã nộp").waitFor();
  ok("admin tích Đã nhận → cộng 200k vào quỹ cá nhân Bình (−300k phạt lịch lẻ + 200k = −100k)");

  step = "Duyệt mọi trang";
  const teamPages = ["", "/vote", "/lich", "/lich?tab=da", "/lich/moi", "/lich/co-dinh", "/cau-thu", "/cau-thu/1", "/quy"];
  teamPages.push("/quy?f=penalty", "/cong-no", "/qr", "/tong-ket", "/tong-ket?y=2026", "/tong-ket?tab=tv", "/lich-su", "/lich-su?tab=nk");
  teamPages.push("/nop", "/nop/1");
  teamPages.push("/cai-dat", "/them", "/toi");
  for (const p of teamPages) {
    const r = await a.goto(`${T}${p}`);
    if (!r || r.status() >= 400) fail(`${p} → ${r?.status()}`);
  }
  for (const p of ["/", "/tai-khoan", "/tao-doi", "/login", "/dang-ky"]) {
    const r = await a.goto(`${BASE}${p}`);
    if (!r || r.status() >= 400) fail(`${p} → ${r?.status()}`);
  }
  ok(`${teamPages.length + 5} trang đều mở được`);
} catch (e) {
  console.error("✗", e.message);
  process.exitCode = 1;
} finally {
  if (errors.length) {
    console.log("\nLỗi phát hiện trên trình duyệt / server:");
    for (const e of [...new Set(errors)]) console.log(" -", e.slice(0, 400));
    process.exitCode = 1;
  }
  await browser.close();
}
