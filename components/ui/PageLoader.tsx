/**
 * Instant feedback while a route's server data loads (used by loading.tsx
 * files). Renders a thin animated bar at the top plus a centred spinner.
 */
export default function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="relative min-h-[60vh]">
      <div className="fixed top-0 left-0 right-0 h-1 z-[60] overflow-hidden bg-bcs-green/10">
        <div className="h-full w-1/3 bg-bcs-green animate-[loader_1.2s_ease-in-out_infinite]" />
      </div>
      <div className="flex flex-col items-center justify-center gap-3 py-32 text-gray-500">
        <span className="h-8 w-8 border-[3px] border-bcs-green border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}
