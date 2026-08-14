import {
  getMessageThreadHandler,
  sendMessageHandler,
} from "@/lib/http/message-handlers";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  return getMessageThreadHandler(request, decodeURIComponent(username));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  return sendMessageHandler(request, decodeURIComponent(username));
}
