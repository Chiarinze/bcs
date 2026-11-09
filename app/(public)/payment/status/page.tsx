import type { Metadata } from "next";
import { Suspense } from "react";
import PaymentStatusClient from "./PaymentStatusClient";

export const metadata: Metadata = {
  title: "Payment status",
  robots: { index: false, follow: false },
};

export default function PaymentStatusPage() {
  return (
    <section className="py-20 bg-[#F9F9F7] min-h-screen px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-10 text-center">
        <Suspense>
          <PaymentStatusClient />
        </Suspense>
      </div>
    </section>
  );
}
