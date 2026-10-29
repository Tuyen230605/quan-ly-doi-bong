// Kiểm thử đầu-cuối: mở Chrome thật, bấm như người dùng, kiểm tra số tiền.
// Cần server đang chạy trên DATABASE TRỐNG (VD: rm -rf .data && npm run dev).
// Chạy: BASE=http://localhost:3000 npm run e2e
// Biến môi trường: BASE (mặc định http://localhost:3000), CHROME_PATH (mặc định /usr/bin/google-chrome).
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";
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

async function newPage(who) {
  const ctx = await browser.newContext(mobile);
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
  await expectText(a, "cộng 110.000đ vào quỹ phạt");
  ok("phạt Cường 110.000đ (bằng tiền trận) vào quỹ phạt");

  step = "Nộp tiền, gạch nợ cũ trước";
  await a.goto(`${T}/quy?f=ball`);
  await a.getByText("+ Ghi nộp tiền").click();
  await a.locator("#nop label", { hasText: /^An$/ }).locator("input").check();
  await a.fill("#nop input[name=amount]", "300.000");
  await button(a, "Ghi nộp").click();
  await expectText(a, "Đã ghi 1 khoản nộp");
  await a.reload();
  await expectText(a, "-250.000đ");
  ok("An nộp 300k; quỹ bóng = 110k + 300k − 660k = −250.000đ");
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
  await expectText(a, "200.000đ");
  ok("quỹ phạt nhận 200k từ nguồn “Tài trợ”");

  step = "Công nợ";
  await a.goto(`${T}/cong-no?f=ball`);
  await expectText(a, "3 người đang nợ");
  await expectText(a, "330.000đ");
  await a.goto(`${T}/cong-no?f=penalty`);
  await expectText(a, "Cường");
  ok("nợ quỹ bóng: 3 người 330k; nợ phạt: Cường");

  step = "Thông số thành viên";
  await b.goto(`${T}/cau-thu`);
  await expectText(b, "80.000đ");
  await b.goto(`${T}/tong-ket`);
  await expectText(b, "Cường 1 lần");
  ok("thành viên xem được số dư (An +80k) và tổng kết (Cường 1 lần)");

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
  await expectText(a, "-250.000đ");
  ok("mở lại + chốt lại: Bình vẫn đã trả, quỹ bóng vẫn −250.000đ");

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
  await button(a, "Xác nhận phạt 1 khoản + 1 ghi chú").click();
  await expectText(a, "Đã phạt 1 khoản");
  await a.reload();
  await expectText(a, "📝 Lần đầu, nhắc nhở");
  await a.locator('li[data-player="Dũng"]').getByText("Không vote mà đi").waitFor();
  ok("lịch lẻ: vote đi mà không đến → phạt bằng tiền trận; không vote mà đi → admin chỉ ghi chú");

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
  await b.waitForURL("**/doi/fc-van-phong");
  ok("đổi mật khẩu đội → thành viên phải nhập lại");

  step = "Duyệt mọi trang";
  const teamPages = ["", "/vote", "/lich", "/lich?tab=da", "/lich/moi", "/lich/co-dinh", "/cau-thu", "/cau-thu/1", "/quy"];
  teamPages.push("/quy?f=penalty", "/cong-no", "/qr", "/tong-ket", "/tong-ket?y=2026", "/lich-su", "/lich-su?tab=nk");
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
