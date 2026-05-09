function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function SeetuPayoutsLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* pool selector */}
      <div className="flex flex-col gap-2">
        <Bone className="h-4 w-10" />
        <Bone className="h-10 w-full max-w-md rounded-lg" />
      </div>

      {/* pool details card */}
      <div className="rounded-xl border border-border p-4">
        <Bone className="mb-3 h-4 w-24" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <Bone className="mb-2 h-3 w-20" />
              <Bone className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* payouts accordion */}
      <div className="flex flex-col gap-2">
        <Bone className="mb-2 h-5 w-16" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
          >
            <div className="flex flex-col gap-1.5">
              <Bone className="h-4 w-28" />
              <Bone className="h-3 w-44" />
            </div>
            <Bone className="h-4 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
