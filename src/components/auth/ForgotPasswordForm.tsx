"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthMessage, Field } from "@/components/auth/Field";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { PASSWORD_RECOVERY_ACCEPTED_MESSAGE } from "@/lib/recovery-message";
import { validateEmail } from "@/lib/validation/auth";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      setMessage(null);
      return;
    }

    setError(undefined);
    setPending(true);
    try {
      const result = await apiRequest<{ accepted: boolean; message: string }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
      );
      setMessage(result.message || PASSWORD_RECOVERY_ACCEPTED_MESSAGE);
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        setError(caught.fields?.email);
        setMessage(caught.message);
      } else {
        setMessage(FRIENDLY_ERROR_MESSAGES.UNEXPECTED);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <AuthMessage
        message={message}
        tone={message === PASSWORD_RECOVERY_ACCEPTED_MESSAGE ? "info" : "error"}
      />
      <Field id="email" label="Email" error={error}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? "Sending..." : "Request reset"}
      </button>
      <p className="form-footer">
        Remembered your password? <Link href="/login">Sign In</Link>
      </p>
    </form>
  );
}
