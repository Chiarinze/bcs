"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TextInput, FileInput } from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";

interface Props {
  eventId: string;
}

export default function AuditionRegistrationForm({ eventId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [solfaScore, setSolfaScore] = useState(5);
  const [staffScore, setStaffScore] = useState(5);

  const [auditionType, setAuditionType] = useState<"voice" | "instrument">(
    "voice"
  );
  const [timeSlots, setTimeSlots] = useState<{ id: string; name: string }[]>(
    []
  );

  // Fetch available time slots (stored as categories for this event)
  useEffect(() => {
    async function fetchSlots() {
      const { data } = await supabase
        .from("ticket_categories")
        .select("id, name")
        .eq("event_id", eventId);
      if (data) setTimeSlots(data);
    }
    fetchSlots();
  }, [eventId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const photoFile = formData.get("photo") as File;

    if (!photoFile || photoFile.size === 0) {
      setError("A photo of yourself is required.");
      setLoading(false);
      return;
    }

    try {
      // 1. Upload Photo
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `auditions/${eventId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("passports")
        .upload(fileName, photoFile);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("passports").getPublicUrl(fileName);

      // 2. Submit to audition_registrations table
      const { error: dbError } = await supabase
        .from("audition_registrations")
        .insert({
          event_id: eventId,
          first_name: formData.get("first_name"),
          last_name: formData.get("last_name"),
          email: formData.get("email"),
          phone_number: formData.get("phone_number"),
          physical_address: formData.get("physical_address"),
          date_of_birth: formData.get("dob"),
          audition_type: auditionType,
          instrument_name:
            auditionType === "instrument"
              ? formData.get("instrument_name")
              : null,
          voice_part:
            auditionType === "voice" ? formData.get("voice_part") : null,
          tonic_solfa_score: Number(formData.get("tonic_solfa")),
          staff_notation_score: Number(formData.get("staff_notation")),
          photo_url: publicUrl,
          preferred_time: formData.get("preferred_time"),
          attestation: formData.get("attestation") === "on",
        });

      if (dbError) throw dbError;
      setSuccess(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-serif text-bcs-green mb-2">
          Registration Received!
        </h2>
        <p className="text-gray-600 mb-6">
          Thank you for applying. We will contact you via email regarding your
          audition.
        </p>
        <Button onClick={() => router.push("/events")} className="w-full">
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <TextInput name="first_name" label="First Name" required />
        <TextInput name="last_name" label="Last Name" required />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <TextInput name="email" type="email" label="Email Address" required />
        <TextInput
          name="phone_number"
          type="tel"
          label="Phone Number"
          required
        />
      </div>

      <TextInput name="physical_address" label="Physical Address" required />
      <TextInput name="dob" type="date" label="Date of Birth" required />

      <div className="space-y-3">
        <label className="text-sm font-medium text-bcs-green">
          Audition Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={auditionType === "voice"}
              onChange={() => setAuditionType("voice")}
              className="text-bcs-green"
            />{" "}
            Voice
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={auditionType === "instrument"}
              onChange={() => setAuditionType("instrument")}
              className="text-bcs-green"
            />{" "}
            Instrument
          </label>
        </div>
      </div>

      {auditionType === "voice" ? (
        <div className="animate-in fade-in slide-in-from-top-1">
          <label className="text-sm font-medium text-bcs-green block mb-1">
            Voice Part
          </label>
          <select
            name="voice_part"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
            required
          >
            <option value="">Select Part...</option>
            <option value="Soprano">Soprano</option>
            <option value="Alto">Alto</option>
            <option value="Tenor">Tenor</option>
            <option value="Bass">Bass</option>
          </select>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-top-1">
          <TextInput
            name="instrument_name"
            label="What instrument?"
            placeholder="e.g. Cello, Flute"
            required
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* TONIC SOLFA SLIDER */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-bcs-green flex justify-between items-center">
            Tonic Solfa Level
            <span className="bg-bcs-green/10 text-bcs-green px-2 py-1 rounded-md text-xs">
              {solfaScore}/10
            </span>
          </label>
          <div className="relative pt-2">
            <input
              name="tonic_solfa"
              type="range"
              min="1"
              max="10"
              value={solfaScore}
              onChange={(e) => setSolfaScore(Number(e.target.value))}
              className="w-full accent-bcs-green h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-2">
              <span>Beginner (d-r-m)</span>
              <span>Expert</span>
            </div>
          </div>
        </div>

        {/* STAFF NOTATION SLIDER */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-bcs-green flex justify-between items-center">
            Staff Notation Level
            <span className="bg-bcs-accent/10 text-bcs-accent px-2 py-1 rounded-md text-xs">
              {staffScore}/10
            </span>
          </label>
          <div className="relative pt-2">
            <input
              name="staff_notation"
              type="range"
              min="1"
              max="10"
              value={staffScore}
              onChange={(e) => setStaffScore(Number(e.target.value))}
              className="w-full accent-bcs-accent h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-2">
              <span>Basic Reading</span>
              <span>Advanced Sight-Reading</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-bcs-green block">
          Preferred Audition Time
        </label>
        <select
          name="preferred_time"
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
          required
        >
          <option value="">Select a time slot...</option>
          {timeSlots.map((slot) => (
            <option key={slot.id} value={slot.name}>
              {slot.name}
            </option>
          ))}
        </select>
      </div>

      <FileInput
        name="photo"
        label="Upload Photo of Yourself"
        accept="image/*"
        required
      />

      <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer">
        <input
          type="checkbox"
          name="attestation"
          required
          className="mt-1 rounded text-bcs-green"
        />
        <span className="text-sm text-gray-600">
          I attest that all data provided is true and belongs to me.
        </span>
      </label>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <Button
        type="submit"
        loading={loading}
        className="w-full bg-bcs-accent py-4 text-lg"
      >
        Submit Audition Application
      </Button>
    </form>
  );
}
