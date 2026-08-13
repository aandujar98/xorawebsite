"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAccount } from "@/components/auth/AccountGate";
import { AuthMessage, Field } from "@/components/auth/Field";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";

export function DeleteAccountSection() {
  const { account } = useAccount();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      await apiRequest("/api/account", {
        method: "DELETE",
        body: JSON.stringify({ confirmation }),
      });
      router.replace("/");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        setMessage(error.message);
      } else {
        setMessage(FRIENDLY_ERROR_MESSAGES.UNEXPECTED);
      }
      setPending(false);
    }
  }

  return (
    <section className="danger-panel">
      <h2>Delete account</h2>
      <p>
        This permanently removes your XOrA Network account from Nakama. This
        cannot be undone.
      </p>
      <AuthMessage message={message} />
      <form className="auth-form" onSubmit={onSubmit}>
        <Field
          id="confirmation"
          label={`Type ${account.username} to confirm`}
        >
          <input
            id="confirmation"
            name="confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
        </Field>
        <button
          className="button button-danger"
          type="submit"
          disabled={pending || confirmation !== account.username}
        >
          {pending ? "Deleting..." : "Delete account"}
        </button>
      </form>
    </section>
  );
}
