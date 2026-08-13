import { loginHandler } from "@/lib/http/auth-handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return loginHandler(request);
}
