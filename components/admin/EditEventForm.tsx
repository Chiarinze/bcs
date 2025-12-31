"use client";

import { useEffect, useState } from "react";
import { uploadEventImage } from "@/lib/uploadImage";
import { useRouter } from "next/navigation";
import { TextInput, TextArea, FileInput } from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";

interface TicketCategory {
  id?: string;
  name: string;
  price: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EditEventForm({ event }: { event: any }) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<TicketCategory[]>([]);

  // New State
  const [isInternal, setIsInternal] = useState(event.is_internal || false);
  const [isPaid, setIsPaid] = useState(event.is_paid || false);

  const router = useRouter();

  useEffect(() => {
    // Only fetch categories if it's NOT an internal event
    if (!event.is_internal) {
      async function fetchCategories() {
        const res = await fetch(`/api/tickets/categories?event_id=${event.id}`);
        const data = await res.json();
        setCategories(data || []);
      }
      fetchCategories();
    }
  }, [event.id, event.is_internal]);

  function addCategory() {
    setCategories([...categories, { name: "", price: 0 }]);
  }

  function removeCategory(index: number) {
    setCategories(categories.filter((_, i) => i !== index));
  }

  function updateCategory<K extends keyof TicketCategory>(
    index: number,
    field: K,
    value: string
  ) {
    const updated = [...categories];
    updated[index][field] =
      field === "price"
        ? (Number(value) as TicketCategory[K])
        : (value as TicketCategory[K]);
    setCategories(updated);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      setLoading(true);
      let image_url = event.image_url;
      let image_blur_data = event.image_blur_data;
      const file = formData.get("image") as File;

      if (file && file.size > 0) {
        const upload = await uploadEventImage(file);
        image_url = upload.publicUrl;
        image_blur_data = upload.blurData;
      }

      const updatedData = {
        title: formData.get("title"),
        description: formData.get("description"),
        date: formData.get("date"),
        location: formData.get("location"),

        // Internal Logic
        is_internal: isInternal,
        access_code: isInternal ? formData.get("access_code") : null,
        is_paid: isInternal ? false : isPaid, // Reset paid if switching to internal

        image_url,
        image_blur_data,
        categories: isInternal ? [] : categories,
      };

      const res = await fetch(`/api/events/${event.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) throw new Error("Failed to update event");

      await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "/events",
          adminKey: process.env.NEXT_PUBLIC_ADMIN_PASS,
        }),
      });

      router.push("/admin/events");
      router.refresh();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
    >
      <TextInput
        name="title"
        label="Event Title"
        defaultValue={event.title}
        required
      />
      <TextArea
        name="description"
        label="Description"
        defaultValue={event.description}
        required
      />
      <TextInput
        type="date"
        name="date"
        label="Date"
        defaultValue={event.date?.split("T")[0]}
        required
      />
      <TextInput
        name="location"
        label="Location"
        defaultValue={event.location}
        required
      />

      {/* Event Type Settings */}
      <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
        <h3 className="font-medium text-bcs-green">Event Settings</h3>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="h-4 w-4 text-bcs-green rounded border-gray-300 focus:ring-bcs-accent"
            />
            <span className="text-gray-700">Internal Event (Members Only)</span>
          </label>

          {!isInternal && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_paid"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="h-4 w-4 text-bcs-green rounded border-gray-300 focus:ring-bcs-accent"
              />
              <span className="text-gray-700">Paid Public Event</span>
            </label>
          )}
        </div>

        {/* Access Code Input - Only if Internal */}
        {isInternal && (
          <div className="pt-2 animate-in fade-in slide-in-from-top-2">
            <TextInput
              name="access_code"
              label="Access Code"
              defaultValue={event.access_code || ""}
              placeholder="e.g., BCS-MEM-2024"
              required={isInternal}
            />
          </div>
        )}
      </div>

      {/* Ticket Categories - Only show if NOT Internal */}
      {!isInternal && (
        <div className="space-y-3">
          <h3 className="text-bcs-green font-medium">Ticket Categories</h3>
          {categories.map((cat, i) => (
            <div key={i} className="flex gap-2 items-center">
              <TextInput
                value={cat.name}
                onChange={(e) => updateCategory(i, "name", e.target.value)}
                placeholder="Category name"
                className="flex-1"
                required
              />
              <TextInput
                type="number"
                step="0.01"
                value={cat.price}
                onChange={(e) => updateCategory(i, "price", e.target.value)}
                placeholder="₦ Price"
                className="w-32"
                required
              />
              <Button
                type="button"
                onClick={() => removeCategory(i)}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5"
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={addCategory}
            className="bg-bcs-green hover:bg-bcs-accent"
          >
            + Add Category
          </Button>
        </div>
      )}

      <FileInput name="image" accept="image/*" label="Event Flyer" />

      <div className="pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-bcs-accent hover:bg-bcs-green"
        >
          {loading ? "Updating..." : "Update Event"}
        </Button>
      </div>
    </form>
  );
}
