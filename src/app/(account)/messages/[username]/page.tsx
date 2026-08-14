import { ConversationView } from "@/components/messages/ConversationView";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return {
    title: `Message @${decodeURIComponent(username)}`,
  };
}

export default async function ConversationPage({
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
          <p>Loading conversation...</p>
        </section>
      }
    >
      <ConversationView key={decoded} username={decoded} />
    </Suspense>
  );
}
