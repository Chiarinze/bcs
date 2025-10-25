"use client";

import { useEffect, useState } from "react";
import { uploadEventImage } from "@/lib/uploadImage";
import { useRouter } from "next/navigation";
import { TextInput, TextArea, Checkbox, FileInput } from "@/components/ui/FormInputs";
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
  const router = useRouter();

  useEffect(() => {
    async function fetchCategories() {
      const res = await fetch(`/api/tickets/categories?event_id=${event.id}`);
      const data = await res.json();
      setCategories(data || []);
    }
    fetchCategories();
  }, [event.id]);

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
      field === "price" ? (Number(value) as TicketCategory[K]) : (value as TicketCategory[K]);
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
        is_paid: formData.get("is_paid") === "on",
        image_url,
        image_blur_data,
        categories,
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
        body: JSON.stringify({ path: "/events", adminKey: process.env.NEXT_PUBLIC_ADMIN_PASS }),
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
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <TextInput name="title" label="Event Title" defaultValue={event.title} required />
      <TextArea name="description" label="Description" defaultValue={event.description} required />
      <TextInput type="date" name="date" label="Date" defaultValue={event.date?.split("T")[0]} required />
      <TextInput name="location" label="Location" defaultValue={event.location} required />
      <Checkbox name="is_paid" label="This is a paid event" defaultChecked={event.is_paid} />

      {/* Ticket Categories */}
      <div className="space-y-3">
        <h3 className="text-bcs-green font-medium">Ticket Categories</h3>
        {categories.map((cat, i) => (
          <div key={i} className="flex gap-2 items-center">
            <TextInput
              value={cat.name}
              onChange={(e) => updateCategory(i, "name", e.target.value)}
              placeholder="Category name (e.g. VIP, Regular)"
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
        <Button type="button" onClick={addCategory} className="bg-bcs-green hover:bg-bcs-accent">
          + Add Category
        </Button>
      </div>

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
