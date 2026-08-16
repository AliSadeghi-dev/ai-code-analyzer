"use client";

import { useCallback, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { ActionErrorToast } from "@/components/ui/action-alert";
import {
  retryFullAnalysis,
  type RetryState,
} from "@/lib/actions/analysis";
import { cn } from "@/lib/utils";

const initialState: RetryState = {};

function SubmitButton({
  label,
  pendingLabel,
  className,
  size,
  variant,
}: {
  label: string;
  pendingLabel: string;
  className?: string;
  size?: "default" | "sm" | "xs";
  variant?: "default" | "outline" | "ghost" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size={size}
      variant={variant}
      disabled={pending}
      className={className}
      aria-busy={pending}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function AnalyzeAgainButton({
  projectId,
  className,
  size = "sm",
  variant = "outline",
}: {
  projectId: string;
  className?: string;
  size?: "default" | "sm" | "xs";
  variant?: "default" | "outline" | "ghost" | "secondary";
}) {
  const [state, formAction] = useActionState(retryFullAnalysis, initialState);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const toastError =
    state.error && state.error !== dismissedError ? state.error : null;

  const dismiss = useCallback(() => {
    if (state.error) setDismissedError(state.error);
  }, [state.error]);

  return (
    <>
      <form action={formAction} className="inline-flex">
        <input type="hidden" name="projectId" value={projectId} />
        <SubmitButton
          label="Analyze again"
          pendingLabel="Starting..."
          size={size}
          variant={variant}
          className={cn(className)}
        />
      </form>
      {toastError ? (
        <ActionErrorToast
          key={toastError}
          title="Couldn't restart analysis"
          message={toastError}
          onDismiss={dismiss}
        />
      ) : null}
    </>
  );
}
