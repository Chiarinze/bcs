"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  FileText,
  FileIcon,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";

interface EventDetail {
  id: string;
  title: string;
  description: string;
  date: string;
  end_date?: string | null;
  slug: string;
  location?: string;
  image_url?: string | null;
  image_blur_data?: string | null;
  event_type?: string;
  registration_closed?: boolean;
}

interface EventDocument {
  id: string;
  name: string;
  file_url: string;
  created_at: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateRange(start: string, end?: string | null) {
  if (!end) return formatDate(start);
  const s = new Date(start);
  const e = new Date(end);
  if (s.toDateString() === e.toDateString()) return formatDate(start);
  return `${formatDate(start)} — ${formatDate(end)}`;
}

export default function MemberEventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [documents, setDocuments] = useState<EventDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [checkingReg, setCheckingReg] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [regError, setRegError] = useState("");

  useEffect(() => {
    async function load() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // Fetch event
      const { data: eventData } = await supabase
        .from("events")
        .select("id, title, description, date, end_date, slug, location, image_url, image_blur_data, event_type, registration_closed")
        .eq("slug", slug)
        .eq("is_internal", true)
        .single();

      if (!eventData) {
        router.push("/dashboard/events");
        return;
      }
      setEvent(eventData);

      // Fetch documents
      const { data: docsData } = await supabase
        .from("event_documents")
        .select("id, name, file_url, created_at")
        .eq("event_id", eventData.id)
        .order("created_at", { ascending: true });

      setDocuments(docsData || []);
      setLoading(false);

      // Check registration status
      const res = await fetch(`/api/events/${slug}/register`);
      if (res.ok) {
        const data = await res.json();
        setRegistered(data.registered);
      }
      setCheckingReg(false);
    }
    load();
  }, [slug, router]);

  async function handleRegister() {
    setRegistering(true);
    setRegError("");

    const res = await fetch(`/api/events/${slug}/register`, { method: "POST" });

    if (res.ok) {
      setRegistered(true);
      setShowConfirm(false);
      setShowSuccess(true);
    } else {
      const data = await res.json();
      setRegError(data.error || "Registration failed");
    }
    setRegistering(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-bcs-green animate-spin" />
      </div>
    );
  }

  if (!event) return null;

  const isPast = new Date(event.end_date || event.date) < new Date();

  return (
    <div className="space-y-6">
      {/* Success message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Registration Successful!
          </h3>
          <p className="text-green-700 text-sm mb-1">
            You have been successfully registered for <strong>{event.title}</strong>.
          </p>
          <p className="text-green-600 text-sm">
            Please check your email for further information and event details.
          </p>
        </div>
      )}

      {/* Event Image */}
      {event.image_url && (
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden">
          <Image
            src={event.image_url}
            alt={event.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 800px"
            {...(event.image_blur_data
              ? { placeholder: "blur", blurDataURL: event.image_blur_data }
              : {})}
          />
        </div>
      )}

      {/* Event Info */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {event.event_type && (
            <span className="px-2.5 py-0.5 rounded-full bg-bcs-green/10 text-bcs-green text-xs font-medium uppercase">
              {event.event_type}
            </span>
          )}
          {isPast && (
            <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
              Past Event
            </span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-serif text-bcs-green mb-3">
          {event.title}
        </h1>
        <p className="text-gray-600">{event.description}</p>
      </div>

      {/* Meta */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <Calendar className="w-4 h-4 text-bcs-green flex-shrink-0" />
          <span>{formatDateRange(event.date, event.end_date)}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-bcs-green flex-shrink-0" />
            <span>{event.location}</span>
          </div>
        )}
      </div>

      {/* Registration Section */}
      {!isPast && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          {checkingReg ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking registration...
            </div>
          ) : registered ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">
                  You are registered for this event
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Check your email for event details
                </p>
              </div>
            </div>
          ) : event.registration_closed ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-800">
                Registration is closed
              </p>
              <p className="text-xs text-red-700 mt-1">
                The administrator has closed registration for this event.
              </p>
            </div>
          ) : showConfirm ? (
            <div className="text-center space-y-4">
              <Clock className="w-10 h-10 text-bcs-green mx-auto" />
              <div>
                <p className="font-medium text-gray-900">
                  You are about to register for
                </p>
                <p className="text-bcs-green font-semibold text-lg mt-1">
                  {event.title}
                </p>
              </div>
              {regError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                  {regError}
                </p>
              )}
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirm(false);
                    setRegError("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  loading={registering}
                  onClick={handleRegister}
                >
                  Confirm Registration
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Register for this event
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Your profile information will be used for registration
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowConfirm(true)}
              >
                Register
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Documents / Timetable */}
      {documents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Event Resources & Downloads
          </h2>
          <div className="space-y-2">
            {documents.map((doc) => {
              const isPdf = doc.file_url.toLowerCase().endsWith(".pdf");
              return (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-bcs-green/10 flex items-center justify-center flex-shrink-0">
                    {isPdf ? (
                      <FileText className="w-4 h-4 text-bcs-green" />
                    ) : (
                      <FileIcon className="w-4 h-4 text-bcs-green" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {isPdf ? "PDF Document" : "File"} — Click to download
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
