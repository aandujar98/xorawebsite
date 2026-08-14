"use client";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { useAccount } from "@/components/auth/AccountGate";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { DeleteAccountSection } from "@/components/profile/DeleteAccountSection";

export function SecurityPanel() {
  const { account } = useAccount();

  return (
    <div className="stack">
      <section className="glass">
        <h2>Change password</h2>
        <p>
          Choose a new password for this XOrA Network account. Use at least 8
          characters with a letter and a number.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="glass">
        <h2>Connected authentication methods</h2>
        <ul className="method-list">
          {account.connectedMethods.map((method) => (
            <li key={method.id}>
              <strong>{method.label}</strong>
              <span>{method.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass">
        <h2>Session</h2>
        <p>Sign out of this browser. Your session cookies will be cleared.</p>
        <SignOutButton />
      </section>

      <DeleteAccountSection />
    </div>
  );
}
