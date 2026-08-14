"use client";

import { useState, type ChangeEvent } from "react";
import { useAccount } from "@/components/auth/AccountGate";
import { Avatar } from "@/components/profile/Avatar";
import { AuthMessage } from "@/components/auth/Field";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { MAX_AVATAR_BYTES } from "@/lib/validation/avatar";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";
import type { PublicAccount } from "@/types/account";

export function AvatarUpload() {
  const { account, refresh } = useAccount();
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"error" | "info">("error");

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setTone("error");
      setMessage(FRIENDLY_ERROR_MESSAGES.AVATAR_TOO_LARGE);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setPending(true);
    setMessage(null);

    try {
      const body = new FormData();
      body.append("photo", file);
      await apiRequest<{ account: PublicAccount }>("/api/account/avatar", {
        method: "POST",
        body,
      });
      await refresh();
      setTone("info");
      setMessage("Profile photo saved.");
    } catch (error) {
      setTone("error");
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : FRIENDLY_ERROR_MESSAGES.UNEXPECTED,
      );
    } finally {
      URL.revokeObjectURL(localPreview);
      setPreview(null);
      setPending(false);
    }
  }

  return (
    <section className="avatar-upload">
      <Avatar
        name={account.displayName || account.username}
        src={preview || account.avatarUrl}
        size={112}
      />
      <div>
        <p className="eyebrow">Profile photo</p>
        <h3>Upload from this device</h3>
        <p className="muted">JPEG, PNG, WebP, or GIF. 1 MB or smaller.</p>
        <label className="button button-light file-button">
          {pending ? "Uploading..." : "Choose photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onFile}
            disabled={pending}
          />
        </label>
        <AuthMessage message={message} tone={tone} />
      </div>
    </section>
  );
}
