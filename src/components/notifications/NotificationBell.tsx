"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/browser";
import type { NotificationList } from "@/types/account";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    void apiRequest<NotificationList>("/api/notifications")
      .then((list) => setUnread(list.unreadCount))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <Link className="nav-link nav-bell" href="/notifications" data-nav-item aria-label={label}>
      Notifications
      {unread > 0 ? <span className="nav-count">{unread > 9 ? "9+" : unread}</span> : null}
    </Link>
  );
}
