"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AuthMessage, Field } from "@/components/auth/Field";
import { useAccount } from "@/components/auth/AccountGate";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";
import type { MessageThread } from "@/types/account";

export function ConversationView({ username }: { username: string }) {
  const { account } = useAccount();
  const [thread, setThread] = useState<MessageThread | "loading" | "error">("loading");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiRequest<MessageThread>(`/api/messages/${encodeURIComponent(username)}`)
      .then((next) => {
        if (!cancelled) {
          setThread(next);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error instanceof ApiClientError
              ? error.message
              : FRIENDLY_ERROR_MESSAGES.UNEXPECTED,
          );
          setThread("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const next = await apiRequest<MessageThread>(
        `/api/messages/${encodeURIComponent(username)}`,
        {
          method: "POST",
          body: JSON.stringify({ body }),
        },
      );
      setThread(next);
      setBody("");
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : FRIENDLY_ERROR_MESSAGES.UNEXPECTED,
      );
    } finally {
      setPending(false);
    }
  }

  if (thread === "loading") {
    return (
      <section className="glass auth-card" aria-busy="true">
        <p>Loading conversation...</p>
      </section>
    );
  }

  if (thread === "error") {
    return (
      <section className="glass auth-card">
        <h1>Messages</h1>
        <p className="banner">{message ?? FRIENDLY_ERROR_MESSAGES.NOT_FRIENDS}</p>
        <Link className="button button-primary" href="/messages">
          Back to messages
        </Link>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="glass">
        <p className="eyebrow">Conversation</p>
        <h1>{thread.displayName}</h1>
        <p className="username">
          <Link href={`/u/${encodeURIComponent(thread.username)}`}>@{thread.username}</Link>
        </p>
        <div className="button-row">
          <Link className="button button-ghost" href="/messages">
            All messages
          </Link>
        </div>
      </section>

      <section className="glass">
        {thread.messages.length === 0 ? (
          <p className="muted">No messages yet. Say hello.</p>
        ) : (
          <ul className="chat-list">
            {thread.messages.map((entry) => (
              <li
                key={entry.id}
                className={
                  entry.fromUsername.toLowerCase() === account.username.toLowerCase()
                    ? "chat-row mine"
                    : "chat-row"
                }
              >
                <p>{entry.body}</p>
                <time dateTime={entry.createdAt}>
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(entry.createdAt))}
                </time>
              </li>
            ))}
          </ul>
        )}
        <form className="auth-form" onSubmit={onSubmit}>
          <Field id="message-body" label="Message">
            <textarea
              id="message-body"
              name="body"
              rows={3}
              maxLength={500}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
            />
          </Field>
          <AuthMessage message={message} />
          <div className="button-row">
            <button
              className="button button-primary"
              type="submit"
              disabled={pending || !body.trim()}
            >
              {pending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
