"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthMessage, Field } from "@/components/auth/Field";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { safeNextPath } from "@/lib/session/constants";
import { validateRegisterInput } from "@/lib/validation/auth";
import { FRIENDLY_ERROR_MESSAGES, type AppErrorCode } from "@/types/api";

const INITIAL = {
  email: "",
  username: "",
  displayName: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const validated = validateRegisterInput(values);
    if (!validated.values) {
      setFieldErrors(validated.errors);
      setMessage(
        FRIENDLY_ERROR_MESSAGES[(validated.code as AppErrorCode) ?? "UNEXPECTED"],
      );
      return;
    }

    setFieldErrors({});
    setPending(true);

    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(values),
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
          value={values.email}
          onChange={(event) => setValues({ ...values, email: event.target.value })}
          required
        />
      </Field>
      <Field
        id="username"
        label="Username"
        error={fieldErrors.username}
        hint="3–128 characters, no spaces."
      >
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          value={values.username}
          onChange={(event) =>
            setValues({ ...values, username: event.target.value })
          }
          required
        />
      </Field>
      <Field id="displayName" label="Display name" error={fieldErrors.displayName}>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="nickname"
          value={values.displayName}
          onChange={(event) =>
            setValues({ ...values, displayName: event.target.value })
          }
          required
        />
      </Field>
      <Field
        id="password"
        label="Password"
        error={fieldErrors.password}
        hint="At least 8 characters, with a letter and a number."
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(event) =>
            setValues({ ...values, password: event.target.value })
          }
          required
        />
      </Field>
      <Field
        id="confirmPassword"
        label="Confirm password"
        error={fieldErrors.confirmPassword}
      >
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(event) =>
            setValues({ ...values, confirmPassword: event.target.value })
          }
          required
        />
      </Field>
      <div className="field check-field">
        <label htmlFor="acceptTerms" className="check-label">
          <input
            id="acceptTerms"
            name="acceptTerms"
            type="checkbox"
            checked={values.acceptTerms}
            onChange={(event) =>
              setValues({ ...values, acceptTerms: event.target.checked })
            }
          />
          <span>
            I accept the XOrA Network terms of use. Accounts are for the XOrA
            launcher and emulator frontend. Email ownership is not verified yet.
          </span>
        </label>
        {fieldErrors.acceptTerms ? (
          <p className="field-error" role="alert">
            {FRIENDLY_ERROR_MESSAGES[fieldErrors.acceptTerms as AppErrorCode] ??
              fieldErrors.acceptTerms}
          </p>
        ) : null}
      </div>
      <AuthMessage message={message} />
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? "Creating account..." : "Create Account"}
      </button>
      <p className="form-footer">
        Already have an account? <Link href="/login">Sign In</Link>
      </p>
    </form>
  );
}
