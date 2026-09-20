/**
 * Trims the quoted history and signature from a reply so only the new
 * text is stored. Heuristic, tuned for Gmail/Outlook/Apple Mail quoting.
 */
export function extractReplyText(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // "On <date>, <name> wrote:" — may wrap onto two lines.
    if (/^On .{5,200}wrote:$/.test(trimmed) || (/^On .{5,120}$/.test(trimmed) && /wrote:$/.test((lines[i + 1] || "").trim()))) break;
    // Outlook / generic separators
    if (/^-{2,}\s*Original Message\s*-{2,}$/i.test(trimmed)) break;
    if (/^From:\s.+/.test(trimmed) && /^(Sent|Date):\s/.test((lines[i + 1] || "").trim())) break;
    if (/^_{10,}$/.test(trimmed)) break;
    // Quoted lines
    if (trimmed.startsWith(">")) break;
    // Signature marker
    if (trimmed === "--" || trimmed === "-- ") break;

    out.push(line);
  }

  return out.join("\n").trim();
}
