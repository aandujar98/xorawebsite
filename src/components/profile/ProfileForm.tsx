"use client";

import { useState, type FormEvent } from "react";
import { useAccount } from "@/components/auth/AccountGate";
import { AuthMessage, Field } from "@/components/auth/Field";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { validateProfileInput } from "@/lib/validation/auth";
import { FRIENDLY_ERROR_MESSAGES, type AppErrorCode } from "@/types/api";

export function ProfileForm() {
  const { account, refresh } = useAccount();
  const [displayName, setDisplayName] = useState(account.displayName);
  const [username, setUsername] = useState(account.username);
  const [location, setLocation] = useState(account.location);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"error" | "info">("error");
  const [pending, setPending] = useState(false);

  function reset() {
    setDisplayName(account.displayName);
    setUsername(account.username);
    setLocation(account.location);
    setFieldErrors({});
    setMessage(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validated = validateProfileInput({
      displayName,
      username,
      avatarUrl: account.avatarUrl,
      location,
    });
    if (!validated.values) {
      setFieldErrors(validated.errors);
      setTone("error");
      setMessage(
        FRIENDLY_ERROR_MESSAGES[(validated.code as AppErrorCode) ?? "UNEXPECTED"],
      );
      return;
    }

    setPending(true);
    setFieldErrors({});
    try {
      await apiRequest("/api/account", {
        method: "PATCH",
        body: JSON.stringify(validated.values),
      });
      await refresh();
      setTone("info");
      setMessage("Profile saved.");
    } catch (error) {
      setTone("error");
      if (error instanceof ApiClientError) {
        setFieldErrors(error.fields ?? {});
        setMessage(error.message);
      } else {
        setMessage(FRIENDLY_ERROR_MESSAGES.UNEXPECTED);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <Field id="displayName" label="Display name" error={fieldErrors.displayName}>
        <input
          id="displayName"
          name="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </Field>
      <Field
        id="username"
        label="Username"
        error={fieldErrors.username}
        hint="Changing your username refreshes your XOrA Network session."
      >
        <input
          id="username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </Field>
      <Field
        id="location"
        label="Location"
        error={fieldErrors.location}
        hint="Optional. Shown on your public XOrA Network profile."
      >
        <input
          id="location"
          name="location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />
      </Field>
      <AuthMessage message={message} tone={tone} />
      <div className="button-row">
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </button>
        <button className="button button-ghost" type="button" onClick={reset}>
          Cancel
        </button>
      </div>
    </form>
  );
}
