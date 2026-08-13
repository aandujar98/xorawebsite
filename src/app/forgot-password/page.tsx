import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <section className="glass auth-card">
      <p className="eyebrow">Account recovery</p>
      <h1>Forgot password</h1>
      <ForgotPasswordForm />
    </section>
  );
}
