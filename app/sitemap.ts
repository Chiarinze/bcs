import { MetadataRoute } from "next";
import { BoardOfDirectors } from "@/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.beninchoraleandphilharmonic.com";

  // Static routes
  const routes = [
    "",
    "/about",
    "/board",
    "/contact",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: path === "" ? 1.0 : 0.8,
  }));

  // Dynamic board member routes
  const boardMemberRoutes = BoardOfDirectors.map((member) => ({
    url: `${baseUrl}/board/${member.slug}`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.7,
  }));

  return [...routes, ...boardMemberRoutes] as MetadataRoute.Sitemap;
}
