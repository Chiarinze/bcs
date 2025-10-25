"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";

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

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tickets/attendees?event_id=${event.id}&page=${page}&limit=${limit}` +
          (search ? `&search=${encodeURIComponent(search)}` : "") +
          (filterCategory
            ? `&category=${encodeURIComponent(filterCategory)}`
            : "")
      );
      const data = await res.json();
      if (res.ok) {
        setAttendees(data.attendees);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [event.id, page, limit, search, filterCategory]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  // Debounce search for smooth UX
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsTyping(false);
      fetchAttendees();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterCategory]);

  // useEffect(() => {
  //   fetchAttendees();
  // }, []);

  useEffect(() => {
    void fetchAttendees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function downloadPDF() {
    try {
      const params = new URLSearchParams({
        event_id: event.id,
      });

      if (search.trim()) params.append("search", search);
      if (filterCategory) params.append("category", filterCategory);

      const res = await fetch(`/api/tickets/download?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to generate PDF");
        return;
      }

      // Convert to blob for browser download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.title}-attendees.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download attendee list.");
    }
  }

  async function downloadCSV() {
    try {
      const params = new URLSearchParams({
        event_id: event.id,
      });

      if (search.trim()) params.append("search", search);
      if (filterCategory) params.append("category", filterCategory);

      const res = await fetch(`/api/tickets/export-csv?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to generate CSV");
        return;
      }

      // Download as file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.title}-attendees.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV download error:", err);
      alert("Failed to download attendee list.");
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h2 className="text-xl font-serif text-bcs-green">Attendees</h2>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              setIsTyping(true);
            }}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-bcs-green w-full sm:w-64"
          />

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
              onClick={downloadPDF}
              className="bg-bcs-green hover:bg-bcs-accent"
            >
              Download PDF
            </Button>
            <Button
              onClick={downloadCSV}
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
        <p className="text-gray-500">Loading attendees...</p>
      ) : attendees.length === 0 ? (
        <p className="text-gray-500">No attendees found.</p>
      ) : (
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
