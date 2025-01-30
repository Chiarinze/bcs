import { Facebook, Instagram, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">BCS</h3>
            <p className="text-gray-400">
              Inspiring musical excellence since 2012
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Contact</h3>
            <p className="text-gray-400">Benin City, Edo State</p>
            <p className="text-gray-400">Nigeria</p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <Facebook className="h-6 w-6 text-gray-400 hover:text-white cursor-pointer" />
              {/* <Twitter className="h-6 w-6 text-gray-400 hover:text-white cursor-pointer" /> */}
              <Instagram className="h-6 w-6 text-gray-400 hover:text-white cursor-pointer" />
              <Youtube className="h-6 w-6 text-gray-400 hover:text-white cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} Benin Chorale & Philharmonic
            Nigeria. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
