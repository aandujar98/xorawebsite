import {
  addFriendHandler,
  getFriendsHandler,
  removeFriendHandler,
} from "@/lib/http/friends-handlers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return getFriendsHandler(request);
}

export async function POST(request: Request) {
  return addFriendHandler(request);
}

export async function DELETE(request: Request) {
  return removeFriendHandler(request);
}
