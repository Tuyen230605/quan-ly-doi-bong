import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Tài khoản quản trị (đội trưởng, thủ quỹ). Ai cũng đăng ký được; 1 người quản được nhiều đội. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

/** Đội. Thành viên vào xem bằng tên đội + mật khẩu đội. */
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // tên đội không dấu, dùng trong link và khi đăng nhập
  passwordHash: text("password_hash").notNull(),
  viewerVersion: integer("viewer_version").notNull().default(1), // đổi mật khẩu đội → tăng để mọi máy phải nhập lại
  area: text("area"), // khu vực, để sau này tìm đối
  splitMethod: text("split_method").notNull().default("equal"),
  roundingStep: integer("rounding_step").notNull().default(1000),
  fixedFee: integer("fixed_fee").notNull().default(50000),
  guestFee: integer("guest_fee").notNull().default(70000),
  requirePin: boolean("require_pin").notNull().default(false),
  createdBy: integer("created_by"),
  createdAt: createdAt(),
});

export const teamAdmins = pgTable(
  "team_admins",
  {
    teamId: integer("team_id").notNull(),
    userId: integer("user_id").notNull(),
    role: text("role").notNull().default("admin"), // owner | admin
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.userId] })],
);

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull(),
    fullName: text("full_name").notNull(),
    nickname: text("nickname"),
    phone: text("phone"),
    jerseyNo: integer("jersey_no"),
    position: text("position"), // GK | DF | MF | FW
    type: text("type").notNull().default("member"), // member | guest
    status: text("status").notNull().default("active"), // active | paused | left
    hostPlayerId: integer("host_player_id"), // khách của ai
    pinHash: text("pin_hash"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("players_team").on(t.teamId)],
);

export const venues = pgTable(
  "venues",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    mapUrl: text("map_url"),
    fieldCost: integer("field_cost").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("venues_team").on(t.teamId)],
);

export const schedules = pgTable(
  "schedules",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull(),
    name: text("name").notNull(),
    weekdays: jsonb("weekdays").$type<number[]>().notNull(), // 1 = thứ 2 ... 7 = chủ nhật
    startTime: text("start_time").notNull(),
    endTime: text("end_time"),
    venueId: integer("venue_id"),
    costField: integer("cost_field").notNull().default(0),
    costWater: integer("cost_water").notNull().default(0),
    costReferee: integer("cost_referee").notNull().default(0),
    costOther: integer("cost_other").notNull().default(0),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    voteMode: text("vote_mode").notNull().default("absent"), // absent = vote nghỉ | going = vote đi
    deadlineWeekday: integer("deadline_weekday").notNull().default(7),
    deadlineTime: text("deadline_time").notNull().default("23:59"),
    status: text("status").notNull().default("active"), // active | paused | ended
    createdAt: createdAt(),
  },
  (t) => [index("schedules_team").on(t.teamId)],
);

export const schedulePlayers = pgTable(
  "schedule_players",
  {
    scheduleId: integer("schedule_id").notNull(),
    playerId: integer("player_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.scheduleId, t.playerId] })],
);

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull(),
    scheduleId: integer("schedule_id"), // null = lịch lẻ
    date: text("date").notNull(), // YYYY-MM-DD (giờ VN)
    startTime: text("start_time").notNull(),
    endTime: text("end_time"),
    venueId: integer("venue_id"),
    kind: text("kind").notNull().default("internal"), // internal | friendly | tournament
    opponent: text("opponent"),
    note: text("note"),
    costField: integer("cost_field").notNull().default(0),
    costWater: integer("cost_water").notNull().default(0),
    costReferee: integer("cost_referee").notNull().default(0),
    costOther: integer("cost_other").notNull().default(0),
    voteMode: text("vote_mode"),
    voteDeadline: timestamp("vote_deadline", { withTimezone: true }),
    status: text("status").notNull().default("upcoming"), // upcoming | settled | cancelled
    cancelReason: text("cancel_reason"),
    splitMethod: text("split_method"),
    roundingStep: integer("rounding_step"),
    fixedFee: integer("fixed_fee"),
    guestFee: integer("guest_fee"),
    payerPlayerId: integer("payer_player_id"),
    memberFee: integer("member_fee"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("matches_schedule_date").on(t.scheduleId, t.date),
    index("matches_team_date").on(t.teamId, t.date),
  ],
);

export const votes = pgTable(
  "votes",
  {
    matchId: integer("match_id").notNull(),
    playerId: integer("player_id").notNull(),
    choice: text("choice").notNull(), // going | absent
    reason: text("reason"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedByAdminId: integer("updated_by_admin_id"),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.playerId] })],
);

// Trước khi chốt: chỉ lưu những người admin sửa khác với mặc định (theo vote) và người ngoài lịch.
// Khi chốt: lưu ảnh chụp đầy đủ cả đội hình để tổng kết không bị đổi khi danh sách lịch thay đổi.
export const attendances = pgTable(
  "attendances",
  {
    matchId: integer("match_id").notNull(),
    playerId: integer("player_id").notNull(),
    present: boolean("present").notNull(),
    chargeToPlayerId: integer("charge_to_player_id"),
    feeOverride: integer("fee_override"),
    inRoster: boolean("in_roster").notNull().default(false),
    voteChoice: text("vote_choice"),
    result: text("result"),
    fee: integer("fee"),
    note: text("note"), // admin ghi chú (VD không vote mà đi, không phạt)
  },
  (t) => [primaryKey({ columns: [t.matchId, t.playerId] })],
);

export const funds = pgTable(
  "funds",
  {
    teamId: integer("team_id").notNull(),
    code: text("code").notNull(), // ball | penalty
    name: text("name").notNull(),
    bankBin: text("bank_bin"),
    accountNo: text("account_no"),
    accountName: text("account_name"),
    qrImage: text("qr_image"),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.code] })],
);

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull(),
    fund: text("fund").notNull(),
    type: text("type").notNull(),
    cashAmount: integer("cash_amount").notNull().default(0), // ảnh hưởng tiền quỹ thực có
    playerAmount: integer("player_amount").notNull().default(0), // ảnh hưởng số dư cầu thủ
    playerId: integer("player_id"),
    matchId: integer("match_id"),
    refId: integer("ref_id"),
    penaltyTypeId: integer("penalty_type_id"),
    method: text("method"), // cash | transfer
    category: text("category"),
    note: text("note"),
    date: text("date").notNull(),
    status: text("status").notNull().default("active"), // active | cancelled
    cancelReason: text("cancel_reason"),
    createdBy: integer("created_by"),
    createdAt: createdAt(),
  },
  (t) => [
    index("tx_team_date").on(t.teamId, t.date),
    index("tx_player").on(t.playerId),
    index("tx_match").on(t.matchId),
  ],
);

export const penaltyTypes = pgTable(
  "penalty_types",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull(),
    name: text("name").notNull(),
    amountMode: text("amount_mode").notNull().default("fixed"), // fixed | match_fee
    defaultAmount: integer("default_amount").notNull().default(0),
    isNoShow: boolean("is_no_show").notNull().default(false), // gợi ý cho "vote đi mà không đến"
    isNoVoteCame: boolean("is_no_vote_came").notNull().default(false), // gợi ý cho "không vote mà đi"
    enabled: boolean("enabled").notNull().default(true),
  },
  (t) => [uniqueIndex("penalty_types_team_name").on(t.teamId, t.name)],
);

/** Cài đặt chung của cả web (khoá ký cookie...). Cài đặt từng đội nằm trong bảng teams. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull(),
    actorType: text("actor_type").notNull(), // admin | player
    actorId: integer("actor_id"),
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    detail: text("detail"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_team").on(t.teamId)],
);
