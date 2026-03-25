"use client";

import { useState } from "react";
import {
  ExternalLink,
  Copy,
  Trash2,
  Check,
  ChevronDown,
  Calendar,
  Banknote,
  Globe,
} from "lucide-react";
import type { GrantOpportunity, GrantStatus } from "@/types";
import GrantStatusBadge from "./GrantStatusBadge";

const STATUS_OPTIONS: { value: GrantStatus; label: string }[] = [
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "interested", label: "Interested" },
  { value: "applied", label: "Applied" },
];

export default function GrantCard({ grant }: { grant: GrantOpportunity }) {
  const [status, setStatus] = useState<GrantStatus>(grant.status);
  const [copied, setCopied] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function handleStatusChange(newStatus: GrantStatus) {
    setShowDropdown(false);
    if (newStatus === status) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/grants/${grant.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setStatus(newStatus);
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove this grant opportunity?")) return;

    const res = await fetch(`/api/grants/${grant.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      setDeleted(true);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(grant.external_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (deleted) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{grant.title}</h3>
            <GrantStatusBadge status={status} />
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {grant.source_name}
            </span>
            {grant.deadline && (
              <>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Deadline:{" "}
                  {new Date(grant.deadline).toLocaleDateString("en-NG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </>
            )}
            {grant.amount && (
              <>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-1">
                  <Banknote className="w-3 h-3" />
                  {grant.amount}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {grant.description && (
        <p className="text-sm text-gray-600 line-clamp-2">
          {grant.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {/* Apply (external link) */}
        <a
          href={grant.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-bcs-green rounded-full hover:bg-bcs-green/90 transition"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Apply
        </a>

        {/* Status dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={updating}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-bcs-green border border-bcs-green rounded-full hover:bg-bcs-green/5 transition disabled:opacity-50"
          >
            {updating ? "Updating..." : "Status"}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 min-w-[140px]">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition flex items-center gap-2 ${
                    status === opt.value
                      ? "text-bcs-green font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {status === opt.value && <Check className="w-3.5 h-3.5" />}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Share
            </>
          )}
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition"
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}
