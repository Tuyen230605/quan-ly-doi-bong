"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action";
import { useTeamId } from "./TeamContext";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

/** Form gọi server action, hiện lỗi/thành công ngay dưới form, không mất dữ liệu đã nhập khi lỗi. */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  reset = false,
  showOk = true,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  reset?: boolean;
  showOk?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const teamId = useTeamId();

  useEffect(() => {
    if (reset && state?.ok) ref.current?.reset();
  }, [state, reset]);

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        if (teamId != null && !fd.has("teamId")) fd.set("teamId", String(teamId));
        startTransition(() => formAction(fd));
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.error && !pending && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {showOk && state?.ok && !pending && <p className="mt-2 text-sm text-green-700">✓ {state.ok}</p>}
    </form>
  );
}
