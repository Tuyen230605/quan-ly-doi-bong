import type { Player } from "@/lib/auth";
import type { Match, Schedule, Venue } from "@/lib/data";
import { KIND_LABELS, POSITIONS } from "@/lib/labels";
import { pname } from "@/lib/text";
import { WEEKDAYS, WEEKDAY_NAMES, todayVN, vnParts } from "@/lib/time";
import { Field } from "./ui";

function money(v: number | undefined | null) {
  return v ? v.toLocaleString("vi-VN") : "";
}

export function VenueSelect({ venues, value }: { venues: Venue[]; value?: number | null }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Sân">
        <select className="input" name="venueId" defaultValue={value ?? ""}>
          <option value="">— Chọn sân đã lưu —</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="…hoặc sân mới" hint="Nhập tên để lưu sân mới">
        <input className="input" name="newVenue" placeholder="Tên sân mới" />
      </Field>
    </div>
  );
}

export function CostFields({ v }: { v?: Partial<Pick<Match, "costField" | "costWater" | "costReferee" | "costOther">> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Tiền sân">
        <input className="input" name="costField" inputMode="numeric" defaultValue={money(v?.costField)} placeholder="0" />
      </Field>
      <Field label="Nước">
        <input className="input" name="costWater" inputMode="numeric" defaultValue={money(v?.costWater)} placeholder="0" />
      </Field>
      <Field label="Trọng tài">
        <input className="input" name="costReferee" inputMode="numeric" defaultValue={money(v?.costReferee)} placeholder="0" />
      </Field>
      <Field label="Khác">
        <input className="input" name="costOther" inputMode="numeric" defaultValue={money(v?.costOther)} placeholder="0" />
      </Field>
    </div>
  );
}

export function MatchFields({ m, venues }: { m?: Match; venues: Venue[] }) {
  return (
    <div className="space-y-3">
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Ngày">
          <input className="input" type="date" name="date" defaultValue={m?.date ?? todayVN()} required />
        </Field>
        <Field label="Bắt đầu">
          <input className="input" type="time" name="startTime" defaultValue={m?.startTime ?? "19:00"} required />
        </Field>
        <Field label="Kết thúc">
          <input className="input" type="time" name="endTime" defaultValue={m?.endTime ?? "20:30"} />
        </Field>
      </div>
      <VenueSelect venues={venues} value={m?.venueId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Loại">
          <select className="input" name="kind" defaultValue={m?.kind ?? "internal"}>
            {Object.entries(KIND_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Đối thủ">
          <input className="input" name="opponent" defaultValue={m?.opponent ?? ""} placeholder="Khi đá giao hữu / giải" />
        </Field>
      </div>
      <div>
        <p className="label">Chi phí dự kiến</p>
        <CostFields v={m} />
      </div>
      <Field label="Ghi chú">
        <input className="input" name="note" defaultValue={m?.note ?? ""} placeholder="VD: mặc áo trắng" />
      </Field>
      <MatchVoteFields m={m} />
    </div>
  );
}

function MatchVoteFields({ m }: { m?: Match }) {
  const deadline = m?.voteDeadline ? vnParts(m.voteDeadline) : null;
  return (
    <fieldset className="rounded-xl border border-gray-200 p-3">
      <legend className="px-1 text-sm font-semibold text-gray-700">Vote</legend>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="vote" defaultChecked={m ? m.voteMode != null : true} className="size-4 accent-green-700" />
        Cho thành viên vote đi / nghỉ
      </label>
      <div className="mt-2 space-y-1.5">
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="voteMode" value="going" defaultChecked={(m?.voteMode ?? "going") === "going"} className="mt-1 accent-green-700" />
          <span>
            <b>Vote đi</b>: không vote = không đi
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="voteMode" value="absent" defaultChecked={m?.voteMode === "absent"} className="mt-1 accent-green-700" />
          <span>
            <b>Vote nghỉ</b>: không vote = đi
          </span>
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Hạn vote: ngày">
          <input className="input" type="date" name="deadlineDate" defaultValue={deadline?.date ?? ""} />
        </Field>
        <Field label="Giờ">
          <input className="input" type="time" name="deadlineTime" defaultValue={deadline?.time ?? ""} />
        </Field>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Để trống hạn vote = khoá trước giờ đá 2 tiếng. Sau trận: vote đi mà không đến → gợi ý phạt; không vote mà đi → admin tuỳ ghi chú
        hoặc phạt.
      </p>
    </fieldset>
  );
}

export function ScheduleFields({ s, venues }: { s?: Schedule; venues: Venue[] }) {
  return (
    <div className="space-y-3">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Tên lịch">
        <input className="input" name="name" defaultValue={s?.name ?? ""} placeholder="VD: Tối thứ 4" required />
      </Field>
      <div>
        <p className="label">Đá vào các thứ</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((w) => (
            <label key={w} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm has-[:checked]:border-green-600 has-[:checked]:bg-green-50">
              <input type="checkbox" name="weekdays" value={w} defaultChecked={s?.weekdays.includes(w)} className="accent-green-700" />
              {WEEKDAY_NAMES[w]}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bắt đầu">
          <input className="input" type="time" name="startTime" defaultValue={s?.startTime ?? "19:00"} required />
        </Field>
        <Field label="Kết thúc">
          <input className="input" type="time" name="endTime" defaultValue={s?.endTime ?? "20:30"} />
        </Field>
      </div>
      <VenueSelect venues={venues} value={s?.venueId} />
      <div>
        <p className="label">Chi phí mỗi buổi</p>
        <CostFields v={s} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Từ ngày">
          <input className="input" type="date" name="startDate" defaultValue={s?.startDate ?? todayVN()} required />
        </Field>
        <Field label="Đến ngày" hint="Để trống = không giới hạn">
          <input className="input" type="date" name="endDate" defaultValue={s?.endDate ?? ""} />
        </Field>
      </div>
      <fieldset className="rounded-xl border border-gray-200 p-3">
        <legend className="px-1 text-sm font-semibold text-gray-700">Vote hằng tuần</legend>
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="voteMode" value="absent" defaultChecked={(s?.voteMode ?? "absent") === "absent"} className="mt-1 accent-green-700" />
            <span>
              <b>Vote nghỉ</b>: ai nghỉ thì vote, không vote = đi
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="voteMode" value="going" defaultChecked={s?.voteMode === "going"} className="mt-1 accent-green-700" />
            <span>
              <b>Vote đi</b>: ai đi thì vote, không vote = không đi
            </span>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Hạn chót vote">
            <select className="input" name="deadlineWeekday" defaultValue={s?.deadlineWeekday ?? 7}>
              {WEEKDAYS.map((w) => (
                <option key={w} value={w}>
                  {WEEKDAY_NAMES[w]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lúc">
            <input className="input" type="time" name="deadlineTime" defaultValue={s?.deadlineTime ?? "23:59"} />
          </Field>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Hạn chót là lần gần nhất của thứ + giờ này, trước buổi đá đầu tiên trong tuần. VD đá thứ 4, hạn “Chủ nhật 23:59” → vote
          khoá lúc 23:59 chủ nhật tuần trước.
        </p>
      </fieldset>
    </div>
  );
}

export function PlayerFields({ p, members }: { p?: Player; members: Player[] }) {
  return (
    <div className="space-y-3">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Họ tên">
          <input className="input" name="fullName" defaultValue={p?.fullName ?? ""} required />
        </Field>
        <Field label="Tên gọi" hint="Tên hay gọi ở sân, hiển thị ưu tiên">
          <input className="input" name="nickname" defaultValue={p?.nickname ?? ""} placeholder="VD: Tuấn Gầy" />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Số áo">
          <input className="input" name="jerseyNo" inputMode="numeric" defaultValue={p?.jerseyNo ?? ""} />
        </Field>
        <Field label="Vị trí">
          <select className="input" name="position" defaultValue={p?.position ?? ""}>
            <option value="">—</option>
            {Object.entries(POSITIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="SĐT">
          <input className="input" name="phone" inputMode="tel" defaultValue={p?.phone ?? ""} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Loại">
          <select className="input" name="type" defaultValue={p?.type ?? "member"}>
            <option value="member">Thành viên</option>
            <option value="guest">Khách</option>
          </select>
        </Field>
        <Field label="Trạng thái">
          <select className="input" name="status" defaultValue={p?.status ?? "active"}>
            <option value="active">Đang đá</option>
            <option value="paused">Tạm nghỉ</option>
            <option value="left">Đã rời đội</option>
          </select>
        </Field>
      </div>
      <Field label="Khách của (nếu là khách)" hint="Tiền của khách tính vào người này khi điểm danh">
        <select className="input" name="hostPlayerId" defaultValue={p?.hostPlayerId ?? ""}>
          <option value="">Khách tự trả</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {pname(m)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ghi chú">
        <input className="input" name="note" defaultValue={p?.note ?? ""} />
      </Field>
    </div>
  );
}
