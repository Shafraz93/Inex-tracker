import { SeetuPoolsPanel } from "@/components/seetu/seetu-pools-panel";

export default function SeetuPoolsPage() {
  return (
    <>
      <header className="mb-8 max-w-2xl">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Pools
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Create pools, set the <strong>first month</strong> (turn #1), define
          the <strong>slot</strong> amount, and build the roster. Then use{" "}
          <strong>Payouts</strong> to track monthly collections. Data stays in
          this browser until you add a backend later.
        </p>
      </header>
      <SeetuPoolsPanel />
    </>
  );
}
