"use client";

import { useRouter } from "next/navigation";

export const BackButton = () => {
  const router = useRouter();

  return (
    <div className="py-6 px-4 max-w-4xl mx-auto">
      <button
        onClick={() => router.back()}
        className="btn-outline px-6 py-2 rounded-full cursor-pointer"
      >
        &larr; Back
      </button>
    </div>
  );
};
