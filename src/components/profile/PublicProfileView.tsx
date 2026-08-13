"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/auth/AccountGate";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";
import type { PublicProfile } from "@/types/account";

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
  const [result, setResult] = useState<ProfileQuery | "loading">("loading");
  const isOwn = useMemo(
    () => account.username.toLowerCase() === username.toLowerCase(),
    [account.username, username],
  );

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
        ) : null}
      </section>
    </div>
  );
}
