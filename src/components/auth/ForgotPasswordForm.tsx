"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthMessage, Field } from "@/components/auth/Field";
import { requestPasswordRecovery } from "@/lib/auth/password-recovery";
import { validateEmail } from "@/lib/validation/auth";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(
    FRIENDLY_ERROR_MESSAGES.PASSWORD_RECOVERY_UNAVAILABLE,
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setError(undefined);
    const result = await requestPasswordRecovery(email);
    if (result.status === "unavailable") {
      setMessage(FRIENDLY_ERROR_MESSAGES.PASSWORD_RECOVERY_UNAVAILABLE);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <AuthMessage message={message} tone="info" />
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
      <button className="button button-primary" type="submit">
        Request reset
      </button>
      <p className="form-footer">
        Remembered your password? <Link href="/login">Sign In</Link>
      </p>
    </form>
  );
}
