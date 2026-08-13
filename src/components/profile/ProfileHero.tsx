"use client";

import { Avatar } from "@/components/profile/Avatar";
import type { PublicProfile } from "@/types/account";

function formatDate(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function profileStatus(profile: PublicProfile, disabled = false): string {
  if (disabled) {
    return "Disabled";
  }

  return profile.online ? "Online" : "Offline";
}

export function ProfileHero({
  profile,
  disabled = false,
}: {
  profile: PublicProfile;
  disabled?: boolean;
}) {
  const status = profileStatus(profile, disabled);

  return (
    <section className="glass profile-hero profile-hero-full">
      <Avatar
        name={profile.displayName || profile.username}
        src={profile.avatarUrl}
        size={112}
      />
      <div className="profile-hero-copy">
        <p className="eyebrow">XOrA Network profile</p>
        <h1>{profile.displayName}</h1>
        <p className="username">@{profile.username}</p>
        <p className="profile-meta">
          <span className={profile.online && !disabled ? "status-online" : "status-offline"}>
            {status}
          </span>
          <span>Joined {formatDate(profile.createdAt)}</span>
        </p>
        {profile.location ? <p className="profile-location">{profile.location}</p> : null}
      </div>
    </section>
  );
}
