function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function PasswordManagerLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-32" />
        <Bone className="h-8 w-16 rounded-lg" />
      </div>
      <Bone className="h-10 w-full rounded-lg" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Bone className="h-4 w-36" />
              <Bone className="h-4 w-16 rounded-full" />
            </div>
            <Bone className="h-3 w-48" />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Bone className="h-3 w-20" />
                <Bone className="h-3 w-40" />
              </div>
              <div className="flex items-center gap-2">
                <Bone className="h-3 w-20" />
                <Bone className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
