import { randomBytes } from "node:crypto";
import type { DB } from "./index";
import { funds, penaltyTypes, settings } from "./schema";

/** Cài đặt chung, chạy 1 lần khi kết nối. */
export async function seed(db: DB) {
  await db
    .insert(settings)
    .values({ key: "sessionSecret", value: randomBytes(32).toString("base64url") })
    .onConflictDoNothing();
}

/** Dữ liệu mặc định khi tạo đội mới: 2 quỹ và các loại lỗi phạt. */
export async function seedTeam(db: Pick<DB, "insert">, teamId: number) {
  await db
    .insert(funds)
    .values([
      { teamId, code: "ball", name: "Quỹ bóng" },
      { teamId, code: "penalty", name: "Quỹ phạt" },
    ])
    .onConflictDoNothing();
  await db
    .insert(penaltyTypes)
    .values([
      { teamId, name: "Vắng không báo", amountMode: "match_fee", defaultAmount: 50000, isNoShow: true },
      { teamId, name: "Không vote mà đi", defaultAmount: 20000, isNoVoteCame: true },
      { teamId, name: "Đi muộn", defaultAmount: 10000 },
      { teamId, name: "Quên áo", defaultAmount: 10000 },
    ])
    .onConflictDoNothing();
}
