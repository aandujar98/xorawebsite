"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/profile/Avatar";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";
import type { FriendEntry, FriendsList } from "@/types/account";

export function FriendRow({
  entry,
  onChanged,
  actions,
}: {
  entry: FriendEntry;
  onChanged: (list: FriendsList) => void;
  actions: Array<"accept" | "remove">;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(method: "POST" | "DELETE") {
    setPending(true);
    setError(null);
    try {
      const list = await apiRequest<FriendsList>("/api/friends", {
        method,
        body: JSON.stringify({ username: entry.username }),
      });
      onChanged(list);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : FRIENDLY_ERROR_MESSAGES.UNEXPECTED,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="friend-row">
      <Avatar name={entry.displayName || entry.username} src={entry.avatarUrl} size={52} />
      <div className="friend-copy">
        <Link href={`/u/${encodeURIComponent(entry.username)}`}>{entry.displayName}</Link>
        <p className="username">@{entry.username}</p>
        {error ? <p className="field-error">{error}</p> : null}
      </div>
      <div className="button-row friend-actions">
        {actions.includes("accept") ? (
          <button
            className="button button-primary"
            type="button"
            disabled={pending}
            onClick={() => void run("POST")}
          >
            Accept
          </button>
        ) : null}
        {actions.includes("remove") ? (
          <button
            className="button button-ghost"
            type="button"
            disabled={pending}
            onClick={() => void run("DELETE")}
          >
            {entry.state === "outgoing" ? "Cancel" : entry.state === "incoming" ? "Decline" : "Remove"}
          </button>
        ) : null}
      </div>
    </li>
  );
}
