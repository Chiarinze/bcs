import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import Image from "next/image";
import { User, Calendar, Tag } from "lucide-react";
import type { ArticleWithAuthor } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data: article } = await supabase
    .from("articles")
    .select("title, excerpt, cover_image_url, published_at, author:profiles!author_id(first_name, last_name)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!article) return { title: "Article Not Found" };

  const title = article.title;
  const description =
    article.excerpt || "An article from The Benin Chorale & Philharmonic.";
  const imageUrl = article.cover_image_url || "/icon.jpeg";
  const author = article.author as { first_name: string; last_name: string } | null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.beninchoraleandphilharmonic.com/articles/${slug}`,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      publishedTime: article.published_at || undefined,
      authors: author ? [`${author.first_name} ${author.last_name}`] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("articles")
    .select("*, author:profiles!author_id(first_name, last_name, photo_url)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!data) notFound();

  const article = data as ArticleWithAuthor;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt || "",
    image: article.cover_image_url || undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: {
      "@type": "Person",
      name: `${article.author?.first_name} ${article.author?.last_name}`,
    },
    publisher: {
      "@type": "Organization",
      name: "The Benin Chorale & Philharmonic",
      logo: {
        "@type": "ImageObject",
        url: "https://www.beninchoraleandphilharmonic.com/icon.jpeg",
      },
    },
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4">
          {/* Category Badge */}
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-bcs-green/10 text-bcs-green">
              <Tag className="w-3 h-3" />
              {article.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif text-gray-900 leading-tight mb-6">
            {article.title}
          </h1>

          {/* Author & Date */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
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
                  {article.author?.first_name} {article.author?.last_name}
                </p>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {article.published_at
                    ? new Date(article.published_at).toLocaleDateString(
                        "en-NG",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )
                    : ""}
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
            className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-gray-900 prose-a:text-bcs-accent prose-img:rounded-xl prose-blockquote:border-bcs-green/30 prose-blockquote:text-gray-600"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </article>
    </>
  );
}
