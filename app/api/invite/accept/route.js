import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getSupabaseAndUser(request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { supabase: null, user: null };
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  return { supabase, user };
}

export async function POST(request) {
  const { supabase, user } = await getSupabaseAndUser(request);
  if (!supabase || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const inviteId = typeof body.invite_id === "string" ? body.invite_id.trim() : "";
  if (!inviteId) {
    return NextResponse.json({ error: "invite_id is required" }, { status: 400 });
  }

  const { data: invite, error: inviteError } = await supabase
    .from("group_invites")
    .select("id, group_id, invited_email, status")
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Invite already used" }, { status: 400 });
  }

  const userEmail = (user.email ?? "").trim().toLowerCase();
  const invitedEmail = (invite.invited_email ?? "").trim().toLowerCase();
  if (userEmail !== invitedEmail) {
    return NextResponse.json({ error: "This invite was sent to a different email" }, { status: 403 });
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: invite.group_id, user_id: user.id });
  if (memberError) {
    if (memberError.code === "23505") {
      await supabase.from("group_invites").update({ status: "accepted" }).eq("id", invite.id);
      return NextResponse.json({ group_id: invite.group_id });
    }
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("group_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ group_id: invite.group_id });
}
