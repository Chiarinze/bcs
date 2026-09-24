"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, X, UserRound } from "lucide-react";
import type { Editor } from "@tiptap/react";
import TipTapEditor from "@/components/articles/TipTapEditor";
import Button from "@/components/ui/Button";
import { TextInput } from "@/components/ui/FormInputs";
import { formatLongDate } from "@/lib/formatDate";
import RecipientPicker from "@/components/admin/RecipientPicker";
import type { Event, Newsletter, NewsletterKind, Subscriber } from "@/types";

const SITE = "https://www.beninchoraleandphilharmonic.com";

interface Props {
  newsletter?: Newsletter;
  /** Subscribers already chosen when the campaign's audience is "selected". */
  initialRecipients?: Subscriber[];
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Builds the event block inserted into the body: image, title, date, link. */
function eventHtml(ev: Event): string {
  const url = `${SITE}/events/${ev.slug}`;
  const cta = ev.is_paid ? "Get tickets" : ev.event_type === "audition" ? "Register to audition" : "Register free";
  const when = formatLongDate(ev.date) + (ev.location ? ` · ${escapeHtml(ev.location)}` : "");
  return (
    (ev.image_url ? `<img src="${ev.image_url}" alt="${escapeHtml(ev.title)}" />` : "") +
    `<h2>${escapeHtml(ev.title)}</h2>` +
    `<p>${when}</p>` +
    (ev.description ? `<p>${escapeHtml(ev.description.slice(0, 300))}${ev.description.length > 300 ? "…" : ""}</p>` : "") +
    `<p><a href="${url}">${cta} →</a></p>`
  );
}

export default function NewsletterComposer({ newsletter, initialRecipients = [] }: Props) {
  const router = useRouter();
  const editable = !newsletter || newsletter.status === "draft";

  const [subject, setSubject] = useState(newsletter?.subject || "");
  const [preheader, setPreheader] = useState(newsletter?.preheader || "");
  const [kind, setKind] = useState<NewsletterKind>(newsletter?.kind || "newsletter");
  const [body, setBody] = useState(newsletter?.body_html || "");
  const [audience, setAudience] = useState<"all" | "selected">(newsletter?.audience || "all");
  const [recipients, setRecipients] = useState<Subscriber[]>(initialRecipients);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  // Event picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [pickerEditor, setPickerEditor] = useState<Editor | null>(null);

  useEffect(() => {
    if (!pickerOpen || events.length) return;
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Event[]) =>
        setEvents(
          data
            .filter((e) => !e.is_internal && new Date(e.date) >= new Date(Date.now() - 86400000))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        )
      );
  }, [pickerOpen, events.length]);

  async function save(): Promise<Newsletter | null> {
    setSaving(true);
    setError("");
    const payload = {
      subject,
      preheader,
      kind,
      body_html: body,
      audience,
      recipient_ids: recipients.map((r) => r.id),
    };
    const res = await fetch(newsletter ? `/api/admin/newsletters/${newsletter.id}` : "/api/admin/newsletters", {
      method: newsletter ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Save failed");
      return null;
    }
    setDirty(false);
    if (!newsletter) router.replace(`/admin/newsletters/${data.id}`);
    return data as Newsletter;
  }

  const insertEvent = (ev: Event) => {
    pickerEditor?.chain().focus().insertContent(eventHtml(ev)).run();
    setPickerOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="grid md:grid-cols-[1fr_auto] gap-4">
          <TextInput
            label="Subject"
            name="subject"
            required
            value={subject}
            disabled={!editable}
            onChange={(e) => {
              setSubject(e.target.value);
              setDirty(true);
            }}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-bcs-green">Type</label>
            <select
              value={kind}
              disabled={!editable}
              onChange={(e) => {
                setKind(e.target.value as NewsletterKind);
                setDirty(true);
              }}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-bcs-accent outline-none"
            >
              <option value="newsletter">Newsletter</option>
              <option value="promotional">Promotional</option>
            </select>
          </div>
        </div>
        <TextInput
          label="Preview text (optional — shown next to the subject in inboxes)"
          name="preheader"
          value={preheader}
          disabled={!editable}
          maxLength={200}
          onChange={(e) => {
            setPreheader(e.target.value);
            setDirty(true);
          }}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <RecipientPicker
          audience={audience}
          selected={recipients}
          disabled={!editable}
          onAudienceChange={(a) => {
            setAudience(a);
            setDirty(true);
          }}
          onSelectedChange={(next) => {
            setRecipients(next);
            setDirty(true);
          }}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-bcs-green">Body</p>
        {editable ? (
          <TipTapEditor
            content={body}
            placeholder="Write your newsletter… Keep it personal and short — it lands in inboxes more reliably."
            onChange={(html) => {
              setBody(html);
              setDirty(true);
            }}
            extraTools={(editor) => (
              <>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().insertContent("{{first_name|there}}").run()}
                  title="Insert the recipient's first name"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-bcs-green hover:bg-bcs-green/10"
                >
                  <UserRound className="w-4 h-4" /> First name
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().insertContent("{{name|there}}").run()}
                  title="Insert the recipient's full name"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-bcs-green hover:bg-bcs-green/10"
                >
                  <UserRound className="w-4 h-4" /> Full name
                </button>
                <button
                type="button"
                onClick={() => {
                  setPickerEditor(editor);
                  setPickerOpen(true);
                }}
                title="Insert an upcoming event"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-bcs-green hover:bg-bcs-green/10"
              >
                <CalendarPlus className="w-4 h-4" /> Insert event
                </button>
              </>
            )}
          />
        ) : (
          <div
            className="prose prose-sm max-w-none bg-white rounded-2xl border border-gray-100 p-6"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        )}
        <p className="text-xs text-gray-400">
          Your logo, header and footer are added automatically from the standard email template, along with
          an unsubscribe link. Use <code>{"{{first_name|there}}"}</code> or <code>{"{{name|there}}"}</code> anywhere —
          including the subject — to address each person by name; the word after <code>|</code> is used when we
          don&apos;t know their name.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {editable && (
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={saving} disabled={!subject.trim()}>
            {newsletter ? "Save changes" : "Save draft"}
          </Button>
          {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
        </div>
      )}

      {/* Event picker */}
      {pickerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setPickerOpen(false)} />
          <div className="fixed inset-x-4 top-[10%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white rounded-2xl shadow-xl z-50 w-full sm:max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Insert an upcoming event</h2>
              <button onClick={() => setPickerOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto divide-y divide-gray-50">
              {events.length === 0 ? (
                <p className="p-6 text-sm text-gray-400">No upcoming public events.</p>
              ) : (
                events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => insertEvent(ev)}
                    className="w-full text-left px-5 py-3 hover:bg-gray-50"
                  >
                    <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatLongDate(ev.date)}
                      {ev.location && ` · ${ev.location}`}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
