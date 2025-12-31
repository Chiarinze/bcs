"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Image from "next/image";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any;
  categories: { id: string; name: string; price: number }[];
}

export default function AttendeesSection({ event, categories }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const limit = 10;
  const isInternal = event.is_internal;

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const url = isInternal 
        ? `/api/internal-registrations?event_id=${event.id}&search=${encodeURIComponent(search)}`
        : `/api/tickets/attendees?event_id=${event.id}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(filterCategory)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        if (isInternal) {
          setAttendees(data);
          setTotalPages(1);
        } else {
          setAttendees(data.attendees);
          setTotalPages(data.totalPages);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [event.id, isInternal, page, search, filterCategory]);

  // Combined Debounced Effect
  useEffect(() => {
    setIsTyping(true);
    const timeout = setTimeout(() => {
      setIsTyping(false);
      fetchAttendees();
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, filterCategory, page, fetchAttendees]);

  async function handleDownload(type: 'pdf' | 'csv') {
    const endpoint = type === 'pdf' ? 'download' : 'export-csv';
    const params = new URLSearchParams({ event_id: event.id, search });
    if (!isInternal) params.append("category", filterCategory);

    try {
      const res = await fetch(`/api/tickets/${endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.title}-attendees.${type}`;
      a.click();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      alert("Failed to download.");
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h2 className="text-xl font-serif text-bcs-green">
          {isInternal ? "Registered Members" : "Attendees"}
          <span className="ml-2 text-sm text-gray-400 font-sans font-normal">
            ({attendees.length})
          </span>
        </h2>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              setIsTyping(true);
            }}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-bcs-green w-full sm:w-64"
          />

          {!isInternal && (
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-bcs-green"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          {(search || filterCategory) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setFilterCategory("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => handleDownload('pdf')}
              className="bg-bcs-green hover:bg-bcs-accent"
            >
              Download PDF
            </Button>
            <Button
              onClick={() => handleDownload('csv')}
              variant="outline"
              className="border-bcs-green text-bcs-green hover:bg-bcs-green hover:text-white"
            >
              Download CSV
            </Button>
          </div>
        </div>
      </div>

      {isTyping ? (
        <p className="text-gray-500 italic">Typing...</p>
      ) : loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : attendees.length === 0 ? (
        <p className="text-gray-500">No records found.</p>
      ) : (
        <div className="overflow-x-auto">
          {/* --- INTERNAL EVENT TABLE --- */}
          {isInternal ? (
            <table className="w-full text-sm border-t min-w-[800px]">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Passport</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Arm</th>
                  <th className="p-3">Part/Inst</th>
                  <th className="p-3">Year</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Medical</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-3">
                      <div className="h-10 w-10 relative rounded-full overflow-hidden border border-gray-200">
                         {a.passport_url ? (
                           <Image src={a.passport_url} alt="passport" fill className="object-cover" />
                         ) : (
                           <div className="w-full h-full bg-gray-200 flex items-center justify-center">?</div>
                         )}
                      </div>
                    </td>
                    <td className="p-3 font-medium">
                      {a.first_name} {a.other_name ? `${a.other_name} ` : ""}{a.last_name}
                      <div className="text-xs text-gray-500 font-normal">{a.email}</div>
                    </td>
                    <td className="p-3 capitalize">{a.ensemble_arm?.replace('_', ' & ')}</td>
                    <td className="p-3 capitalize">
                       {a.choir_part || a.orchestra_instrument || "-"}
                    </td>
                    <td className="p-3">{a.join_year}</td>
                    <td className="p-3 capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs ${a.membership_status === 'full_member' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {a.membership_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      {a.has_medical_condition ? (
                        <span className="text-red-600 font-medium cursor-help" title={a.medical_condition_details}>
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* --- PUBLIC EVENT TABLE --- */
            <table className="w-full text-sm border-t">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3">{a.buyer_name}</td>
                    <td className="p-3">{a.buyer_email}</td>
                    <td className="p-3">{a.category}</td>
                    <td className="p-3">₦{a.amount_paid?.toLocaleString() || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end mt-4 gap-2">
          <Button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            variant="outline"
          >
            Prev
          </Button>
          <span className="px-3 py-2 text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
