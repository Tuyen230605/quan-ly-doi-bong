import { forgetMe } from "@/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { ChooseMe } from "@/components/ChooseMe";
import { Card, PageTitle } from "@/components/ui";
import { getPlayers } from "@/lib/data";
import { viewCtx } from "@/lib/team";
import { pname } from "@/lib/text";

export default async function MePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  const { team, me, base } = ctx;
  const next = (await searchParams).next;
  const players = await getPlayers(team.id);
  const members = players.filter((p) => p.type === "member" && p.status !== "left");
  return (
    <>
      <PageTitle>Bạn là ai?</PageTitle>
      {me && (
        <Card>
          <p>
            Máy này đang là: <b>{pname(me)}</b>
          </p>
          <ActionForm action={forgetMe} className="mt-2" showOk={false}>
            <button className="btn btn-sm">Đổi người khác</button>
          </ActionForm>
        </Card>
      )}
      <Card>
        <p className="muted mb-3">
          Chọn tên của bạn một lần, web sẽ nhớ trên điện thoại này để bạn vote đi/nghỉ, xem quỹ cá nhân và nộp tiền.
        </p>
        <ChooseMe members={members} me={me} requirePin={team.requirePin} next={next?.startsWith(base) ? next : undefined} />
        <p className="mt-3 text-xs text-gray-500">Không thấy tên mình? Nhắn admin thêm vào danh sách đội.</p>
      </Card>
    </>
  );
}
