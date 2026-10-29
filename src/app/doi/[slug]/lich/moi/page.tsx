import { createMatch } from "@/actions/matches";
import { ActionForm } from "@/components/ActionForm";
import { MatchFields } from "@/components/forms";
import { Card, PageTitle } from "@/components/ui";
import { getVenues } from "@/lib/data";
import { viewCtx } from "@/lib/team";

export default async function NewMatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await viewCtx(params);
  if (!ctx) return null;
  if (!ctx.admin) return <Card>Chỉ admin tạo được lịch.</Card>;
  const venues = await getVenues(ctx.team.id);
  return (
    <>
      <PageTitle>Tạo lịch lẻ</PageTitle>
      <p className="muted">Buổi đá không theo lịch cố định (giao hữu, đá bù, giải). Mặc định có vote: không vote = không đi.</p>
      <Card>
        <ActionForm action={createMatch} className="space-y-4" showOk={false}>
          <MatchFields venues={venues} />
          <button className="btn btn-primary w-full">Tạo buổi đá</button>
        </ActionForm>
      </Card>
    </>
  );
}
