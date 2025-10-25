"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { TextInput } from "@/components/ui/FormInputs";
import Button from "@/components/ui/Button";
import Image from "next/image";
import { IMAGES } from "@/assets/images";

export default function AdminLogin() {
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const expected = process.env.NEXT_PUBLIC_ADMIN_PASS;
    if (pass === expected) {
      Cookies.set("admin_auth", pass, { expires: 1 });
      router.push("/admin/events");
    } else {
      alert("Invalid password");
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F9F7] px-4">
      {/* Logo and title */}
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
          Admin Access
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Secure area — authorized personnel only
        </p>
      </div>

      {/* Login form */}
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white shadow-md rounded-2xl p-8 border border-gray-100"
      >
        <div className="space-y-5">
          <TextInput
            type="password"
            label="Admin Password"
            name="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Enter your admin password"
            required
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-bcs-green hover:bg-bcs-accent mt-3"
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </div>
      </form>

      {/* Subtext */}
      <p className="mt-6 text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Benin Chorale & Philharmonic
      </p>
    </div>
  );
}
