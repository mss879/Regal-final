import type { NextRequest } from "next/server";
import { adminClient, adminJson, signedOut } from "@/lib/admin/api";
import { loadChatThread } from "@/lib/admin/threads";

// GET /admin/api/chats/<sessionId>?after=<messageId> — the live chat console's reads.
export async function GET(request: NextRequest, ctx: RouteContext<"/admin/api/chats/[id]">) {
  const supabase = await adminClient();
  if (!supabase) return signedOut();
  const { id } = await ctx.params;
  const after = Number(request.nextUrl.searchParams.get("after") ?? 0);
  return adminJson(await loadChatThread(supabase, id, after));
}
