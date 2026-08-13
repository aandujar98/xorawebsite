"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthMessage, Field } from "@/components/auth/Field";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { safeNextPath } from "@/lib/session/constants";
import { validateLoginInput } from "@/lib/validation/auth";
import { FRIENDLY_ERROR_MESSAGES, type AppErrorCode } from "@/types/api";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const validated = validateLoginInput({ email, password, rememberMe });
    if (!validated.values) {
      setFieldErrors(validated.errors);
      setMessage(
        FRIENDLY_ERROR_MESSAGES[(validated.code as AppErrorCode) ?? "INVALID_CREDENTIALS"],
      );
      return;
    }

    setFieldErrors({});
    setPending(true);

    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, rememberMe }),
      });
      router.replace(safeNextPath(searchParams.get("next")));
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFieldErrors(error.fields ?? {});
        setMessage(error.message);
      } else {
        setMessage(FRIENDLY_ERROR_MESSAGES.UNEXPECTED);
      }
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <Field id="email" label="Email" error={fieldErrors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>
      <Field id="password" label="Password" error={fieldErrors.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
      <div className="field check-field">
        <label htmlFor="rememberMe" className="check-label">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          <span>Remember me on this device</span>
        </label>
      </div>
      <AuthMessage message={message} />
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign In"}
      </button>
      <p className="form-footer">
        <Link href="/forgot-password">Forgot password</Link>
      </p>
      <p className="form-footer">
        New to XOrA Network? <Link href="/register">Create Account</Link>
      </p>
    </form>
  );
}
