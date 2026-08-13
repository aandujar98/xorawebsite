import { uploadAvatarHandler } from "@/lib/http/avatar-handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return uploadAvatarHandler(request);
}
