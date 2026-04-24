import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import Image from "next/image";
import Link from "next/link";
import { User, Calendar, Tag, Eye, ArrowLeft, Clock, AlertCircle, Edit } from "lucide-react";
import type { ArticleWithAuthor } from "@/types";
import ArticleEngagement from "@/components/articles/ArticleEngagement";
import AgeGateWrapper from "@/components/articles/AgeGateWrapper";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function DashboardArticleReadPage({ params }: Props) {
  const { slug } = await params;
  const authedSupabase = await createClient();
  const {
    data: { user },
  } = await authedSupabase.auth.getUser();

  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("articles")
    .select(
      "*, author:profiles!author_id(first_name, last_name, photo_url)"
    )
    .eq("slug", slug)
    .single();

  if (!data) notFound();

  const article = data as ArticleWithAuthor;
  const isAuthor = !!user && user.id === article.author_id;
  const isPublished = article.status === "published";

  // Only published articles are public; non-published ones are visible only to the author
  if (!isPublished && !isAuthor) notFound();

  const articleUrl = `https://www.beninchoraleandphilharmonic.com/articles/${slug}`;
  const typeLabel =
    article.content_type === "poetry" ? "Poetry" : article.category;
  const backHref =
    article.content_type === "poetry"
      ? "/dashboard/articles?view=poetry"
      : isAuthor && !isPublished
      ? "/dashboard/articles"
      : "/dashboard/articles?view=articles";

  const statusBanner = !isPublished
    ? article.status === "pending_review"
      ? {
          bg: "bg-yellow-50 border-yellow-200",
          icon: <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />,
          title: "Pending review",
          body:
            "This is a preview of your submission. It will become visible to others once an admin approves it.",
        }
      : article.status === "rejected"
      ? {
          bg: "bg-red-50 border-red-200",
          icon: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
          title: "Rejected — needs revision",
          body:
            article.rejection_note ||
            "An admin rejected this submission. Edit and resubmit.",
        }
      : {
          bg: "bg-gray-50 border-gray-200",
          icon: <Edit className="w-5 h-5 text-gray-500 flex-shrink-0" />,
          title: "Draft preview",
          body: "This is a preview of your draft. It's only visible to you.",
        }
    : null;

  const articleContent = (
    <article className="max-w-3xl mx-auto">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-bcs-green mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {isAuthor && !isPublished ? "My Articles" : article.content_type === "poetry" ? "Poetry" : "Articles"}
      </Link>

      {/* Status banner (author preview only) */}
      {statusBanner && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border mb-6 ${statusBanner.bg}`}
        >
          {statusBanner.icon}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {statusBanner.title}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">{statusBanner.body}</p>
            {article.status !== "pending_review" && (
              <Link
                href={`/dashboard/articles/${article.slug}/edit`}
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-bcs-accent hover:underline"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit this {article.content_type === "poetry" ? "poem" : "article"}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Category / Type Badge */}
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-bcs-green/10 text-bcs-green">
          <Tag className="w-3 h-3" />
          {typeLabel}
        </span>
        {article.is_rated_18 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
            18+
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif text-gray-900 leading-tight mb-6">
        {article.title}
      </h1>

      {/* Author & Date & Views */}
      <div className="flex flex-wrap items-center gap-4 mb-8 pb-8 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {article.author?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.author.photo_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover border-2 border-bcs-green/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-bcs-green/10 flex items-center justify-center">
              <User className="w-5 h-5 text-bcs-green" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 text-sm">
              {article.pen_name ||
                `${article.author?.first_name} ${article.author?.last_name}`}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {article.published_at
                  ? new Date(article.published_at).toLocaleDateString(
                      "en-NG",
                      { year: "numeric", month: "long", day: "numeric" }
                    )
                  : ""}
              </span>
              {article.view_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {article.view_count}{" "}
                  {article.view_count === 1 ? "view" : "views"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cover Image */}
      {article.cover_image_url && (
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-10">
          <Image
            src={article.cover_image_url}
            alt={article.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            {...(article.cover_image_blur_data
              ? {
                  placeholder: "blur",
                  blurDataURL: article.cover_image_blur_data,
                }
              : {})}
          />
        </div>
      )}

      {/* Article Content */}
      <div
        className="prose prose-lg max-w-none prose-p:my-1 prose-headings:font-serif prose-headings:text-gray-900 prose-a:text-bcs-accent prose-img:rounded-xl prose-blockquote:border-bcs-green/30 prose-blockquote:text-gray-600"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {/* Engagement — only for published articles */}
      {isPublished && (
        <ArticleEngagement
          slug={slug}
          articleTitle={article.title}
          articleUrl={articleUrl}
          authorId={article.author_id}
        />
      )}
    </article>
  );

  if (article.is_rated_18) {
    return <AgeGateWrapper>{articleContent}</AgeGateWrapper>;
  }

  return articleContent;
}
