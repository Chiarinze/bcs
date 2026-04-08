"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteDraftButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this draft? This cannot be undone.")) return;

    setDeleting(true);
    const res = await fetch(`/api/articles/${slug}`, { method: "DELETE" });

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete");
    }
    setDeleting(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-500 border border-red-300 rounded-full hover:bg-red-500 hover:text-white transition disabled:opacity-50"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
