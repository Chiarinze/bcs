/**
 * One-off: uploads the historical performance images to the
 * `performance-images` bucket and inserts the matching rows.
 *
 * Prerequisites: run db/site_content.sql first (creates the table + bucket).
 * Usage:        node scripts/seed-performances.mjs
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Safe to re-run: skips any title that already exists.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const env = Object.fromEntries(
  readFileSync(resolve(".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "performance-images";

const rows = [
  { title: "10th Anniversary Concert", performed_on: "2022-09-04", location: "Benin City", file: "anniversary.jpg" },
  { title: "Easter Virtual Concert", performed_on: "2023-04-17", location: "Online", file: "evc.webp" },
  { title: "Moment of Worship", performed_on: "2023-07-30", location: "Benin City", file: "mow.jpg", link: "https://www.facebook.com/share/v/17X9VNSGyG/?mibextid=wwXIfr" },
  { title: "Handel's Messiah Concert", performed_on: "2024-04-28", location: "St. Peters the Apostles Hall, Benin City", file: "hmc.jpg", link: "https://www.facebook.com/share/v/15c63Eiz3p/?mibextid=wwXIfr" },
  { title: "Christmas with Brojays and Friends", performed_on: "2024-12-01", location: "Victor Uwaifo Creative Hub, Benin City", file: "cbf.webp", link: "https://www.facebook.com/share/v/15ksCVNnPN/?mibextid=wwXIfr" },
  { title: "Birthday Thanksgiving of Sir. Allan Omorogbe", performed_on: "2024-12-01", location: "GRA, Benin City", file: "birthday.webp", link: "https://www.facebook.com/share/v/1E9FyyVZUL/?mibextid=wwXIfr" },
  { title: "Festival of Worship 2025", performed_on: "2025-04-27", location: "St. Peters the Apostles Hall, Benin City", file: "fow25.jpg", link: "https://www.facebook.com/share/v/1HPWkpPXyL/" },
  { title: "Funeral Service of Late Pa Henry Omorogieva Akpata", performed_on: "2025-05-15", location: "Uyi Grand Marquee, Benin City", file: "funeral-service.jpg", link: "https://www.facebook.com/share/v/19pbrP2kem/" },
  { title: "Unrestrained 2025", performed_on: "2025-06-08", location: "The Historic Miracle Centre, Benin City", file: "unstopable.jpg" },
  { title: "Moment of Worship 2025", performed_on: "2025-07-20", location: "Rickrex Event City, Benin City", file: "mow25.jpg", link: "https://www.facebook.com/share/v/17Vs8FiFAx/" },
];

async function blurDataUrl(buffer) {
  // Same idea as lib/blurPlaceholder.ts: a 1x1 average-colour placeholder.
  const { data } = await sharp(buffer).resize(1, 1).raw().toBuffer({ resolveWithObject: true });
  const png = await sharp(Buffer.from(data), { raw: { width: 1, height: 1, channels: data.length } })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

const { data: existing } = await supabase.from("performances").select("title");
const have = new Set((existing || []).map((r) => r.title));

for (const row of rows) {
  if (have.has(row.title)) {
    console.log(`skip   ${row.title}`);
    continue;
  }

  const buffer = readFileSync(resolve("assets/images", row.file));
  const ext = row.file.split(".").pop();
  const contentType = ext === "webp" ? "image/webp" : "image/jpeg";
  const path = `seed-${row.file}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (upErr) throw new Error(`upload ${row.file}: ${upErr.message}`);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { error: insErr } = await supabase.from("performances").insert({
    title: row.title,
    performed_on: row.performed_on,
    location: row.location,
    link: row.link ?? null,
    image_url: pub.publicUrl,
    image_blur_data: await blurDataUrl(buffer),
  });
  if (insErr) throw new Error(`insert ${row.title}: ${insErr.message}`);

  console.log(`added  ${row.title}`);
}

console.log("done");
