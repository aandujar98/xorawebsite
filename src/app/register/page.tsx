import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function RegisterPage() {
  return (
    <section className="glass auth-card">
      <p className="eyebrow">Join the network</p>
      <h1>Create your XOrA Network account</h1>
      <Suspense fallback={<p>Loading registration...</p>}>
        <RegisterForm />
      </Suspense>
    </section>
  );
}
