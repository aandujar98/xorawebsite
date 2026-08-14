import {
  getNotificationsHandler,
  markNotificationsHandler,
} from "@/lib/http/notification-handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return getNotificationsHandler(request);
}

export async function POST(request: Request) {
  return markNotificationsHandler(request);
}
