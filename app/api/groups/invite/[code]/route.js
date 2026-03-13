import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(_request, { params }) {
  const code = params?.code;
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
  const { data: group, error } = await supabase
    .from("search_groups")
    .select("name")
    .eq("invite_code", code.trim())
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!group) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }
  return NextResponse.json({ name: group.name ?? "a group" });
}
