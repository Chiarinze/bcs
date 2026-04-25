"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TextInput } from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { IMAGES } from "@/assets/images";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

type View = "login" | "forgot" | "forgot-sent";

export default function MemberLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("login");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check if the account is verified by admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_verified, profile_completed, role, closed_at")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      setError("Unable to load your profile. Please contact support.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // Closed accounts cannot log in
    if (profile.closed_at) {
      await supabase.auth.signOut();
      router.push("/account-closed");
      return;
    }

    // Admin accounts should use the admin login page
    if (profile.role === "admin") {
      await supabase.auth.signOut();
      setError("Admin accounts must use the admin login page.");
      setLoading(false);
      return;
    }

    if (!profile.is_verified) {
      await supabase.auth.signOut();
      setError(
        "Your account is pending admin verification. Please check back later."
      );
      setLoading(false);
      return;
    }

    // If profile is not completed, redirect to profile setup
    if (!profile.profile_completed) {
      router.push("/profile-setup");
      router.refresh();
      return;
    }

    // Profile is complete — redirect to member dashboard
    router.push("/dashboard");
    router.refresh();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/member-login/reset-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setView("forgot-sent");
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
          {view === "login" ? "Member Login" : "Reset Password"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {view === "login"
            ? "Sign in to your member account"
            : "Enter your email to receive a reset link"}
        </p>
      </div>

      {view === "login" && (
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white shadow-md rounded-2xl p-8 border border-gray-100"
        >
          <div className="space-y-5">
            <TextInput
              type="email"
              label="Email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            <div className="relative">
              <TextInput
                type={showPassword ? "text" : "password"}
                label="Password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full bg-bcs-green hover:bg-bcs-accent mt-3"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setView("forgot");
              }}
              className="w-full text-sm text-bcs-green hover:underline mt-1"
            >
              Forgot password?
            </button>

            <p className="text-sm text-center text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-bcs-green hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      )}

      {view === "forgot" && (
        <form
          onSubmit={handleForgotPassword}
          className="w-full max-w-sm bg-white shadow-md rounded-2xl p-8 border border-gray-100"
        >
          <div className="space-y-5">
            <TextInput
              type="email"
              label="Email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full bg-bcs-green hover:bg-bcs-accent mt-3"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setView("login");
              }}
              className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-bcs-green mt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to login
            </button>
          </div>
        </form>
      )}

      {view === "forgot-sent" && (
        <div className="w-full max-w-sm bg-white shadow-md rounded-2xl p-8 border border-gray-100 text-center">
          <div className="space-y-4">
            <p className="text-green-600 font-medium">Check your email</p>
            <p className="text-sm text-gray-500">
              If an account exists for <strong>{email}</strong>, you will
              receive a password reset link shortly.
            </p>
            <button
              type="button"
              onClick={() => {
                setError("");
                setView("login");
              }}
              className="flex items-center justify-center gap-1 text-sm text-bcs-green hover:underline mx-auto mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to login
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Benin Chorale & Philharmonic
      </p>
    </div>
  );
}
