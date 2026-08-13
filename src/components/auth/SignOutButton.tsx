"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api/browser";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // Local navigation still signs the user out of the website UI.
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <button
      className="button button-ghost"
      type="button"
      onClick={onSignOut}
      disabled={pending}
      data-nav-item
    >
      {pending ? "Signing out..." : "Sign Out"}
    </button>
  );
}
