import { NextRequest, NextResponse } from "next/server";
import { scanForGrants } from "@/lib/grants/scanner";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { newCount, errors } = await scanForGrants();

    // Grant notification emails are sent automatically by Supabase pg_net trigger
    // when new rows are inserted into grant_opportunities

    return NextResponse.json({
      success: true,
      newOpportunities: newCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Grant scan failed:", error);
    return NextResponse.json(
      { error: "Scan failed", message: (error as Error).message },
      { status: 500 }
    );
  }
}
