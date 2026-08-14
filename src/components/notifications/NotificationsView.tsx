"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthMessage } from "@/components/auth/Field";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";
import type { AccountNotification, NotificationList } from "@/types/account";

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationsView() {
  const [list, setList] = useState<NotificationList | "loading" | "error">("loading");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiRequest<NotificationList>("/api/notifications")
      .then((next) => {
        if (!cancelled) {
          setList(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setList("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function markAll() {
    setPending(true);
    setMessage(null);
    try {
      const next = await apiRequest<NotificationList>("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
      setList(next);
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

  async function openItem(item: AccountNotification) {
    if (!item.read) {
      try {
        const next = await apiRequest<NotificationList>("/api/notifications", {
          method: "POST",
          body: JSON.stringify({ ids: [item.id] }),
        });
        setList(next);
      } catch {
        // Navigation still continues.
      }
    }
  }

  if (list === "loading") {
    return (
      <section className="glass auth-card" aria-busy="true">
        <p>Loading notifications...</p>
      </section>
    );
  }

  if (list === "error") {
    return (
      <section className="glass auth-card">
        <h1>Notifications</h1>
        <p className="banner">{FRIENDLY_ERROR_MESSAGES.SERVER_UNAVAILABLE}</p>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="glass">
        <p className="eyebrow">Inbox</p>
        <h1>Notifications</h1>
        <p className="muted">
          Friend requests and messages from other XOrA Network accounts show up here.
        </p>
        {list.unreadCount > 0 ? (
          <div className="button-row">
            <button
              className="button button-ghost"
              type="button"
              disabled={pending}
              onClick={() => void markAll()}
            >
              {pending ? "Updating..." : "Mark all as read"}
            </button>
          </div>
        ) : null}
        <AuthMessage message={message} />
      </section>

      <section className="glass">
        {list.items.length === 0 ? (
          <p className="muted">No notifications yet.</p>
        ) : (
          <ul className="notice-list">
            {list.items.map((item) => (
              <li key={item.id} className={item.read ? "notice-row" : "notice-row unread"}>
                <Link href={item.href} onClick={() => void openItem(item)}>
                  <strong>{item.fromDisplayName}</strong>
                  <span>{item.body}</span>
                  <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
