import { ACCOUNT_MUTATION_RATE_LIMIT } from "@/lib/rate-limit";
import { handleApiRoute } from "@/lib/http/route";
import { jsonOk } from "@/lib/http/responses";
import { readAvatarByUsername, uploadCurrentAvatar } from "@/lib/nakama/avatar";
import { AppError } from "@/lib/errors";
import { requireRestoredSession } from "@/lib/session/require";

export async function uploadAvatarHandler(request: Request): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const form = await request.formData();
      const photo = form.get("photo");
      if (!(photo instanceof File)) {
        throw new AppError("INVALID_AVATAR_IMAGE");
      }

      const session = await requireRestoredSession();
      const account = await uploadCurrentAvatar(session, photo);
      return jsonOk({ account });
    },
    { rateLimit: ACCOUNT_MUTATION_RATE_LIMIT, rateLimitKey: "avatar-upload" },
  );
}

export async function getAvatarHandler(
  request: Request,
  username: string,
): Promise<Response> {
  return handleApiRoute(
    request,
    async () => {
      const session = await requireRestoredSession();
      const avatar = await readAvatarByUsername(session, username);
      const body = Uint8Array.from(avatar.bytes);

      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": avatar.mime,
          "Cache-Control": "private, max-age=300",
        },
      });
    },
    { csrf: false },
  );
}
