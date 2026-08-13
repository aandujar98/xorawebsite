"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/profile/Avatar";
import { apiRequest } from "@/lib/api/browser";
import type { FriendsList } from "@/types/account";

export function FriendsPreview() {
  const [list, setList] = useState<FriendsList | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiRequest<FriendsList>("/api/friends")
      .then((next) => {
        if (!cancelled) {
          setList(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setList({ friends: [], incoming: [], outgoing: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const friends = list?.friends ?? [];
  const incoming = list?.incoming.length ?? 0;
  const preview = friends.slice(0, 6);

  return (
    <section className="glass">
      <h2>Friends</h2>
      {list === null ? (
        <p className="muted">Loading friends...</p>
      ) : friends.length === 0 ? (
        <p className="muted">
          No friends yet.
          {incoming > 0 ? ` You have ${incoming} pending request${incoming === 1 ? "" : "s"}.` : ""}
        </p>
      ) : (
        <ul className="friend-preview">
          {preview.map((friend) => (
            <li key={friend.username}>
              <Link href={`/u/${encodeURIComponent(friend.username)}`}>
                <Avatar
                  name={friend.displayName || friend.username}
                  src={friend.avatarUrl}
                  size={44}
                />
                <span>@{friend.username}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="button-row">
        <Link className="button button-primary" href="/friends" data-nav-item>
          Open friends list
        </Link>
      </div>
    </section>
  );
}
