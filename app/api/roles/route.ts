import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";
import { revalidatePath } from "next/cache";

// GET: list all roles with assignee info
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("member_roles")
    .select("*, assignee:profiles!assigned_to(id, first_name, last_name, photo_url, choir_part, bio, slug)")
    .order("category")
    .order("sort_order")
    .order("title");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST: create a new custom role
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json();
  const { title, category, choir_part_required, sort_order } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Role title is required" }, { status: 400 });
  }

  if (category !== "executive" && category !== "management") {
    return NextResponse.json({ error: "Category must be 'executive' or 'management'" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("member_roles")
    .insert({
      title: title.trim(),
      category,
      choir_part_required: choir_part_required || null,
      sort_order: Number.isInteger(sort_order) ? sort_order : 0,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A role with this title already exists in this category" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PUT: assign or unassign a member to a role
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json();
  const { role_id, member_id } = body;

  if (!role_id) {
    return NextResponse.json({ error: "role_id is required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Fetch the role
  const { data: role } = await supabase
    .from("member_roles")
    .select("*")
    .eq("id", role_id)
    .single();

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  // Unassign
  if (!member_id) {
    const { error } = await supabase
      .from("member_roles")
      .update({ assigned_to: null })
      .eq("id", role_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/about");
    return NextResponse.json({ success: true, action: "unassigned" });
  }

  // Validate the member
  const { data: member } = await supabase
    .from("profiles")
    .select("id, profile_completed, choir_part")
    .eq("id", member_id)
    .eq("role", "member")
    .single();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!member.profile_completed) {
    return NextResponse.json({ error: "Only members who have completed their profile can be assigned a role" }, { status: 400 });
  }

  // Check choir part requirement
  if (role.choir_part_required && member.choir_part !== role.choir_part_required) {
    return NextResponse.json(
      { error: `This role requires a ${role.choir_part_required} member` },
      { status: 400 }
    );
  }

  // Check member doesn't already hold 2 roles
  const { count } = await supabase
    .from("member_roles")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", member_id)
    .neq("id", role_id);

  if ((count || 0) >= 2) {
    return NextResponse.json(
      { error: "This member already holds 2 roles. Unassign one first." },
      { status: 400 }
    );
  }

  // Assign
  const { error } = await supabase
    .from("member_roles")
    .update({ assigned_to: member_id })
    .eq("id", role_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/about");
  return NextResponse.json({ success: true, action: "assigned" });
}

// PATCH: set the display order of roles on the public About page
// Body: { order: [{ id, sort_order }, ...] }
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const order = Array.isArray(body.order) ? body.order : [];

  const valid = order.every(
    (o: { id?: unknown; sort_order?: unknown }) =>
      typeof o.id === "string" && Number.isInteger(o.sort_order)
  );
  if (!valid || order.length === 0) {
    return NextResponse.json({ error: "order must be a list of { id, sort_order }" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  for (const { id, sort_order } of order as { id: string; sort_order: number }[]) {
    const { error } = await supabase
      .from("member_roles")
      .update({ sort_order })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  revalidatePath("/about");
  return NextResponse.json({ success: true });
}

// DELETE: delete a custom role
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const roleId = searchParams.get("id");

  if (!roleId) {
    return NextResponse.json({ error: "Role ID required" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { error } = await supabase
    .from("member_roles")
    .delete()
    .eq("id", roleId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
