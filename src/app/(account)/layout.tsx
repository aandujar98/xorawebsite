import { AccountGate } from "@/components/auth/AccountGate";
import { Suspense, type ReactNode } from "react";

export const dynamic = "force-dynamic";

function AccountLoading() {
  return (
    <section className="glass auth-card" aria-busy="true" aria-live="polite">
      <p>Restoring your XOrA Network session...</p>
    </section>
  );
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AccountLoading />}>
      <AccountGate>{children}</AccountGate>
    </Suspense>
  );
}
