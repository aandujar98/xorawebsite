import { cookies } from "next/headers";
import Link from "next/link";
import { XoraMark } from "@/components/brand/XoraMark";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/session/constants";

export async function SiteHeader() {
  const store = await cookies();
  const signedIn = Boolean(
    store.get(ACCESS_COOKIE)?.value || store.get(REFRESH_COOKIE)?.value,
  );

  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Link className="brand" href={signedIn ? "/dashboard" : "/"}>
        <XoraMark size={40} />
        <span className="brand-text">
          <span className="brand-name">XOrA</span>
          <span className="brand-sub">Network</span>
        </span>
      </Link>
      <nav className="site-nav" aria-label="Primary">
        {signedIn ? (
          <>
            <Link className="nav-link" href="/dashboard" data-nav-item>
              Dashboard
            </Link>
            <Link className="nav-link" href="/profile" data-nav-item>
              Profile
            </Link>
            <Link className="nav-link" href="/friends" data-nav-item>
              Friends
            </Link>
            <Link className="nav-link" href="/messages" data-nav-item>
              Messages
            </Link>
            <NotificationBell />
            <Link className="nav-link" href="/security" data-nav-item>
              Security
            </Link>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link className="nav-link" href="/login" data-nav-item>
              Sign In
            </Link>
            <Link className="button button-primary" href="/register" data-nav-item>
              Create Account
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
