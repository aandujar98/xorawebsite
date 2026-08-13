import { getAvatarHandler } from "@/lib/http/avatar-handlers";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  return getAvatarHandler(request, decodeURIComponent(username));
}
