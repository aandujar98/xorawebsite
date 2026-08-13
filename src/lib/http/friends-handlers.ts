import { AppError } from "@/lib/errors";
import { ACCOUNT_MUTATION_RATE_LIMIT } from "@/lib/rate-limit";
import { handleApiRoute, readJsonBody } from "@/lib/http/route";
import { jsonOk } from "@/lib/http/responses";
import {
  addFriendByUsername,
  listCurrentFriends,
  removeFriendByUsername,
} from "@/lib/nakama/friends";
import { requireRestoredSession } from "@/lib/session/require";

export async function getFriendsHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const session = await requireRestoredSession();
      return jsonOk(await listCurrentFriends(session));
    },
    { csrf: false },
  );
}

export async function addFriendHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const body = await readJsonBody<{ username?: string }>(request);
      const username = body.username?.trim() ?? "";
      if (!username) {
        throw new AppError("INVALID_USERNAME");
      }

      const session = await requireRestoredSession();
      return jsonOk(await addFriendByUsername(session, username));
    },
    { rateLimit: ACCOUNT_MUTATION_RATE_LIMIT, rateLimitKey: "friend-add" },
  );
}

export async function removeFriendHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const body = await readJsonBody<{ username?: string }>(request);
      const username = body.username?.trim() ?? "";
      if (!username) {
        throw new AppError("INVALID_USERNAME");
      }

      const session = await requireRestoredSession();
      return jsonOk(await removeFriendByUsername(session, username));
    },
    { rateLimit: ACCOUNT_MUTATION_RATE_LIMIT, rateLimitKey: "friend-remove" },
  );
}
