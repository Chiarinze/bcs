"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TextInput } from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";
import { User, Upload, X, Shield, Calendar, MapPin, Music, Mail } from "lucide-react";
import type { EnsembleArm, Profile } from "@/types";

const CHOIR_PARTS = ["Soprano", "Alto", "Tenor", "Bass"] as const;
const ORCHESTRA_INSTRUMENTS = [
  "Violin", "Viola", "Cello", "Double Bass",
  "Flute", "Oboe", "Clarinet", "Bassoon",
  "French Horn", "Trumpet", "Trombone", "Tuba",
  "Percussion", "Piano", "Harp",
] as const;

const ENSEMBLE_LABELS: Record<string, string> = {
  choir: "Choir",
  orchestra: "Orchestra",
  choir_orchestra: "Choir & Orchestra",
  choir_band: "Choir & Band",
  orchestra_band: "Orchestra & Band",
  choir_orchestra_band: "Choir, Orchestra & Band",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  // Editable fields
  const [otherName, setOtherName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [ensembleArm, setEnsembleArm] = useState<EnsembleArm | "">("");
  const [choirPart, setChoirPart] = useState("");
  const [orchestraInstrument, setOrchestraInstrument] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single<Profile>();

      if (!data) {
        router.push("/profile-setup");
        return;
      }

      setProfile(data);
      populateForm(data);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  function populateForm(p: Profile) {
    setOtherName(p.other_name || "");
    setDateOfBirth(p.date_of_birth || "");
    setPhysicalAddress(p.physical_address || "");
    setEnsembleArm(p.ensemble_arm || "");
    setChoirPart(p.choir_part || "");
    setOrchestraInstrument(p.orchestra_instrument || "");
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  function handleCancel() {
    if (profile) populateForm(profile);
    setEditing(false);
    setError("");
    setSuccess("");
  }

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

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

    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expired. Please log in again.");
      setSaving(false);
      return;
    }

    let photoUrl = profile?.photo_url || null;

    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop()?.toLowerCase();
      const fileName = `${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("passports")
        .upload(fileName, photoFile, { upsert: true });

      if (uploadError) {
        setError(`Photo upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("passports").getPublicUrl(fileName);

      photoUrl = publicUrl;
    }

    const updateData = {
      other_name: otherName.trim() || null,
      date_of_birth: dateOfBirth || null,
      physical_address: physicalAddress.trim() || null,
      ensemble_arm: ensembleArm as EnsembleArm,
      choir_part: needsChoir ? choirPart : null,
      orchestra_instrument: needsOrchestra ? orchestraInstrument : null,
      photo_url: photoUrl,
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    // Refresh profile
    const { data: updated } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (updated) {
      setProfile(updated);
      populateForm(updated);
    }

    setSaving(false);
    setEditing(false);
    setSuccess("Profile updated successfully.");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 border-3 border-bcs-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const membershipLabel =
    profile.membership_status === "full_member"
      ? "Full Member"
      : "Probationary Member";

  const currentPhotoUrl = photoPreview || profile.photo_url;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-bcs-green">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage your profile information.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => {
              setEditing(true);
              setSuccess("");
            }}
            className="px-4 py-2 text-sm font-medium text-bcs-green border border-bcs-green rounded-full hover:bg-bcs-green hover:text-white transition"
          >
            Edit Profile
          </button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          {success}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-bcs-green/5 to-bcs-green/10 px-6 py-6">
          <div className="flex items-center gap-4">
            {editing ? (
              <div className="relative">
                {currentPhotoUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentPhotoUrl}
                      alt=""
                      className="w-20 h-20 rounded-full object-cover border-3 border-white shadow"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-20 h-20 rounded-full bg-gray-100 border-3 border-white shadow flex items-center justify-center cursor-pointer hover:bg-gray-200 transition">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
                {!currentPhotoUrl && (
                  <p className="text-[10px] text-gray-400 text-center mt-1">Upload</p>
                )}
              </div>
            ) : currentPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentPhotoUrl}
                alt=""
                className="w-20 h-20 rounded-full object-cover border-3 border-white shadow"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-bcs-green/10 border-3 border-white shadow flex items-center justify-center">
                <User className="w-8 h-8 text-bcs-green" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {profile.first_name} {profile.other_name ? `${profile.other_name} ` : ""}{profile.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.membership_status === "full_member"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  <Shield className="w-3 h-3" />
                  {membershipLabel}
                </span>
                {profile.membership_id && (
                  <span className="px-2.5 py-0.5 rounded-full bg-bcs-green/10 text-bcs-green text-xs font-mono font-medium">
                    {profile.membership_id}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        {editing ? (
          <form onSubmit={handleSave} className="p-6 space-y-5">
            {/* Non-editable fields shown as info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                Non-editable Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">First Name:</span>{" "}
                  <span className="text-gray-700 font-medium">{profile.first_name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Last Name:</span>{" "}
                  <span className="text-gray-700 font-medium">{profile.last_name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Email:</span>{" "}
                  <span className="text-gray-700 font-medium">{profile.email}</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>{" "}
                  <span className="text-gray-700 font-medium">{membershipLabel}</span>
                </div>
              </div>
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
              type="date"
              label="Date of Birth"
              name="date_of_birth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />

            <div className="space-y-1">
              <label htmlFor="physical_address" className="text-sm font-medium text-bcs-green">
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
              <label htmlFor="ensemble_arm" className="text-sm font-medium text-bcs-green">
                Ensemble Arm
              </label>
              <select
                id="ensemble_arm"
                value={ensembleArm}
                onChange={(e) => {
                  setEnsembleArm(e.target.value as EnsembleArm | "");
                  setChoirPart("");
                  setOrchestraInstrument("");
                }}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition bg-white"
                required
              >
                <option value="" disabled>Select your arm</option>
                <option value="choir">Choir</option>
                <option value="orchestra">Orchestra</option>
                <option value="choir_orchestra">Choir & Orchestra</option>
                <option value="choir_band">Choir & Band</option>
                <option value="orchestra_band">Orchestra & Band</option>
                <option value="choir_orchestra_band">Choir, Orchestra & Band</option>
              </select>
            </div>

            {/* Choir Part */}
            {ensembleArm && ["choir", "choir_orchestra", "choir_band", "choir_orchestra_band"].includes(ensembleArm) && (
              <div className="space-y-1">
                <label htmlFor="choir_part" className="text-sm font-medium text-bcs-green">
                  Choir Part
                </label>
                <select
                  id="choir_part"
                  value={choirPart}
                  onChange={(e) => setChoirPart(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition bg-white"
                  required
                >
                  <option value="" disabled>Select your part</option>
                  {CHOIR_PARTS.map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Orchestra Instrument */}
            {ensembleArm && ["orchestra", "choir_orchestra", "orchestra_band", "choir_orchestra_band"].includes(ensembleArm) && (
              <div className="space-y-1">
                <label htmlFor="orchestra_instrument" className="text-sm font-medium text-bcs-green">
                  Orchestra Instrument
                </label>
                <select
                  id="orchestra_instrument"
                  value={orchestraInstrument}
                  onChange={(e) => setOrchestraInstrument(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition bg-white"
                  required
                >
                  <option value="" disabled>Select your instrument</option>
                  {ORCHESTRA_INSTRUMENTS.map((inst) => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Photo upload when editing and already has a photo */}
            {editing && currentPhotoUrl && (
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-xl px-4 py-3 hover:border-bcs-green transition">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">
                  Change photo (JPEG or PNG, max 2MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                loading={saving}
                className="bg-bcs-green hover:bg-bcs-accent"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoField
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={profile.email}
              />
              <InfoField
                icon={<User className="w-4 h-4" />}
                label="Other Name"
                value={profile.other_name || "—"}
              />
              <InfoField
                icon={<Calendar className="w-4 h-4" />}
                label="Date of Birth"
                value={
                  profile.date_of_birth
                    ? new Date(profile.date_of_birth).toLocaleDateString("en-NG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"
                }
              />
              <InfoField
                icon={<MapPin className="w-4 h-4" />}
                label="Physical Address"
                value={profile.physical_address || "—"}
              />
              <InfoField
                icon={<Music className="w-4 h-4" />}
                label="Ensemble Arm"
                value={
                  profile.ensemble_arm
                    ? ENSEMBLE_LABELS[profile.ensemble_arm] || profile.ensemble_arm
                    : "—"
                }
              />
              {profile.choir_part && (
                <InfoField
                  icon={<Music className="w-4 h-4" />}
                  label="Choir Part"
                  value={profile.choir_part}
                />
              )}
              {profile.orchestra_instrument && (
                <InfoField
                  icon={<Music className="w-4 h-4" />}
                  label="Orchestra Instrument"
                  value={profile.orchestra_instrument}
                />
              )}
              <InfoField
                icon={<Calendar className="w-4 h-4" />}
                label="Year Joined"
                value={
                  profile.membership_status === "full_member" && profile.year_inducted
                    ? String(profile.year_inducted)
                    : "—"
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider font-medium">
        {icon}
        {label}
      </div>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}
