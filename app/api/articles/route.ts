import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";
import { slugify } from "@/lib/slugify";
import sanitizeHtml from "sanitize-html";

export async function GET(req: NextRequest) {
  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  let query = supabase
    .from("articles")
    .select("*, author:profiles!author_id(first_name, last_name, photo_url)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { title, excerpt, category, content, content_type, is_rated_18, pen_name, cover_image_url, cover_image_blur_data, status } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const slug = slugify(title);

  const sanitizedContent = sanitizeHtml(content || "", {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img", "h1", "h2", "h3", "figure", "figcaption",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "class", "width", "height"],
      a: ["href", "target", "rel", "class"],
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^left$/, /^right$/, /^center$/],
      },
    },
  });

  // Only allow draft or published (admin) on creation
  const finalStatus = status === "published" ? "published" : "draft";

  const supabase = createServerSupabase();

  const insertData: Record<string, unknown> = {
    title: title.trim(),
    slug,
    excerpt: excerpt || null,
    category: category || "Entertainment",
    content_type: content_type || "article",
    is_rated_18: content_type === "poetry" ? !!is_rated_18 : false,
    pen_name: content_type === "poetry" ? (pen_name?.trim() || null) : null,
    content: sanitizedContent,
    cover_image_url: cover_image_url || null,
    cover_image_blur_data: cover_image_blur_data || null,
    status: finalStatus,
    author_id: auth.id,
  };

  if (finalStatus === "published") {
    insertData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("articles")
    .insert(insertData)
    .select("slug")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
