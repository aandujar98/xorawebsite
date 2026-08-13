"use client";

import Link from "next/link";
import { useAccount } from "@/components/auth/AccountGate";
import { Avatar } from "@/components/profile/Avatar";
import { FriendsPreview } from "@/components/friends/FriendsPreview";
import { ComingSoonCard } from "@/components/profile/ComingSoonCard";
import { SignOutButton } from "@/components/auth/SignOutButton";

const PREVIEWS = [
  {
    title: "Messages",
    description: "Inbox and conversations are not available yet.",
  },
  {
    title: "Netplay Invites",
    description: "Invites into XOrA Libretro sessions will show up here.",
  },
  {
    title: "Cloud Saves",
    description: "Cloud save status will be listed here in a later release.",
  },
  {
    title: "Shared Photos",
    description: "XOrA Network sharing is planned and not enabled yet.",
  },
  {
    title: "Linked XOrA Devices",
    description: "Launcher device linking is not available on this website yet.",
  },
] as const;

function formatDate(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DashboardView() {
  const { account } = useAccount();
  const status = account.disabled
    ? "Disabled"
    : account.online
      ? "Online"
      : "Signed in";

  return (
    <div className="stack">
      <section className="glass profile-hero">
        <Avatar name={account.displayName || account.username} src={account.avatarUrl} />
        <div>
          <p className="eyebrow">XOrA Network</p>
          <h1>{account.displayName}</h1>
          <p className="username">
            <Link href="/profile">@{account.username}</Link>
          </p>
        </div>
      </section>

      <section className="glass">
        <h2>Account</h2>
        <dl className="details">
          <div>
            <dt>Username</dt>
            <dd>{account.username}</dd>
          </div>
          <div>
            <dt>Display name</dt>
            <dd>{account.displayName}</dd>
          </div>
          <div>
            <dt>XOrA Network user ID</dt>
            <dd className="mono">{account.id}</dd>
          </div>
          <div>
            <dt>Account created</dt>
            <dd>{formatDate(account.createdAt)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{status}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{account.email || "Not available"}</dd>
          </div>
          <div>
            <dt>Email verification</dt>
            <dd>Not verified yet</dd>
          </div>
        </dl>
        <div className="button-row">
          <Link className="button button-primary" href="/profile" data-nav-item>
            Edit Profile
          </Link>
          <Link className="button button-ghost" href="/security" data-nav-item>
            Security Settings
          </Link>
          <SignOutButton />
        </div>
      </section>

      <FriendsPreview />

      <section aria-labelledby="coming-soon-heading">
        <h2 id="coming-soon-heading">Coming soon</h2>
        <div className="preview-grid">
          {PREVIEWS.map((preview) => (
            <ComingSoonCard key={preview.title} {...preview} />
          ))}
        </div>
      </section>
    </div>
  );
}
