import { sessionHandler } from "@/lib/http/auth-handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return sessionHandler(request);
}
