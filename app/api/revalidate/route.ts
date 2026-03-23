import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { path } = await req.json();

    if (path) {
      revalidatePath(path);
      revalidatePath("/events/[slug]", "page");

      return NextResponse.json({ revalidated: true, now: Date.now() });
    }

    return NextResponse.json({ message: "Path is required" }, { status: 400 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return NextResponse.json({ message: "Error revalidating" }, { status: 500 });
  }
}
