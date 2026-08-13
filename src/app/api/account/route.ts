import {
  deleteAccountHandler,
  getAccountHandler,
  updateAccountHandler,
} from "@/lib/http/account-handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return getAccountHandler(request);
}

export async function PATCH(request: Request) {
  return updateAccountHandler(request);
}

export async function DELETE(request: Request) {
  return deleteAccountHandler(request);
}
