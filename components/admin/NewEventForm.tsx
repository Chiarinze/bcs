"use client";

import { useState } from "react";
import { uploadEventImage } from "@/lib/uploadImage";
import { useRouter } from "next/navigation";
import { TextInput, TextArea, FileInput } from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";

type EventType = "standard" | "internal" | "audition";

// interface TicketCategory {
//   name: string;
//   price: number;
// }

export default function NewEventForm() {
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState<EventType>("standard");
  const [isPaid, setIsPaid] = useState(false);

  // Reuse categories state: For standard it's tickets, for auditions it's time slots
  const [categories, setCategories] = useState<
    { name: string; price: number }[]
  >([]);

  const router = useRouter();

  const addCategory = () =>
    setCategories([...categories, { name: "", price: 0 }]);
  const removeCategory = (index: number) =>
    setCategories(categories.filter((_, i) => i !== index));
  const updateCategory = (
    index: number,
    field: "name" | "price",
    value: string
  ) => {
    const updated = [...categories];
    if (field === "price") updated[index].price = Number(value);
    else updated[index].name = value;
    setCategories(updated);
  };

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

      const endDate = formData.get("end_date") as string;
      const eventData = {
        title: formData.get("title"),
        description: formData.get("description"),
        date: formData.get("date"),
        end_date: endDate || null,
        location: formData.get("location"),
        event_type: eventType,
        is_internal: eventType === "internal",
        is_paid: eventType === "standard" ? isPaid : false,
        image_url,
        image_blur_data,
        // Send categories as either tickets or time slots
        categories: eventType === "internal" ? [] : categories,
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) throw new Error("Failed to create event");

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
        placeholder="e.g., 2026 Choir Auditions"
        required
      />
      <TextArea name="description" label="Description" required />
      <div className="grid grid-cols-2 gap-4">
        <TextInput type="date" name="date" label="Start Date" required />
        <TextInput type="date" name="end_date" label="End Date (optional)" />
      </div>
      <TextInput name="location" label="Venue/Location" required />

      {/* Type Selector */}
      <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
        <h3 className="font-medium text-bcs-green">Event Type</h3>
        <div className="flex flex-wrap gap-4">
          {(["standard", "internal", "audition"] as const).map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 cursor-pointer capitalize"
            >
              <input
                type="radio"
                name="event_type_radio"
                checked={eventType === type}
                onChange={() => {
                  setEventType(type);
                  setCategories([]); // Reset categories when type changes
                }}
                className="text-bcs-green focus:ring-bcs-accent"
              />
              <span className="text-gray-700">{type}</span>
            </label>
          ))}
        </div>


        {eventType === "standard" && (
          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="rounded text-bcs-green"
            />
            <span className="text-gray-700">This is a paid event</span>
          </label>
        )}
      </div>

      {/* Dynamic Section: Tickets OR Time Slots */}
      {eventType !== "internal" && (
        <div className="space-y-3">
          <h3 className="text-bcs-green font-medium">
            {eventType === "audition"
              ? "Audition Time Slots"
              : "Ticket Categories"}
          </h3>
          <p className="text-xs text-gray-500">
            {eventType === "audition"
              ? "Add available time intervals for candidates to choose from."
              : "Define ticket types and their prices."}
          </p>

          {categories.map((cat, i) => (
            <div
              key={i}
              className="flex gap-2 items-center animate-in zoom-in-95 duration-200"
            >
              <TextInput
                value={cat.name}
                onChange={(e) => updateCategory(i, "name", e.target.value)}
                placeholder={
                  eventType === "audition"
                    ? "e.g., 09:00 AM - 10:00 AM"
                    : "Category Name"
                }
                className="flex-1"
                required
              />
              {eventType === "standard" && isPaid && (
                <TextInput
                  type="number"
                  value={cat.price}
                  onChange={(e) => updateCategory(i, "price", e.target.value)}
                  placeholder="Price"
                  className="w-32"
                  required
                />
              )}
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
          <Button type="button" onClick={addCategory} className="text-sm py-2">
            + Add {eventType === "audition" ? "Time Slot" : "Category"}
          </Button>
        </div>
      )}

      <FileInput name="image" accept="image/*" label="Event Flyer" />

      <div className="pt-4">
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create Event"}
        </Button>
      </div>
    </form>
  );
}
