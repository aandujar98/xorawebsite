import { changePasswordHandler } from "@/lib/http/recovery-handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return changePasswordHandler(request);
}
