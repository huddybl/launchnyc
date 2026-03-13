import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
  const invitedEmail = typeof body.invited_email === "string" ? body.invited_email.trim().toLowerCase() : "";
  const groupId = body.group_id;
  const groupName = typeof body.group_name === "string" ? body.group_name.trim() : "a group";
  const inviterEmail = typeof body.inviter_email === "string" ? body.inviter_email.trim() : (user.email ?? "");

  if (!invitedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitedEmail)) {
    return NextResponse.json({ error: "Valid invited_email is required" }, { status: 400 });
  }
  if (!groupId) {
    return NextResponse.json({ error: "group_id is required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
  }

  const { data: invite, error: insertError } = await supabase
    .from("group_invites")
    .insert({
      group_id: groupId,
      invited_email: invitedEmail,
      invited_by: user.id,
      inviter_email: inviterEmail || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const joinUrl = `https://launchnyc.vercel.app/join/${invite.id}`;
  const subject = `${inviterEmail} invited you to search for apartments together on LaunchNYC`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; font-family: system-ui, -apple-system, sans-serif; background: #f5f6f7; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,31,63,0.08);">
    <div style="background: #001f3f; padding: 24px; text-align: center;">
      <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">LaunchNYC</span>
    </div>
    <div style="padding: 28px 24px;">
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #0f1826;">
        <strong>${escapeHtml(inviterEmail)}</strong> invited you to search for apartments together.
      </p>
      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #6b7280;">
        Join the group <strong>${escapeHtml(groupName)}</strong> on LaunchNYC to share saved listings and track your search as a team.
      </p>
      <p style="margin: 0 0 24px; text-align: center;">
        <a href="${joinUrl}" style="display: inline-block; background: #001f3f; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 28px; border-radius: 8px;">Join Now</a>
      </p>
      <p style="margin: 0; font-size: 13px; color: #9ca3af;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${joinUrl}" style="color: #001f3f; word-break: break-all;">${joinUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>
`.trim();

  if (process.env.RESEND_API_KEY) {
    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "LaunchNYC <onboarding@resend.dev>",
      to: invitedEmail,
      subject,
      html,
    });
    if (emailError) {
      console.warn("[invite] Resend error:", emailError);
    }
  }

  return NextResponse.json({ id: invite.id });
}

function escapeHtml(s) {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
