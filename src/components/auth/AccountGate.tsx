"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiRequest, ApiClientError } from "@/lib/api/browser";
import { FRIENDLY_ERROR_MESSAGES } from "@/types/api";
import type { PublicAccount } from "@/types/account";

type AccountContextValue = {
  account: PublicAccount;
  refresh: () => Promise<void>;
};

type AccountQuery =
  | { status: "ok"; account: PublicAccount }
  | { status: "expired" }
  | { status: "error"; message: string };

const AccountContext = createContext<AccountContextValue | null>(null);

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) {
    throw new Error("useAccount must be used within AccountGate");
  }
  return value;
}

async function loadAccount(): Promise<AccountQuery> {
  try {
    const data = await apiRequest<{ account: PublicAccount }>("/api/account");
    return { status: "ok", account: data.account };
  } catch (caught) {
    if (
      caught instanceof ApiClientError &&
      (caught.code === "SESSION_EXPIRED" || caught.code === "INVALID_CREDENTIALS")
    ) {
      return { status: "expired" };
    }

    if (caught instanceof ApiClientError) {
      return { status: "error", message: caught.message };
    }

    return {
      status: "error",
      message: FRIENDLY_ERROR_MESSAGES.SERVER_UNAVAILABLE,
    };
  }
}

export function AccountGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [result, setResult] = useState<AccountQuery | "loading">("loading");

  useEffect(() => {
    let cancelled = false;
    void loadAccount().then((next) => {
      if (!cancelled) {
        setResult(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setResult("loading");
    const next = await loadAccount();
    setResult(next);
  }, []);

  useEffect(() => {
    if (result !== "loading" && result.status === "expired") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, result, router]);

  const contextValue = useMemo(
    () =>
      result !== "loading" && result.status === "ok"
        ? { account: result.account, refresh }
        : null,
    [refresh, result],
  );

  if (result === "loading" || result.status === "expired") {
    return (
      <section className="glass auth-card" aria-busy="true" aria-live="polite">
        <p>
          {result === "loading"
            ? "Restoring your XOrA Network session..."
            : "Your session has expired. Redirecting to sign in..."}
        </p>
      </section>
    );
  }

  if (result.status === "error" || !contextValue) {
    return (
      <section className="glass auth-card">
        <h1>Unable to open your account</h1>
        <p className="banner">
          {result.status === "error"
            ? result.message
            : FRIENDLY_ERROR_MESSAGES.UNEXPECTED}
        </p>
        <div className="button-row">
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              void refresh();
            }}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <AccountContext.Provider value={contextValue}>{children}</AccountContext.Provider>
  );
}
