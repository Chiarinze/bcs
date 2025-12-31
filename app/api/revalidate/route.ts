import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const { path, adminKey } = await req.json();

  // Basic security check using your env variable
  if (adminKey !== process.env.NEXT_PUBLIC_ADMIN_PASS) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  try {
    if (path) {
      // Purge the cache for the specific path (e.g., "/events")
      revalidatePath(path);
      // Also revalidate the dynamic event page to be safe
      revalidatePath("/events/[slug]", "page");
      
      return NextResponse.json({ revalidated: true, now: Date.now() });
    }

    return NextResponse.json({ message: "Path is required" }, { status: 400 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return NextResponse.json({ message: "Error revalidating" }, { status: 500 });
  }
}