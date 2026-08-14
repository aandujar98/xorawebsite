import { AppError } from "@/lib/errors";
import { ACCOUNT_MUTATION_RATE_LIMIT } from "@/lib/rate-limit";
import { handleApiRoute, readJsonBody } from "@/lib/http/route";
import { jsonOk } from "@/lib/http/responses";
import { listCurrentFriends } from "@/lib/nakama/friends";
import {
  listNotifications,
  markNotificationsRead,
} from "@/lib/nakama/notifications";
import { requireRestoredSession } from "@/lib/session/require";

function sessionUsername(session: { username?: string }): string {
  const username = session.username?.trim() ?? "";
  if (!username) {
    throw new AppError("SESSION_EXPIRED");
  }
  return username;
}

export async function getNotificationsHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const session = await requireRestoredSession();
      const friends = await listCurrentFriends(session);
      const list = await listNotifications(sessionUsername(session), friends.incoming);
      return jsonOk(list);
    },
    { csrf: false },
  );
}

export async function markNotificationsHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const body = await readJsonBody<{ ids?: string[]; all?: boolean }>(request);
      const session = await requireRestoredSession();
      const friends = await listCurrentFriends(session);
      const list = await markNotificationsRead(
        sessionUsername(session),
        {
          ids: Array.isArray(body.ids) ? body.ids : [],
          all: Boolean(body.all),
        },
        friends.incoming,
      );
      return jsonOk(list);
    },
    { rateLimit: ACCOUNT_MUTATION_RATE_LIMIT, rateLimitKey: "notifications-read" },
  );
}
