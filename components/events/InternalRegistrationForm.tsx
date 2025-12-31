"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { TextInput, FileInput } from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";

interface Props {
  eventId: string;
  eventSlug: string;
  // We pass the real code from the server component to validate against safely
  // Or we can validate via server action. For simplicity, we'll validate via API lookup or prop if passed securely.
  // Better security: Validate code via server action/API.
}

export default function InternalRegistrationForm({ eventId }: Props) {
  const router = useRouter();

  // Stages: 'gate' | 'form' | 'success'
  const [stage, setStage] = useState<"gate" | "form" | "success">("gate");
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form Logic State
  const [ensembleArm, setEnsembleArm] = useState("");
  const [hasMedical, setHasMedical] = useState(false);

  // 1. Verify Access Code
  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // We verify against the DB to ensure code matches THIS event
    const { data } = await supabase
      .from("events")
      .select("access_code")
      .eq("id", eventId)
      .single();

    if (data && data.access_code === accessCodeInput) {
      setStage("form");
    } else {
      setError("Incorrect access code. Please try again.");
    }
    setLoading(false);
  }

  // 2. Submit Registration
  async function handleRegistration(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const passportFile = formData.get("passport") as File;

    if (!passportFile || passportFile.size === 0) {
      setError("Passport photograph is required.");
      setLoading(false);
      return;
    }

    try {
      // A. Upload Passport
      const fileExt = passportFile.name.split(".").pop();
      const fileName = `${eventId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("passports")
        .upload(fileName, passportFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("passports").getPublicUrl(fileName);

      // B. Insert Data
      const { error: dbError } = await supabase
        .from("internal_event_registrations")
        .insert({
          event_id: eventId,
          first_name: formData.get("first_name"),
          last_name: formData.get("last_name"),
          other_name: formData.get("other_name"),
          email: formData.get("email"),
          physical_address: formData.get("physical_address"),
          ensemble_arm: formData.get("ensemble_arm"),
          choir_part: formData.get("choir_part") || null,
          orchestra_instrument: formData.get("orchestra_instrument") || null,
          join_year: Number(formData.get("join_year")),
          has_medical_condition: hasMedical,
          medical_condition_details: hasMedical
            ? formData.get("medical_condition_details")
            : null,
          membership_status: formData.get("membership_status"),
          passport_url: publicUrl,
        });

      if (dbError) throw dbError;

      setStage("success");
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((err as any).message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // --- RENDER: GATE ---
  if (stage === "gate") {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <h3 className="text-xl font-serif text-bcs-green mb-2">
          Member Access
        </h3>
        <p className="text-gray-600 mb-6 text-sm">
          This is an internal event. Please enter the access code provided to
          the ensemble.
        </p>
        <form onSubmit={verifyCode} className="space-y-4">
          <TextInput
            value={accessCodeInput}
            onChange={(e) => setAccessCodeInput(e.target.value)}
            placeholder="Enter Code"
            className="text-center text-lg tracking-widest"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button loading={loading} className="w-full bg-bcs-green">
            Proceed to Registration
          </Button>
        </form>
      </div>
    );
  }

  // --- RENDER: SUCCESS ---
  if (stage === "success") {
    return (
      <div className="max-w-md mx-auto bg-green-50 p-8 rounded-2xl border border-green-100 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          ✓
        </div>
        <h3 className="text-xl font-bold text-green-800 mb-2">
          Registration Complete!
        </h3>
        <p className="text-green-700 mb-6">
          Your details have been submitted successfully.
        </p>
        <Button
          onClick={() => router.push("/events")}
          variant="outline"
          className="border-green-600 text-green-700"
        >
          Back to Events
        </Button>
      </div>
    );
  }

  // --- RENDER: FORM ---
  const years = Array.from(
    { length: 30 },
    (_, i) => new Date().getFullYear() - i
  );
  const showChoir = ["choir", "band_choir", "orchestra_choir", "all"].includes(
    ensembleArm
  );
  const showOrchestra = [
    "orchestra",
    "orchestra_band",
    "orchestra_choir",
    "all",
  ].includes(ensembleArm);

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-serif text-bcs-green mb-6 border-b border-gray-100 pb-4">
        Member Registration
      </h2>

      <form onSubmit={handleRegistration} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <TextInput name="first_name" label="First Name" required />
          <TextInput name="last_name" label="Last Name" required />
        </div>
        <TextInput name="other_name" label="Other Name (Optional)" />
        <TextInput name="email" type="email" label="Email Address" required />
        <TextInput name="physical_address" label="Physical Address" required />

        {/* Ensemble Arm */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-bcs-green">
            Which arm of the ensemble do you belong? *
          </label>
          <select
            name="ensemble_arm"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-bcs-accent outline-none"
            onChange={(e) => setEnsembleArm(e.target.value)}
            required
          >
            <option value="">Select...</option>
            <option value="choir">Choir</option>
            <option value="orchestra">Orchestra</option>
            <option value="band">Band</option>
            <option value="band_choir">Band & Choir</option>
            <option value="orchestra_band">Orchestra & Band</option>
            <option value="orchestra_choir">Orchestra & Choir</option>
            <option value="all">All</option>
          </select>
        </div>

        {/* Conditional: Choir Part */}
        {showChoir && (
          <div className="space-y-1 bg-gray-50 p-4 rounded-xl animate-in fade-in">
            <label className="text-sm font-medium text-bcs-green">
              What is your voice part?
            </label>
            <select
              name="choir_part"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
              required
            >
              <option value="">Select Part...</option>
              <option value="soprano">Soprano</option>
              <option value="alto">Alto</option>
              <option value="counter_tenor">Counter Tenor</option>
              <option value="tenor">Tenor</option>
              <option value="baritone">Baritone</option>
              <option value="bass">Bass</option>
            </select>
          </div>
        )}

        {/* Conditional: Orchestra Instrument */}
        {showOrchestra && (
          <div className="space-y-1 bg-gray-50 p-4 rounded-xl animate-in fade-in">
            <label className="text-sm font-medium text-bcs-green">
              What instrument do you play?
            </label>
            <select
              name="orchestra_instrument"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
              required
            >
              <option value="">Select Instrument...</option>
              <option value="violin">Violin</option>
              <option value="viola">Viola</option>
              <option value="cello">Cello</option>
              <option value="flute">Flute</option>
              <option value="trumpet">Trumpet</option>
              <option value="trombone">Trombone</option>
              <option value="saxophone">Saxophone</option>
              <option value="piano">Piano</option>
            </select>
          </div>
        )}

        {/* Year Joined */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-bcs-green">
            Year Joined *
          </label>
          <select
            name="join_year"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
            required
          >
            <option value="">Select Year...</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Medical History */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-bcs-green">
            Do you have any medical history/condition? *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="medical_bool"
                value="yes"
                onChange={() => setHasMedical(true)}
                className="text-bcs-green focus:ring-bcs-accent"
              />{" "}
              Yes
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="medical_bool"
                value="no"
                onChange={() => setHasMedical(false)}
                defaultChecked
                className="text-bcs-green focus:ring-bcs-accent"
              />{" "}
              No
            </label>
          </div>

          {hasMedical && (
            <div className="animate-in fade-in">
              <TextInput
                name="medical_condition_details"
                label="Please specify the condition"
                required={hasMedical}
              />
            </div>
          )}
        </div>

        {/* Membership Status */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-bcs-green">
            Membership Status *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 border px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="membership_status"
                value="full_member"
                required
                className="text-bcs-green focus:ring-bcs-accent"
              />
              Full Member
            </label>
            <label className="flex items-center gap-2 border px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="membership_status"
                value="inductee"
                required
                className="text-bcs-green focus:ring-bcs-accent"
              />
              Inductee
            </label>
          </div>
        </div>

        {/* Passport Upload */}
        <div className="pt-2">
          <FileInput
            name="passport"
            label="Passport Photograph *"
            accept="image/*"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Please upload a clear headshot.
          </p>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-bcs-accent hover:bg-bcs-green text-lg py-3"
        >
          {loading ? "Registering..." : "Complete Registration"}
        </Button>
      </form>
    </div>
  );
}
