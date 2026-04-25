import Link from "next/link";
import { AlertCircle } from "lucide-react";

export const metadata = {
  title: "Account Closed",
};

export default function AccountClosedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>

        <h1 className="text-2xl font-serif text-bcs-green mb-3">
          Your account has been closed
        </h1>

        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Your BCS account has been closed because your Industrial Training
          period has ended.
        </p>

        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          If your IT has{" "}
          <span className="font-medium text-gray-900">not actually ended</span>{" "}
          and this was done in error, please contact the site admin for
          rectification.
        </p>

        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          If your IT has ended and you wish to remain a member of The Benin
          Chorale &amp; Philharmonic, you can register again as a Probationary
          Member.
        </p>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-xs text-red-800">
            Your account will be permanently deleted within 30 days of closure.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-bcs-green text-white text-sm font-medium hover:bg-bcs-green/90 transition"
          >
            Register as a Probationary Member
          </Link>
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-bcs-green transition"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
