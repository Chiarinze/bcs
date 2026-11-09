import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin-login",
        "/dashboard",
        "/member-login",
        "/signup",
        "/profile-setup",
        "/account-closed",
        "/api/",
        "/events/*/purchase",
        "/events/*/register",
        "/events/*/success",
        "/donate/success",
        "/payment/",
      ],
    },
    sitemap: "https://www.beninchoraleandphilharmonic.com/sitemap.xml",
  };
}
