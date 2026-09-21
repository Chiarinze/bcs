"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import Button from "@/components/ui/Button";
import { TextInput, TextArea } from "@/components/ui/FormInputs";
import { Plus, Trash2, ArrowUp, ArrowDown, Check } from "lucide-react";
import type { AboutContent, ContactContent, LinksContent, SiteContentKey } from "@/types";

type Tab = SiteContentKey;

/** Editable list of short strings (tags, arms, units). */
function StringList({
  label,
  hint,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const update = (i: number, v: string) =>
    onChange(items.map((item, idx) => (idx === i ? v : item)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-bcs-green">{label}</p>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none"
          />
          <button type="button" onClick={() => move(i, -1)} className="p-2 text-gray-400 hover:text-bcs-green" title="Move up">
            <ArrowUp className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => move(i, 1)} className="p-2 text-gray-400 hover:text-bcs-green" title="Move down">
            <ArrowDown className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => remove(i)} className="p-2 text-gray-400 hover:text-red-500" title="Remove">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex items-center gap-1 text-sm text-bcs-green hover:underline"
      >
        <Plus className="w-4 h-4" /> Add item
      </button>
    </div>
  );
}

/** Editable list of paragraphs. */
function ParagraphList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-bcs-green">{label}</p>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <textarea
            value={item}
            rows={4}
            onChange={(e) =>
              onChange(items.map((p, idx) => (idx === i ? e.target.value : p)))
            }
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm resize-y focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="self-start p-2 text-gray-400 hover:text-red-500"
            title="Remove paragraph"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex items-center gap-1 text-sm text-bcs-green hover:underline"
      >
        <Plus className="w-4 h-4" /> Add paragraph
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <h2 className="font-serif text-xl text-bcs-green">{title}</h2>
      {children}
    </div>
  );
}

export default function SiteContentPage() {
  const [tab, setTab] = useState<Tab>("about");
  const [about, setAbout] = useState<AboutContent | null>(null);
  const [contact, setContact] = useState<ContactContent | null>(null);
  const [links, setLinks] = useState<LinksContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/site-content")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
        return res.json();
      })
      .then((data) => {
        setAbout(data.about);
        setContact(data.contact);
        setLinks(data.links);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    const value = tab === "about" ? about : tab === "contact" ? contact : links;
    if (!value) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/site-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: tab, value }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Save failed");
    } else {
      // The server returns the sanitised document; mirror it so the form
      // shows exactly what is live.
      if (tab === "about") setAbout(data.value);
      else if (tab === "contact") setContact(data.value);
      else setLinks(data.value);
      setSavedAt(Date.now());
    }
    setSaving(false);
  }

  const patchAbout = (patch: Partial<AboutContent>) =>
    setAbout((prev) => (prev ? { ...prev, ...patch } : prev));
  const patchContact = (patch: Partial<ContactContent>) =>
    setContact((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-bcs-green">Site Content</h1>
            <p className="text-sm text-gray-500">
              Edit the text shown on the public About and Contact pages. Board
              members and part leaders are managed under{" "}
              <a href="/admin/roles" className="text-bcs-green underline">
                Roles
              </a>
              .
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && !saving && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <Button onClick={save} loading={saving} disabled={loading}>
              Save {tab === "about" ? "About" : tab === "contact" ? "Contact" : "Links"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {(["about", "contact", "links"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t
                  ? "border-bcs-green text-bcs-green"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "about" ? "About page" : t === "contact" ? "Contact page" : "Links"}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {loading && <p className="text-sm text-gray-500">Loading…</p>}

        {!loading && tab === "about" && about && (
          <div className="space-y-6">
            <Section title="Header">
              <TextArea
                label="Tagline (under the About Us heading)"
                name="tagline"
                rows={2}
                value={about.tagline}
                onChange={(e) => patchAbout({ tagline: e.target.value })}
              />
              <TextArea
                label="Home page “Who We Are” paragraph"
                name="home_intro"
                rows={4}
                value={about.home_intro}
                onChange={(e) => patchAbout({ home_intro: e.target.value })}
              />
            </Section>

            <Section title="Introduction">
              <ParagraphList
                label="Paragraphs"
                items={about.intro}
                onChange={(intro) => patchAbout({ intro })}
              />
            </Section>

            <Section title="Mission & Vision">
              <TextArea
                label="Our Mission"
                name="mission"
                value={about.mission}
                onChange={(e) => patchAbout({ mission: e.target.value })}
              />
              <TextArea
                label="Our Vision"
                name="vision"
                value={about.vision}
                onChange={(e) => patchAbout({ vision: e.target.value })}
              />
            </Section>

            <Section title="What We Do">
              {about.what_we_do.map((item, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-gray-400">
                      Card {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        patchAbout({ what_we_do: about.what_we_do.filter((_, idx) => idx !== i) })
                      }
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Remove card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <TextInput
                    label="Title"
                    name={`wwd_title_${i}`}
                    value={item.title}
                    onChange={(e) =>
                      patchAbout({
                        what_we_do: about.what_we_do.map((c, idx) =>
                          idx === i ? { ...c, title: e.target.value } : c
                        ),
                      })
                    }
                  />
                  <TextArea
                    label="Description"
                    name={`wwd_desc_${i}`}
                    rows={3}
                    value={item.description}
                    onChange={(e) =>
                      patchAbout({
                        what_we_do: about.what_we_do.map((c, idx) =>
                          idx === i ? { ...c, description: e.target.value } : c
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patchAbout({ what_we_do: [...about.what_we_do, { title: "", description: "" }] })
                }
                className="inline-flex items-center gap-1 text-sm text-bcs-green hover:underline"
              >
                <Plus className="w-4 h-4" /> Add card
              </button>
            </Section>

            <Section title="Repertoire">
              <TextInput
                label="Intro line"
                name="repertoire_intro"
                value={about.repertoire_intro}
                onChange={(e) => patchAbout({ repertoire_intro: e.target.value })}
              />
              <StringList
                label="Styles"
                items={about.repertoire}
                onChange={(repertoire) => patchAbout({ repertoire })}
                placeholder="e.g. Classical"
              />
            </Section>

            <Section title="Services & Join Us">
              <TextArea
                label="Our Services"
                name="services"
                value={about.services}
                onChange={(e) => patchAbout({ services: e.target.value })}
              />
              <TextArea
                label="Join Us"
                name="join_us"
                value={about.join_us}
                onChange={(e) => patchAbout({ join_us: e.target.value })}
              />
            </Section>

            <Section title="Arms & Management Units">
              <StringList
                label="Our Arms"
                items={about.arms}
                onChange={(arms) => patchAbout({ arms })}
                placeholder="e.g. The Chorale"
              />
              <StringList
                label="Management units"
                hint="Directorates and teams listed above the part leaders. The people themselves are assigned under Roles."
                items={about.management_units}
                onChange={(management_units) => patchAbout({ management_units })}
                placeholder="e.g. The Directorate of Investment"
              />
            </Section>
          </div>
        )}

        {!loading && tab === "contact" && contact && (
          <div className="space-y-6">
            <Section title="Header">
              <TextArea
                label="Tagline (under the Contact Us heading)"
                name="c_tagline"
                rows={2}
                value={contact.tagline}
                onChange={(e) => patchContact({ tagline: e.target.value })}
              />
            </Section>

            <Section title="Contact details">
              <TextInput
                label="Phone"
                name="phone"
                value={contact.phone}
                onChange={(e) => patchContact({ phone: e.target.value })}
              />
              <TextInput
                label="Email"
                name="email"
                type="email"
                value={contact.email}
                onChange={(e) => patchContact({ email: e.target.value })}
              />
              <TextInput
                label="Facebook URL"
                name="facebook"
                value={contact.facebook}
                onChange={(e) => patchContact({ facebook: e.target.value })}
              />
              <TextInput
                label="Instagram URL"
                name="instagram"
                value={contact.instagram}
                onChange={(e) => patchContact({ instagram: e.target.value })}
              />
            </Section>

            <Section title="Description">
              <TextArea
                label="Paragraph under the contact options"
                name="c_description"
                value={contact.description}
                onChange={(e) => patchContact({ description: e.target.value })}
              />
            </Section>

            <Section title="Digital Services">
              <TextArea
                label="Intro line"
                name="digital_services_intro"
                rows={2}
                value={contact.digital_services_intro}
                onChange={(e) => patchContact({ digital_services_intro: e.target.value })}
              />
              <StringList
                label="Services"
                items={contact.digital_services}
                onChange={(digital_services) => patchContact({ digital_services })}
                placeholder="e.g. Graphics Design"
              />
            </Section>
          </div>
        )}

        {!loading && tab === "links" && links && (
          <div className="space-y-6">
            <Section title="External links">
              <TextInput
                label="Buy music scores / pieces (URL)"
                name="music_scores_url"
                type="url"
                placeholder="https://…"
                value={links.music_scores_url}
                onChange={(e) => setLinks({ ...links, music_scores_url: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                Shown on the registration success screen after someone registers or buys a ticket. Leave empty to hide the button.
              </p>
            </Section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
