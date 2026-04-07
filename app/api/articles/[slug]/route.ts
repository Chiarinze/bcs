import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/requireAuth";
import { requireAdmin } from "@/lib/requireAdmin";
import sanitizeHtml from "sanitize-html";
import { revalidatePath } from "next/cache";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("articles")
    .select("*, author:profiles!author_id(first_name, last_name, photo_url)")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // If not published, only author or admin can view
  if (data.status !== "published") {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const adminCheck = await requireAdmin();
    const isAdmin = !(adminCheck instanceof NextResponse);

    if (!isAdmin && data.author_id !== auth.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();

  // Fetch article to check ownership
  const { data: existing } = await supabase
    .from("articles")
    .select("author_id, status")
    .eq("slug", slug)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const adminCheck = await requireAdmin();
  const isAdmin = !(adminCheck instanceof NextResponse);

  // Everyone can only edit their own articles
  if (existing.author_id !== auth.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Non-admin can only directly edit drafts and rejected articles
  // Published articles go through the pending_edit flow
  if (!isAdmin && existing.status !== "draft" && existing.status !== "rejected" && existing.status !== "published") {
    return NextResponse.json(
      { error: "You cannot edit this article in its current state." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { title, excerpt, category, content, cover_image_url, cover_image_blur_data, status } = body;

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

  // If a non-admin is editing a published article, store as pending_edit
  if (!isAdmin && existing.status === "published") {
    const pendingEdit = {
      title: title?.trim(),
      excerpt: excerpt || null,
      category: category || "News",
      content: sanitizedContent,
      cover_image_url: cover_image_url || null,
      cover_image_blur_data: cover_image_blur_data || null,
      submitted_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("articles")
      .update({
        pending_edit: pendingEdit,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ slug, pending_edit: true });
  }

  // Direct edit (drafts, rejected, or admin editing)
  const updateData: Record<string, unknown> = {
    title: title?.trim(),
    excerpt: excerpt || null,
    category: category || "News",
    content: sanitizedContent,
    cover_image_url: cover_image_url || null,
    cover_image_blur_data: cover_image_blur_data || null,
    updated_at: new Date().toISOString(),
  };

  // Admin can set status directly
  if (isAdmin && status) {
    updateData.status = status;
    if (status === "published" && existing.status !== "published") {
      updateData.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("articles")
    .update(updateData)
    .eq("slug", slug)
    .select("slug")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/articles");
  revalidatePath(`/articles/${slug}`);

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { slug } = await params;

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const supabase = createServerSupabase();

  const { data: article } = await supabase
    .from("articles")
    .select("id, author_id, status, content, cover_image_url")
    .eq("slug", slug)
    .single();

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const adminCheck = await requireAdmin();
  const isAdmin = !(adminCheck instanceof NextResponse);

  if (!isAdmin) {
    if (article.author_id !== auth.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (article.status === "published") {
      return NextResponse.json(
        { error: "Cannot delete a published article. Contact admin." },
        { status: 403 }
      );
    }
  }

  // Clean up cover image from storage
  if (article.cover_image_url) {
    const urlParts = article.cover_image_url.split("/article-images/");
    if (urlParts[1]) {
      await supabase.storage
        .from("article-images")
        .remove([decodeURIComponent(urlParts[1])]);
    }
  }

  // Clean up inline images from content
  const imgRegex = /src="([^"]*article-images[^"]*)"/g;
  let match;
  const imagePaths: string[] = [];
  while ((match = imgRegex.exec(article.content || "")) !== null) {
    const parts = match[1].split("/article-images/");
    if (parts[1]) imagePaths.push(decodeURIComponent(parts[1]));
  }
  if (imagePaths.length > 0) {
    await supabase.storage.from("article-images").remove(imagePaths);
  }

  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", article.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/articles");

  return NextResponse.json({ success: true });
}
