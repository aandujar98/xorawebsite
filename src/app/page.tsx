import Link from "next/link";
import { FeatureRow } from "@/components/home/FeatureRow";

export default function HomePage() {
  return (
    <div className="home">
      <section className="hero glass">
        <p className="eyebrow">Account.xoranetwork.com</p>
        <h1>Your XOrA Network identity</h1>
        <p className="lede">
          XOrA Network is the online account and social system for XOrA, the
          Android launcher and Libretro emulator frontend. One account will
          follow you across friends, messaging, netplay invitations, cloud
          saves, profiles, and sharing.
        </p>
        <div className="button-row">
          <Link className="button button-primary" href="/login" data-nav-item>
            Sign In
          </Link>
          <Link className="button button-light" href="/register" data-nav-item>
            Create Account
          </Link>
        </div>
      </section>
      <FeatureRow />
    </div>
  );
}
