"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function AgeGateWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-serif text-gray-900 mb-2">
          Age Restricted Content
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          This poetry contains content rated for readers aged 18 and above.
          Please confirm that you are at least 18 years old to continue.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setConfirmed(true)}
            className="w-full px-5 py-3 rounded-xl bg-bcs-green text-white font-medium text-sm hover:bg-bcs-green/90 transition"
          >
            I am 18 or older — Continue
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
