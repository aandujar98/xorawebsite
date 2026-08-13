import { getPublicProfileHandler } from "@/lib/http/account-handlers";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  return getPublicProfileHandler(request, decodeURIComponent(username));
}
