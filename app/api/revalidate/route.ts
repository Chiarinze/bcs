import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const { path, adminKey } = await req.json();

    if (adminKey !== process.env.NEXT_PUBLIC_ADMIN_PASS) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!path) throw new Error("Path is required");

    revalidatePath(path);
    return NextResponse.json({ revalidated: true, path });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { message: "Revalidation failed", error: (error as Error).message },
      { status: 500 }
    );
  }
}
