import Link from "next/link";
import Button from "@/components/ui/Button";
import { CheckCircle, Heart } from "lucide-react";

interface Props {
  searchParams: Promise<{ ref?: string; name?: string }>;
}

export const metadata = {
  title: "Thank You | The Benin Chorale & Philharmonic",
  description: "Your donation was successful. Thank you for your generosity!",
};

export default async function DonationSuccessPage({ searchParams }: Props) {
  const { ref, name } = await searchParams;
  const donorName = name || "Friend";

  return (
    <section className="py-20 bg-[#F9F9F7] min-h-screen flex items-center">
      <div className="max-w-lg mx-auto px-4 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-3xl font-serif text-bcs-green mb-3">
            Thank You, {donorName}!
          </h1>

          <p className="text-gray-600 mb-2">
            Your generous donation has been received successfully.
          </p>

          <p className="text-gray-500 text-sm mb-6">
            Your support helps us continue bringing harmony, passion, and
            artistry to audiences across Nigeria and beyond.
          </p>

          {ref && (
            <p className="text-xs text-gray-400 mb-6">
              Reference: <span className="font-mono">{ref}</span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/events">
              <Button
                variant="outline"
                className="px-6 py-2.5 rounded-full"
              >
                View Events
              </Button>
            </Link>
            <Link href="/donate">
              <Button className="px-6 py-2.5 bg-bcs-green hover:bg-bcs-accent rounded-full flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Donate Again
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
