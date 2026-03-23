import AdminLayout from "@/components/layouts/AdminLayout";
import { Heart, User } from "lucide-react";
import { createServerSupabase } from "@/lib/supabaseServer";
import type { Donation } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminDonationsPage() {
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("donations")
    .select("*")
    .order("created_at", { ascending: false });

  const donations: Donation[] = data || [];
  const totalAmount = donations.reduce(
    (sum: number, d: { amount?: number }) => sum + (d.amount || 0),
    0
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif text-bcs-green flex items-center gap-2">
              <Heart className="w-6 h-6" /> Donations
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              All donations received through the website
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-500">Total Donations</p>
            <p className="text-3xl font-bold text-bcs-green mt-1">
              {donations.length}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-3xl font-bold text-bcs-green mt-1">
              ₦{totalAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Donations List */}
        {donations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-500">
            <Heart className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No donations yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="px-6 py-3 font-medium">Donor</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Message</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => {
                    const isAnonymous =
                      d.donor_name === "Anonymous" ||
                      d.donor_email === "anonymous@beninchoraleandphilharmonic.com";
                    return (
                      <tr
                        key={d.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-bcs-green/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-bcs-green" />
                            </div>
                            <span className={isAnonymous ? "text-gray-400 italic" : "font-medium text-gray-900"}>
                              {d.donor_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {isAnonymous ? (
                            <span className="text-gray-400 italic">—</span>
                          ) : (
                            d.donor_email
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-bcs-green">
                          ₦{d.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate">
                          {d.message || (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {new Date(d.created_at).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-500">
                            {d.payment_reference}
                          </code>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {donations.map((d) => {
                const isAnonymous =
                  d.donor_name === "Anonymous" ||
                  d.donor_email === "anonymous@beninchoraleandphilharmonic.com";
                return (
                  <div key={d.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-bcs-green/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-bcs-green" />
                        </div>
                        <span className={isAnonymous ? "text-gray-400 italic text-sm" : "font-medium text-gray-900 text-sm"}>
                          {d.donor_name}
                        </span>
                      </div>
                      <span className="font-semibold text-bcs-green">
                        ₦{d.amount.toLocaleString()}
                      </span>
                    </div>
                    {d.message && (
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        &ldquo;{d.message}&rdquo;
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>
                        {new Date(d.created_at).toLocaleDateString("en-NG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                        {d.payment_reference}
                      </code>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
