"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action";
import { useTeamId } from "./TeamContext";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Form gọi server action, hiện lỗi/thành công ngay dưới form, không mất dữ liệu đã nhập khi lỗi.
 * Có `action` nên vẫn gửi được (POST thường) khi JS chưa chạy: máy cũ (dưới iOS 16.4 / Chrome 111)
 * hoặc mạng chậm, bấm trước khi trang tải xong.
 */
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
      action={formAction}
      className={className}
      onSubmit={(e) => {
        // JS đã chạy: tự gửi để hỏi xác nhận được và React không tự xoá dữ liệu đã nhập sau khi gửi.
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(fd));
      }}
    >
      {teamId != null && <input type="hidden" name="teamId" value={teamId} />}
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
