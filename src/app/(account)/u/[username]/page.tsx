import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return {
    title: `@${decodeURIComponent(username)}`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);

  return (
    <Suspense
      fallback={
        <section className="glass auth-card" aria-busy="true">
          <p>Loading profile...</p>
        </section>
      }
    >
      <PublicProfileView key={decoded} username={decoded} />
    </Suspense>
  );
}
