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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const { data: existingMembership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingMembership) {
    return NextResponse.json(
      { error: "You're already part of a group. Leave your current group to create a new one." },
      { status: 400 }
    );
  }

  const { data: group, error: insertGroupError } = await supabase
    .from("search_groups")
    .insert({ name: name || null, created_by: user.id })
    .select()
    .single();
  if (insertGroupError) {
    return NextResponse.json({ error: insertGroupError.message }, { status: 500 });
  }

  const { error: insertMemberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });
  if (insertMemberError) {
    return NextResponse.json({ error: insertMemberError.message }, { status: 500 });
  }

  return NextResponse.json({
    id: group.id,
    name: group.name,
    invite_code: group.invite_code,
    created_at: group.created_at,
  });
}
