"use client";

import { Download } from "lucide-react";

export default function DownloadButton({
  url,
  fileName,
}: {
  url: string;
  fileName: string;
}) {
  const downloadFile = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;

      // Get extension from URL
      const ext = url.split(".").pop();
      link.download = `${fileName}.${ext}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed", error);
      // Fallback: just open in new tab if fetch fails
      window.open(url, "_blank");
    }
  };

  return (
    <button
      onClick={downloadFile}
      className="flex-shrink-0 ml-2 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-bcs-green hover:text-white transition-colors shadow-sm"
    >
      <Download size={18} />
    </button>
  );
}
