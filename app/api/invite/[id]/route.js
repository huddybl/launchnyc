import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export async function GET(_request, { params }) {
  const id = params?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid invite id" }, { status: 400 });
  }
  const { data: invite, error } = await supabaseAdmin
    .from("group_invites")
    .select("*, search_groups(name)")
    .eq("id", id.trim())
    .eq("status", "pending")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }
  const groupName = invite.search_groups?.name ?? "a group";
  return NextResponse.json({
    group_id: invite.group_id,
    group_name: groupName,
  });
}
