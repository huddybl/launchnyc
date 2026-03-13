import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(_request, { params }) {
  const id = params?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid invite id" }, { status: 400 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
  const { data: invite, error } = await supabase
    .from("group_invites")
    .select("id, group_id, status")
    .eq("id", id.trim())
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!invite || invite.status !== "pending") {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }
  const { data: group } = await supabase
    .from("search_groups")
    .select("name")
    .eq("id", invite.group_id)
    .single();
  return NextResponse.json({
    group_id: invite.group_id,
    group_name: group?.name ?? "a group",
  });
}
