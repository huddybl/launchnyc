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
  const inviteCode = typeof body.invite_code === "string" ? body.invite_code.trim() : "";
  if (!inviteCode) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const { data: group, error: groupError } = await supabase
    .from("search_groups")
    .select("id")
    .eq("invite_code", inviteCode)
    .maybeSingle();
  if (groupError || !group) {
    return NextResponse.json(
      { error: group ? groupError?.message : "Invalid invite code" },
      { status: 400 }
    );
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });
  if (memberError) {
    if (memberError.code === "23505") {
      return NextResponse.json({ group_id: group.id });
    }
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ group_id: group.id });
}

