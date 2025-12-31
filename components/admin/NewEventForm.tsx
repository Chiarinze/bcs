"use client";

import { useState } from "react";
import { uploadEventImage } from "@/lib/uploadImage";
import { useRouter } from "next/navigation";
import {
  TextInput,
  TextArea,
  // Checkbox,
  FileInput,
} from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";

interface TicketCategory {
  name: string;
  price: number;
}

export default function NewEventForm() {
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const router = useRouter();

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
      const file = formData.get("image") as File;
      let image_url = "";
      let image_blur_data = "";

      if (file && file.size > 0) {
        const upload = await uploadEventImage(file);
        image_url = upload.publicUrl;
        image_blur_data = upload.blurData ?? "";
      }

      const eventData = {
        title: formData.get("title"),
        description: formData.get("description"),
        date: formData.get("date"),
        location: formData.get("location"),

        is_internal: isInternal,
        access_code: isInternal ? formData.get("access_code") : null,
        is_paid: isInternal ? false : isPaid, // Force internal to be unpaid for now, or change logic if needed

        image_url,
        image_blur_data,
        categories: isInternal ? [] : categories,
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) throw new Error("Failed to create event");

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
      <TextInput name="title" label="Event Title" required />
      <TextArea name="description" label="Description" required />
      <TextInput type="date" name="date" label="Date" required />
      <TextInput name="location" label="Venue/Location" required />

      {/* Event Type Toggles */}
      <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
        <h3 className="font-medium text-bcs-green">Event Settings</h3>

        <div className="flex items-center gap-6">
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
              label="Access Code (Required for members to register)"
              placeholder="e.g., BCS-2024-MEM"
              required={isInternal}
            />
            <p className="text-xs text-gray-500 mt-1">
              Members will need to enter this exact code to view the
              registration form.
            </p>
          </div>
        )}
      </div>

      {/* Ticket Categories - Hide if Internal */}
      {!isInternal && (
        <div className="space-y-3">
          <h3 className="text-bcs-green font-medium">Ticket Categories</h3>
          {categories.map((cat, i) => (
            <div key={i} className="flex gap-2 items-center">
              {/* Existing Category Inputs... */}
              <TextInput
                value={cat.name}
                onChange={(e) => updateCategory(i, "name", e.target.value)}
                placeholder="Category Name"
                className="flex-1"
                required
              />
              <TextInput
                type="number"
                value={cat.price}
                onChange={(e) => updateCategory(i, "price", e.target.value)}
                placeholder="Price"
                className="w-32"
                required
              />
              <Button
                type="button"
                onClick={() => removeCategory(i)}
                variant="outline"
                className="text-red-500 border-red-200"
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
          {loading ? "Saving..." : "Create Event"}
        </Button>
      </div>
    </form>
  );
}
