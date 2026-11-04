import type { NextRequest } from "next/server";
import { adminClient, adminJson, signedOut } from "@/lib/admin/api";
import { loadWhatsAppThread } from "@/lib/admin/threads";

// GET /admin/api/whatsapp/<conversationId> — the live WhatsApp console's reads (marks it read).
export async function GET(_request: NextRequest, ctx: RouteContext<"/admin/api/whatsapp/[id]">) {
  const supabase = await adminClient();
  if (!supabase) return signedOut();
  const { id } = await ctx.params;
  return adminJson(await loadWhatsAppThread(supabase, id));
}
