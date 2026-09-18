import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "@/lib/requireAdmin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_ROWS = 5000;

/**
 * Tiny CSV parser: handles quoted fields and commas inside quotes.
 * Good enough for exports from Excel / Google Sheets.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim()));
}

// POST: multipart { file } (CSV). Columns are detected by header name
// (email / name / first name + last name) or, without a header, by
// finding the column that looks like an email.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 });

  const text = (await file.text()).replace(/^﻿/, "");
  const rows = parseCsv(text);
  if (rows.length === 0) return NextResponse.json({ error: "The file is empty" }, { status: 400 });

  // Header detection
  const header = rows[0].map((h) => h.trim().toLowerCase());
  let emailIdx = header.findIndex((h) => h.includes("email") || h.includes("e-mail"));
  let nameIdx = header.findIndex((h) => h === "name" || h === "full name" || h === "fullname");
  const firstIdx = header.findIndex((h) => h.includes("first"));
  const lastIdx = header.findIndex((h) => h.includes("last") || h.includes("surname"));
  let dataRows = rows.slice(1);

  if (emailIdx === -1) {
    // No header: find the email-looking column in the first row.
    emailIdx = rows[0].findIndex((f) => EMAIL_RE.test(f.trim()));
    if (emailIdx === -1) return NextResponse.json({ error: "Could not find an email column" }, { status: 400 });
    nameIdx = rows[0].findIndex((f, i) => i !== emailIdx && f.trim() && !EMAIL_RE.test(f.trim()));
    dataRows = rows;
  }

  if (dataRows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 });
  }

  const supabase = createServerSupabase();
  let added = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (const r of dataRows) {
    const email = (r[emailIdx] || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || seen.has(email)) {
      skipped++;
      continue;
    }
    seen.add(email);

    let name = nameIdx >= 0 ? (r[nameIdx] || "").trim() : "";
    if (!name && (firstIdx >= 0 || lastIdx >= 0)) {
      name = [r[firstIdx] || "", r[lastIdx] || ""].map((s) => s.trim()).filter(Boolean).join(" ");
    }

    const { data: id } = await supabase.rpc("upsert_subscriber", {
      p_email: email,
      p_name: name.slice(0, 120) || null,
      p_source: "import",
    });
    if (id) added++;
    else skipped++;
  }

  return NextResponse.json({ success: true, processed: dataRows.length, added, skipped });
}
