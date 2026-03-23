"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TextInput } from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { IMAGES } from "@/assets/images";
import { Eye, EyeOff } from "lucide-react";

export default function MemberResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      router.push("/member-login");
      router.refresh();
    }, 2000);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F9F7] px-4">
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
          Set New Password
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Choose a strong password for your account
        </p>
      </div>

      {success ? (
        <div className="w-full max-w-sm bg-white shadow-md rounded-2xl p-8 border border-gray-100 text-center">
          <p className="text-green-600 font-medium">
            Password updated successfully
          </p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
        </div>
      ) : (
        <form
          onSubmit={handleReset}
          className="w-full max-w-sm bg-white shadow-md rounded-2xl p-8 border border-gray-100"
        >
          <div className="space-y-5">
            <div className="relative">
              <TextInput
                type={showPassword ? "text" : "password"}
                label="New Password"
                name="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="relative">
              <TextInput
                type={showConfirm ? "text" : "password"}
                label="Confirm Password"
                name="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 transition"
              >
                {showConfirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full bg-bcs-green hover:bg-bcs-accent mt-3"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      )}

      <p className="mt-6 text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Benin Chorale & Philharmonic
      </p>
    </div>
  );
}
