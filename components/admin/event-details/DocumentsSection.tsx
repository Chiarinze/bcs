"use client";

import { useState, useEffect, useCallback } from "react";
import { uploadEventDocument } from "@/lib/uploadDocument";
import { FileText, File as FileIcon, Trash2, ExternalLink, FileType } from "lucide-react";

interface Document {
  id: string;
  name: string;
  file_url: string;
  storage_path: string;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DocumentsSection({ event }: { event: any }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${event.slug}/documents`);
      const data = await res.json();
      if (res.ok) setDocuments(data);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  }, [event.slug]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // Helper to render the preview based on file extension
  const renderPreview = (url: string, name: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      return (
        <div className="h-12 w-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img src={url} alt={name} className="h-full w-full object-cover" />
        </div>
      );
    }

    return (
      <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-bcs-green/10 text-bcs-green border border-bcs-green/20">
        {ext === 'pdf' ? <FileText size={24} /> : <FileIcon size={24} />}
      </div>
    );
  };

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const friendlyName = prompt("Document Name (e.g. Order of Programme):");
    if (!friendlyName) return;

    setUploading(true);
    try {
      const { url, path } = await uploadEventDocument(file, event.id);
      const res = await fetch(`/api/events/${event.slug}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: friendlyName, file_url: url, storage_path: path, event_id: event.id }),
      });

      if (!res.ok) throw new Error("Failed to save record");
      fetchDocuments();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document?")) return;
    try {
      const res = await fetch(`/api/events/${event.slug}/documents?id=${docId}`, { method: "DELETE" });
      if (res.ok) setDocuments(prev => prev.filter(d => d.id !== docId));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) { alert(err.message); }
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-serif text-bcs-green">Event Documents</h2>
          <p className="text-sm text-gray-500">Upload programmes, schedules, or guest info.</p>
        </div>
        <label htmlFor="doc-upload" className="inline-block">
          <input type="file" id="doc-upload" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          <div className="inline-flex items-center gap-2 px-5 py-2.5 cursor-pointer rounded-full font-medium bg-bcs-green text-white hover:bg-bcs-accent transition-all hover-lift shadow-sm">
            {uploading ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileType size={18} />}
            {uploading ? "Uploading..." : "Add Document"}
          </div>
        </label>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-400">Loading...</div>
      ) : documents.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-xl">
          <p className="text-gray-400 italic">No documents uploaded for this event.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-bcs-green/30 hover:bg-gray-50/50 transition-all group">
              {renderPreview(doc.file_url, doc.name)}
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate" title={doc.name}>{doc.name}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  {doc.file_url.split('.').pop()} • {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-bcs-green transition-colors" title="View">
                  <ExternalLink size={18} />
                </a>
                <button onClick={() => handleDelete(doc.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}