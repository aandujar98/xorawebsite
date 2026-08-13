"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { FRIENDLY_ERROR_MESSAGES, type AppErrorCode } from "@/types/api";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ id, label, error, hint, children }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
      })
    : children;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {FRIENDLY_ERROR_MESSAGES[error as AppErrorCode] ?? error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthMessage({
  message,
  tone = "error",
}: {
  message: string | null;
  tone?: "error" | "info";
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (message) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <p
      ref={ref}
      className={tone === "info" ? "banner banner-info" : "banner"}
      role="alert"
    >
      {message}
    </p>
  );
}
