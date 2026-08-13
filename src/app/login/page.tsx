import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <section className="glass auth-card">
      <p className="eyebrow">Welcome back</p>
      <h1>Sign in to XOrA Network</h1>
      <Suspense fallback={<p>Loading sign-in...</p>}>
        <LoginForm />
      </Suspense>
    </section>
  );
}
