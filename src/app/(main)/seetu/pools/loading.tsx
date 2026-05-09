function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function SeetuPoolsLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* pool selector */}
      <div className="flex flex-col gap-2">
        <Bone className="h-4 w-10" />
        <Bone className="h-10 w-full max-w-md rounded-lg" />
      </div>

      {/* pool settings card */}
      <div className="rounded-xl border border-border p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Bone className="h-3 w-8" />
          <Bone className="h-9 w-full max-w-sm rounded-lg" />
        </div>
        <div className="flex flex-col gap-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-9 w-44 rounded-lg" />
        </div>
        <div className="flex flex-col gap-2">
          <Bone className="h-3 w-32" />
          <Bone className="h-9 w-44 rounded-lg" />
        </div>
      </div>

      {/* roster accordion */}
      <div className="flex flex-col gap-3">
        <Bone className="h-5 w-40" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
          >
            <div className="flex flex-col gap-1.5">
              <Bone className="h-4 w-16" />
              <Bone className="h-3 w-32" />
            </div>
            <Bone className="h-4 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
