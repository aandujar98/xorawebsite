import { getMessagesHandler } from "@/lib/http/message-handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return getMessagesHandler(request);
}
