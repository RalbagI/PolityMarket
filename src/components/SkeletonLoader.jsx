/**
 * Skeleton loader matching DetailView layout structure.
 * Shows animated placeholders while detail JSON is fetched.
 */
export default function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header: avatar + name + score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-800" />
          <div className="space-y-2">
            <div className="h-5 w-32 rounded bg-gray-800" />
            <div className="h-4 w-20 rounded-full bg-gray-800" />
          </div>
        </div>
        <div className="text-end space-y-1">
          <div className="h-8 w-14 rounded bg-gray-800" />
          <div className="h-3 w-16 rounded bg-gray-800" />
        </div>
      </div>

      {/* Accordion: AI Analysis */}
      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-800/50 flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-700" />
          <div className="h-4 w-24 rounded bg-gray-700" />
        </div>
        <div className="px-4 py-3 space-y-2">
          <div className="h-3 w-full rounded bg-gray-800" />
          <div className="h-3 w-4/5 rounded bg-gray-800" />
          <div className="h-3 w-3/5 rounded bg-gray-800" />
        </div>
      </div>

      {/* Accordion: Score Breakdown */}
      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-800/50 flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-700" />
          <div className="h-4 w-28 rounded bg-gray-700" />
        </div>
        <div className="px-4 py-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3 w-24 rounded bg-gray-800" />
                <div className="h-3 w-8 rounded bg-gray-800" />
              </div>
              <div className="h-2 w-full rounded-full bg-gray-800" />
            </div>
          ))}
          <div className="h-1.5 w-full rounded-full bg-gray-800 mt-2" />
        </div>
      </div>

      {/* Accordion: Sources */}
      <div className="border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-800/50 flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-700" />
          <div className="h-4 w-16 rounded bg-gray-700" />
        </div>
      </div>
    </div>
  );
}
