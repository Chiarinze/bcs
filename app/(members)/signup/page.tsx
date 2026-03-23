"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TextInput } from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { IMAGES } from "@/assets/images";
import { Eye, EyeOff } from "lucide-react";
import type { MembershipStatus } from "@/types";
import Link from "next/link";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [membershipStatus, setMembershipStatus] =
    useState<MembershipStatus>("probationary");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
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

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          membership_status: membershipStatus,
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // Sign out immediately — member cannot use the app until admin verifies
    await supabase.auth.signOut();

    setLoading(false);
    setSuccess(true);
  }

  if (success) {
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
        </div>

        <div className="w-full max-w-sm bg-white shadow-md rounded-2xl p-8 border border-gray-100 text-center">
          <h2 className="text-xl font-serif text-bcs-green mb-3">
            Account Created
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your account has been created successfully. An administrator will
            review and verify your account. You will receive an email at the
            address you registered with, <strong>{email}</strong>, once your
            account is approved.
          </p>
          <button
            onClick={() => router.push("/member-login")}
            className="mt-5 text-sm text-bcs-green hover:underline"
          >
            Go to Login
          </button>
        </div>

        <p className="mt-6 text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Benin Chorale & Philharmonic
        </p>
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
          Member Signup
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Create your member account
        </p>
      </div>

      <form
        onSubmit={handleSignup}
        className="w-full max-w-sm bg-white shadow-md rounded-2xl p-8 border border-gray-100"
      >
        <div className="space-y-5">
          <TextInput
            type="text"
            label="First Name"
            name="first_name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter your first name"
            required
          />

          <TextInput
            type="text"
            label="Last Name"
            name="last_name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter your last name"
            required
          />

          <TextInput
            type="email"
            label="Email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <div className="space-y-1">
            <label
              htmlFor="membership_status"
              className="text-sm font-medium text-bcs-green"
            >
              Membership Status
            </label>
            <select
              id="membership_status"
              name="membership_status"
              value={membershipStatus}
              onChange={(e) =>
                setMembershipStatus(e.target.value as MembershipStatus)
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-bcs-accent focus:border-bcs-accent outline-none transition bg-white"
              required
            >
              <option value="full_member">Full Member</option>
              <option value="probationary">Probationary Member</option>
            </select>
          </div>

          <div className="relative">
            <TextInput
              type={showPassword ? "text" : "password"}
              label="Password"
              name="password"
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
              name="confirm_password"
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
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>

          <p className="text-sm text-center text-gray-500">
            Already have an account?{" "}
            <Link
              href="/member-login"
              className="text-bcs-green hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </form>

      <p className="mt-6 text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Benin Chorale & Philharmonic
      </p>
    </div>
  );
}
