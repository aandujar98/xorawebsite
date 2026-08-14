import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage() {
  return (
    <section className="glass auth-card">
      <p className="eyebrow">Account recovery</p>
      <h1>Choose a new password</h1>
      <ResetPasswordForm />
    </section>
  );
}
