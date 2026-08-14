import type { NakamaGateway } from "@/lib/nakama/client";
import { getNakamaClient } from "@/lib/nakama/client";
import { withNakamaErrors } from "@/lib/nakama/errors";
import { getLookupSession } from "@/lib/nakama/username-index";

export async function readLookupObject(
  collection: string,
  key: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<unknown> {
  const session = await getLookupSession(client);
  const stored = await withNakamaErrors(() =>
    client.readStorageObjects(session, {
      object_ids: [{ collection, key, user_id: session.user_id }],
    }),
  );
  return stored.objects?.[0]?.value ?? null;
}

export async function writeLookupObject(
  collection: string,
  key: string,
  value: object,
  client: NakamaGateway = getNakamaClient(),
): Promise<void> {
  const session = await getLookupSession(client);
  await withNakamaErrors(() =>
    client.writeStorageObjects(session, [
      {
        collection,
        key,
        value,
        permission_read: 1,
        permission_write: 1,
      },
    ]),
  );
}

export async function deleteLookupObject(
  collection: string,
  key: string,
  client: NakamaGateway = getNakamaClient(),
): Promise<void> {
  const session = await getLookupSession(client);
  await withNakamaErrors(() =>
    client.deleteStorageObjects(session, {
      object_ids: [{ collection, key }],
    }),
  );
}
