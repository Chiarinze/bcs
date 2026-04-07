import Link from "next/link";
import Image from "next/image";
import { User, Eye } from "lucide-react";
import type { ArticleWithAuthor } from "@/types";

export default function ArticleCard({
  article,
}: {
  article: ArticleWithAuthor;
}) {
  return (
    <Link href={`/articles/${article.slug}`} className="group block h-full">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover-lift h-full flex flex-col">
        {/* Cover Image — fixed aspect ratio */}
        <div className="aspect-[16/9] relative bg-gray-100 flex-shrink-0">
          {article.cover_image_url ? (
            <Image
              src={article.cover_image_url}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              {...(article.cover_image_blur_data
                ? { placeholder: "blur", blurDataURL: article.cover_image_blur_data }
                : {})}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-bcs-green/10 to-bcs-accent/10">
              <span className="text-4xl font-serif text-bcs-green/30">BCS</span>
            </div>
          )}
        </div>

        {/* Content — flex-grow to fill remaining space */}
        <div className="p-5 flex flex-col flex-1">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-bcs-green/10 text-bcs-green mb-3 self-start">
            {article.category}
          </span>

          <h3 className="text-lg font-serif text-gray-900 group-hover:text-bcs-green transition-colors line-clamp-2 mb-2">
            {article.title}
          </h3>

          <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
            {article.excerpt || ""}
          </p>

          {/* Footer — always pinned to bottom */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50 mt-auto">
            <div className="flex items-center gap-1.5">
              {article.author?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.author.photo_url}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span>
                {article.author?.first_name} {article.author?.last_name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {article.view_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {article.view_count}
                </span>
              )}
              <span>
                {article.published_at
                  ? new Date(article.published_at).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
