"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TextInput } from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { IMAGES } from "@/assets/images";
import { Upload, X } from "lucide-react";
import type { EnsembleArm, ProfileSetupData } from "@/types";

const CHOIR_PARTS = ["Soprano", "Alto", "Tenor", "Bass"] as const;
const ORCHESTRA_INSTRUMENTS = [
  "Violin",
  "Viola",
  "Cello",
  "Double Bass",
  "Flute",
  "Oboe",
  "Clarinet",
  "Bassoon",
  "French Horn",
  "Trumpet",
  "Trombone",
  "Tuba",
  "Percussion",
  "Piano",
  "Harp",
] as const;

export default function ProfileSetupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [otherName, setOtherName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [ensembleArm, setEnsembleArm] = useState<EnsembleArm | "">("");
  const [choirPart, setChoirPart] = useState("");
  const [orchestraInstrument, setOrchestraInstrument] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/member-login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, profile_completed")
        .eq("id", user.id)
        .single<{
          first_name: string;
          last_name: string;
          email: string;
          profile_completed: boolean;
        }>();

      if (profile?.profile_completed) {
        router.push("/dashboard");
        return;
      }

      if (profile) {
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setEmail(profile.email || user.email || "");
      }

      setPageLoading(false);
    }

    loadProfile();
  }, [router]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Profile picture must be less than 2MB");
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Only JPEG and PNG images are allowed");
      return;
    }

    setError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!ensembleArm) {
      setError("Please select your ensemble arm");
      return;
    }

    const needsChoir = ["choir", "choir_orchestra", "choir_band", "choir_orchestra_band"].includes(ensembleArm);
    const needsOrchestra = ["orchestra", "choir_orchestra", "orchestra_band", "choir_orchestra_band"].includes(ensembleArm);

    if (needsChoir && !choirPart) {
      setError("Please select your choir part");
      return;
    }

    if (needsOrchestra && !orchestraInstrument) {
      setError("Please select your instrument");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expired. Please log in again.");
      setLoading(false);
      return;
    }

    let photoUrl: string | null = null;

    // Upload photo if provided
    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop()?.toLowerCase();
      const fileName = `${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("passports")
        .upload(fileName, photoFile, { upsert: true });

      if (uploadError) {
        setError(`Photo upload failed: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("passports").getPublicUrl(fileName);

      photoUrl = publicUrl;
    }

    const profileData: Omit<ProfileSetupData, "photo_url"> & {
      photo_url: string | null;
      profile_completed: boolean;
    } = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      other_name: otherName.trim(),
      date_of_birth: dateOfBirth,
      physical_address: physicalAddress.trim(),
      ensemble_arm: ensembleArm as EnsembleArm,
      choir_part: needsChoir ? choirPart : null,
      orchestra_instrument: needsOrchestra ? orchestraInstrument : null,
      photo_url: photoUrl,
      profile_completed: true,
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(profileData)
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9F9F7]">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 border-3 border-bcs-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F9F7] px-4 py-10">
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow">
          <Image
            src={IMAGES.logo}
            alt="BCS logo"
            width={80}
            height={80}
            priority
          />
        </div>
        <h1 className="mt-4 text-2xl font-serif text-bcs-green">
          Complete Your Profile
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Please fill in the details below to continue
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white shadow-md rounded-2xl p-5 sm:p-8 border border-gray-100"
      >
        <div className="space-y-5">
          {/* Pre-filled fields */}
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              type="text"
              label="First Name"
              name="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <TextInput
              type="text"
              label="Last Name"
              name="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <TextInput
            type="text"
            label="Other Name"
            name="other_name"
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
            placeholder="Middle name or other names"
          />

          <TextInput
            type="email"
            label="Email"
            name="email"
            value={email}
            disabled
            className="bg-gray-50 text-gray-500 cursor-not-allowed"
          />

          <TextInput
            type="date"
            label="Date of Birth"
            name="date_of_birth"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label
              htmlFor="physical_address"
              className="text-sm font-medium text-bcs-green"
            >
              Physical Address
            </label>
            <textarea
              id="physical_address"
              name="physical_address"
              value={physicalAddress}
              onChange={(e) => setPhysicalAddress(e.target.value)}
              placeholder="Enter your residential address"
              rows={3}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition"
            />
          </div>

          {/* Ensemble Arm */}
          <div className="space-y-1">
            <label
              htmlFor="ensemble_arm"
              className="text-sm font-medium text-bcs-green"
            >
              What Arm of the Ensemble do you Belong?
            </label>
            <select
              id="ensemble_arm"
              name="ensemble_arm"
              value={ensembleArm}
              onChange={(e) => {
                setEnsembleArm(e.target.value as EnsembleArm | "");
                setChoirPart("");
                setOrchestraInstrument("");
              }}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition bg-white"
              required
            >
              <option value="" disabled>
                Select your arm
              </option>
              <option value="choir">Choir</option>
              <option value="orchestra">Orchestra</option>
              <option value="choir_orchestra">Choir & Orchestra</option>
              <option value="choir_band">Choir & Band</option>
              <option value="orchestra_band">Orchestra & Band</option>
              <option value="choir_orchestra_band">Choir, Orchestra & Band</option>
            </select>
          </div>

          {/* Choir Part — shown if selection includes choir */}
          {ensembleArm && ["choir", "choir_orchestra", "choir_band", "choir_orchestra_band"].includes(ensembleArm) && (
            <div className="space-y-1">
              <label
                htmlFor="choir_part"
                className="text-sm font-medium text-bcs-green"
              >
                What Part? (Choir)
              </label>
              <select
                id="choir_part"
                name="choir_part"
                value={choirPart}
                onChange={(e) => setChoirPart(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition bg-white"
                required
              >
                <option value="" disabled>
                  Select your part
                </option>
                {CHOIR_PARTS.map((part) => (
                  <option key={part} value={part}>
                    {part}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Orchestra Instrument — shown if selection includes orchestra */}
          {ensembleArm && ["orchestra", "choir_orchestra", "orchestra_band", "choir_orchestra_band"].includes(ensembleArm) && (
            <div className="space-y-1">
              <label
                htmlFor="orchestra_instrument"
                className="text-sm font-medium text-bcs-green"
              >
                What Instrument? (Orchestra)
              </label>
              <select
                id="orchestra_instrument"
                name="orchestra_instrument"
                value={orchestraInstrument}
                onChange={(e) => setOrchestraInstrument(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition bg-white"
                required
              >
                <option value="" disabled>
                  Select your instrument
                </option>
                {ORCHESTRA_INSTRUMENTS.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Profile Picture (optional) */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-bcs-green">
              Profile Picture{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>

            {photoPreview ? (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-bcs-green">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" /> Remove
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-xl px-4 py-3 hover:border-bcs-green transition">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">
                  Upload photo (JPEG or PNG, max 2MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-bcs-green hover:bg-bcs-accent mt-3"
          >
            {loading ? "Saving..." : "Complete Profile"}
          </Button>
        </div>
      </form>

      <p className="mt-6 text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Benin Chorale & Philharmonic
      </p>
    </div>
  );
}
