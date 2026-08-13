import type { Metadata } from "next";
import { SecurityPanel } from "@/components/profile/SecurityPanel";

export const metadata: Metadata = {
  title: "Security",
};

export default function SecurityPage() {
  return (
    <div className="stack">
      <header>
        <p className="eyebrow">Security</p>
        <h1>Account security</h1>
      </header>
      <SecurityPanel />
    </div>
  );
}
