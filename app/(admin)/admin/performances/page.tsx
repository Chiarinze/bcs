"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import Button from "@/components/ui/Button";
import { TextInput, FileInput } from "@/components/ui/FormInputs";
import { Plus, Pencil, Trash2, ExternalLink, X } from "lucide-react";
import { generateBlurPlaceholder } from "@/lib/blurPlaceholder";
import { formatLongDate } from "@/lib/formatDate";
import type { Performance } from "@/types";

type FormState = {
  title: string;
  performed_on: string;
  location: string;
  link: string;
};

const EMPTY: FormState = { title: "", performed_on: "", location: "", link: "" };

export default function AdminPerformancesPage() {
  const [items, setItems] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Performance | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/performances");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFile(null);
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: Performance) {
    setEditing(p);
    setForm({
      title: p.title,
      performed_on: p.performed_on,
      location: p.location || "",
      link: p.link || "",
    });
    setFile(null);
    setError(null);
    setShowForm(true);
  }

  async function uploadImage(f: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/performances/upload-image", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!editing && !file) throw new Error("Please choose an image");

      let image_url = "";
      let image_blur_data: string | null = null;
      if (file) {
        image_url = await uploadImage(file);
        image_blur_data = await generateBlurPlaceholder(file).catch(() => null);
      }

      const payload = { ...form, image_url, image_blur_data };
      const res = await fetch(
        editing ? `/api/performances/${editing.id}` : "/api/performances",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Performance) {
    if (!confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
    setDeleting(p.id);
    const res = await fetch(`/api/performances/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Delete failed");
    }
    await load();
    setDeleting(null);
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-bcs-green">Past Performances</h1>
            <p className="text-sm text-gray-500">
              Shown on the Performances page and the three most recent on the home page.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add performance
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-sm text-gray-400">No performances yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.title} className="w-full h-40 object-cover" />
                <div className="p-4 flex-1 flex flex-col gap-1">
                  <h3 className="font-medium text-gray-900">{p.title}</h3>
                  <p className="text-xs text-gray-500">
                    {formatLongDate(p.performed_on)}
                    {p.location && ` • ${p.location}`}
                  </p>
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-bcs-green hover:underline mt-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Excerpt link
                    </a>
                  )}
                  <div className="mt-auto pt-3 flex items-center gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bcs-green/10 text-bcs-green text-xs font-medium hover:bg-bcs-green/20 transition"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={deleting === p.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowForm(false)} />
            <div className="fixed inset-x-4 top-[6%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-white rounded-2xl shadow-xl z-50 w-full sm:max-w-lg max-h-[88vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  {editing ? "Edit performance" : "Add performance"}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <TextInput
                  label="Title"
                  name="title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <TextInput
                  label="Date"
                  name="performed_on"
                  type="date"
                  required
                  value={form.performed_on}
                  onChange={(e) => setForm({ ...form, performed_on: e.target.value })}
                />
                <TextInput
                  label="Location"
                  name="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
                <TextInput
                  label="Excerpt link (optional)"
                  name="link"
                  type="url"
                  placeholder="https://…"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                />
                <FileInput
                  label={editing ? "Replace image (optional)" : "Image"}
                  name="image"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {editing && !file && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editing.image_url} alt="" className="w-full h-32 object-cover rounded-xl" />
                )}

                {error && (
                  <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="submit" loading={saving}>
                    {editing ? "Save changes" : "Create"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
