"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "@/components/auth/AccountGate";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";
import type { FriendEntry, FriendsList, PublicProfile } from "@/types/account";

type ProfileQuery =
  | { status: "ok"; profile: PublicProfile }
  | { status: "error"; message: string };

async function loadProfile(username: string): Promise<ProfileQuery> {
  try {
    const data = await apiRequest<{ profile: PublicProfile }>(
      `/api/users/${encodeURIComponent(username)}`,
    );
    return { status: "ok", profile: data.profile };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { status: "error", message: error.message };
    }

    return {
      status: "error",
      message: FRIENDLY_ERROR_MESSAGES.UNEXPECTED,
    };
  }
}

export function PublicProfileView({ username }: { username: string }) {
  const { account } = useAccount();
  const isOwn = account.username.toLowerCase() === username.toLowerCase();
  const [result, setResult] = useState<ProfileQuery | "loading">("loading");
  const [relation, setRelation] = useState<FriendEntry["state"] | "none" | "loading">(
    isOwn ? "none" : "loading",
  );
  const [friendPending, setFriendPending] = useState(false);
  const [friendMessage, setFriendMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadProfile(username).then((next) => {
      if (!cancelled) {
        setResult(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    if (isOwn) {
      return;
    }

    let cancelled = false;
    void apiRequest<FriendsList>("/api/friends")
      .then((list) => {
        if (cancelled) {
          return;
        }
        const match = [...list.friends, ...list.incoming, ...list.outgoing].find(
          (entry) => entry.username.toLowerCase() === username.toLowerCase(),
        );
        setRelation(match?.state ?? "none");
      })
      .catch(() => {
        if (!cancelled) {
          setRelation("none");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOwn, username]);

  async function changeFriend(method: "POST" | "DELETE") {
    setFriendPending(true);
    setFriendMessage(null);
    try {
      const next = await apiRequest<FriendsList>("/api/friends", {
        method,
        body: JSON.stringify({ username }),
      });
      const match = [...next.friends, ...next.incoming, ...next.outgoing].find(
        (entry) => entry.username.toLowerCase() === username.toLowerCase(),
      );
      setRelation(match?.state ?? "none");
    } catch (error) {
      setFriendMessage(
        error instanceof ApiClientError
          ? error.message
          : FRIENDLY_ERROR_MESSAGES.UNEXPECTED,
      );
    } finally {
      setFriendPending(false);
    }
  }

  if (result === "loading") {
    return (
      <section className="glass auth-card" aria-busy="true" aria-live="polite">
        <p>Loading profile...</p>
      </section>
    );
  }

  if (result.status === "error") {
    return (
      <section className="glass auth-card">
        <h1>Profile not found</h1>
        <p className="banner">{result.message}</p>
        <Link className="button button-primary" href="/dashboard">
          Back to dashboard
        </Link>
      </section>
    );
  }

  return (
    <div className="stack">
      <ProfileHero profile={result.profile} />
      <section className="glass">
        <h2>Profile details</h2>
        <dl className="details">
          <div>
            <dt>Display name</dt>
            <dd>{result.profile.displayName}</dd>
          </div>
          <div>
            <dt>Username</dt>
            <dd>@{result.profile.username}</dd>
          </div>
          <div>
            <dt>XOrA Network user ID</dt>
            <dd className="mono">{result.profile.id}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{result.profile.location || "Not set"}</dd>
          </div>
        </dl>
        {isOwn ? (
          <div className="button-row">
            <Link className="button button-primary" href="/profile">
              Edit Profile
            </Link>
          </div>
        ) : (
          <div className="button-row">
            {relation === "friend" ? (
              <>
                <Link
                  className="button button-primary"
                  href={`/messages/${encodeURIComponent(result.profile.username)}`}
                >
                  Message
                </Link>
                <button
                  className="button button-ghost"
                  type="button"
                  disabled={friendPending}
                  onClick={() => void changeFriend("DELETE")}
                >
                  Remove friend
                </button>
              </>
            ) : relation === "incoming" ? (
              <>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={friendPending}
                  onClick={() => void changeFriend("POST")}
                >
                  Accept request
                </button>
                <button
                  className="button button-ghost"
                  type="button"
                  disabled={friendPending}
                  onClick={() => void changeFriend("DELETE")}
                >
                  Decline
                </button>
              </>
            ) : relation === "outgoing" ? (
              <button
                className="button button-ghost"
                type="button"
                disabled={friendPending}
                onClick={() => void changeFriend("DELETE")}
              >
                Cancel request
              </button>
            ) : (
              <button
                className="button button-primary"
                type="button"
                disabled={friendPending || relation === "loading"}
                onClick={() => void changeFriend("POST")}
              >
                Add Friend
              </button>
            )}
            <Link className="button button-ghost" href="/friends">
              Friends list
            </Link>
          </div>
        )}
        {friendMessage ? <p className="banner">{friendMessage}</p> : null}
      </section>
    </div>
  );
}
