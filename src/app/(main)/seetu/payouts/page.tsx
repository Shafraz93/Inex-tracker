import { SeetuPayoutsPanel } from "@/components/seetu/seetu-payouts-panel";

export default function SeetuPayoutsPage() {
  return (
    <>
      <header className="mb-8 max-w-2xl">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Payouts
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Each month everyone pays their share; you collect the total. The
          person whose <strong>turn</strong> matches that month receives the{" "}
          <strong>full pot</strong>. Mark who has paid you and adjust dates or
          receiver if needed.
        </p>
      </header>
      <SeetuPayoutsPanel />
    </>
  );
}
