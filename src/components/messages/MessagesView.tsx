"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/browser";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";
import type { MessageInbox } from "@/types/account";

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MessagesView() {
  const [inbox, setInbox] = useState<MessageInbox | "loading" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    void apiRequest<MessageInbox>("/api/messages")
      .then((next) => {
        if (!cancelled) {
          setInbox(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInbox("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (inbox === "loading") {
    return (
      <section className="glass auth-card" aria-busy="true">
        <p>Loading messages...</p>
      </section>
    );
  }

  if (inbox === "error") {
    return (
      <section className="glass auth-card">
        <h1>Messages</h1>
        <p className="banner">{FRIENDLY_ERROR_MESSAGES.SERVER_UNAVAILABLE}</p>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="glass">
        <p className="eyebrow">Inbox</p>
        <h1>Messages</h1>
        <p className="muted">
          Direct messages are limited to people on your friends list. Open a profile or
          friends list to start a conversation.
        </p>
        <div className="button-row">
          <Link className="button button-primary" href="/friends">
            Find a friend
          </Link>
        </div>
      </section>

      <section className="glass">
        {inbox.threads.length === 0 ? (
          <p className="muted">No conversations yet.</p>
        ) : (
          <ul className="notice-list">
            {inbox.threads.map((thread) => (
              <li
                key={thread.username}
                className={thread.unread > 0 ? "notice-row unread" : "notice-row"}
              >
                <Link href={`/messages/${encodeURIComponent(thread.username)}`}>
                  <strong>
                    {thread.displayName}
                    {thread.unread > 0 ? ` (${thread.unread})` : ""}
                  </strong>
                  <span>{thread.lastBody}</span>
                  <time dateTime={thread.lastAt}>{formatTime(thread.lastAt)}</time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
