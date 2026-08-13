"use client";

import Link from "next/link";
import { useAccount } from "@/components/auth/AccountGate";
import { ComingSoonCard } from "@/components/profile/ComingSoonCard";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileHero } from "@/components/profile/ProfileHero";

export function ProfileView() {
  const { account } = useAccount();
  const publicUrl = `/u/${encodeURIComponent(account.username)}`;

  return (
    <div className="stack">
      <ProfileHero profile={account} disabled={account.disabled} />

      <section className="glass">
        <h2>Profile details</h2>
        <dl className="details">
          <div>
            <dt>Display name</dt>
            <dd>{account.displayName}</dd>
          </div>
          <div>
            <dt>Username</dt>
            <dd>@{account.username}</dd>
          </div>
          <div>
            <dt>XOrA Network user ID</dt>
            <dd className="mono">{account.id}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{account.location || "Not set"}</dd>
          </div>
          <div>
            <dt>Public profile</dt>
            <dd>
              <Link href={publicUrl}>{publicUrl}</Link>
            </dd>
          </div>
        </dl>
      </section>

      <section className="glass">
        <p className="eyebrow">Edit</p>
        <h2>Update your profile</h2>
        <p className="muted">
          These fields are stored on your Nakama account and can be shown in XOrA.
        </p>
        <ProfileForm />
      </section>

      <section aria-labelledby="profile-soon">
        <h2 id="profile-soon">Coming soon</h2>
        <div className="preview-grid">
          <ComingSoonCard
            title="Friends"
            description="People who follow this profile will appear here."
          />
          <ComingSoonCard
            title="Shared Photos"
            description="XOrA Network sharing is not enabled yet."
          />
        </div>
      </section>
    </div>
  );
}
