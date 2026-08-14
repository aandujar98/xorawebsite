import { resetPasswordHandler } from "@/lib/http/recovery-handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return resetPasswordHandler(request);
}
