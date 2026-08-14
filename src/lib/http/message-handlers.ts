import { AppError } from "@/lib/errors";
import { ACCOUNT_MUTATION_RATE_LIMIT } from "@/lib/rate-limit";
import { handleApiRoute, readJsonBody } from "@/lib/http/route";
import { jsonOk } from "@/lib/http/responses";
import {
  getMessageThread,
  listMessageInbox,
  sendDirectMessage,
} from "@/lib/nakama/messages";
import { requireRestoredSession } from "@/lib/session/require";

function sessionUsername(session: { username?: string }): string {
  const username = session.username?.trim() ?? "";
  if (!username) {
    throw new AppError("SESSION_EXPIRED");
  }
  return username;
}

export async function getMessagesHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const session = await requireRestoredSession();
      return jsonOk(await listMessageInbox(sessionUsername(session)));
    },
    { csrf: false },
  );
}

export async function getMessageThreadHandler(
  request: Request,
  username: string,
): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const session = await requireRestoredSession();
      return jsonOk(
        await getMessageThread(session, sessionUsername(session), username),
      );
    },
    { csrf: false },
  );
}

export async function sendMessageHandler(
  request: Request,
  username: string,
): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const body = await readJsonBody<{ body?: string }>(request);
      const session = await requireRestoredSession();
      if (!body.body?.trim()) {
        throw new AppError("INVALID_MESSAGE");
      }
      return jsonOk(await sendDirectMessage(session, username, body.body));
    },
    { rateLimit: ACCOUNT_MUTATION_RATE_LIMIT, rateLimitKey: "message-send" },
  );
}
