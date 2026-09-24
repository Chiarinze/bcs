"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, X, Users } from "lucide-react";
import type { Subscriber } from "@/types";

/**
 * Chooses who a campaign goes to: the whole list, or a hand-picked set of
 * subscribers. Only subscribed contacts can be picked.
 */
export default function RecipientPicker({
  audience,
  selected,
  onAudienceChange,
  onSelectedChange,
  disabled,
}: {
  audience: "all" | "selected";
  selected: Subscriber[];
  onAudienceChange: (a: "all" | "selected") => void;
  onSelectedChange: (next: Subscriber[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Subscriber[]>([]);
  const [searching, setSearching] = useState(false);
  const [total, setTotal] = useState<number | null>(null);

  const ids = new Set(selected.map((s) => s.id));

  const search = useCallback(async (q: string) => {
    setSearching(true);
    const params = new URLSearchParams({ status: "subscribed" });
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/subscribers?${params}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.subscribers);
      setTotal(data.counts.subscribed);
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (audience !== "selected") return;
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [audience, query, search]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-bcs-green">Recipients</p>

      <div className="flex flex-wrap gap-4">
        {(["all", "selected"] as const).map((a) => (
          <label key={a} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="audience"
              checked={audience === a}
              disabled={disabled}
              onChange={() => onAudienceChange(a)}
              className="text-bcs-green focus:ring-bcs-accent"
            />
            {a === "all" ? (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Everyone subscribed
                {total != null && audience === "all" && ` (${total})`}
              </span>
            ) : (
              "Only the people I choose"
            )}
          </label>
        ))}
      </div>

      {audience === "selected" && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 bg-bcs-green/10 text-bcs-green text-xs px-2 py-1 rounded-full"
                >
                  {s.name || s.email}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => onSelectedChange(selected.filter((x) => x.id !== s.id))}
                      className="hover:text-red-600"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {!disabled && (
            <>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search subscribers by name or email"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-bcs-accent outline-none"
                />
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
                {searching ? (
                  <p className="p-3 text-sm text-gray-400">Searching…</p>
                ) : results.length === 0 ? (
                  <p className="p-3 text-sm text-gray-400">No matching subscribers.</p>
                ) : (
                  results.map((s) => (
                    <label key={s.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ids.has(s.id)}
                        onChange={(e) =>
                          onSelectedChange(
                            e.target.checked ? [...selected, s] : selected.filter((x) => x.id !== s.id)
                          )
                        }
                        className="rounded border-gray-300 text-bcs-green"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm text-gray-900 truncate">{s.name || "—"}</span>
                        <span className="block text-xs text-gray-500 truncate">{s.email}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-400">
                {selected.length} recipient{selected.length === 1 ? "" : "s"} selected.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
