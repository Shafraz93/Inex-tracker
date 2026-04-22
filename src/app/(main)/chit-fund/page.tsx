import { redirect } from "next/navigation";

/** Legacy route — rotating savings now lives under /seetu. */
export default function ChitFundPage() {
  redirect("/seetu/pools");
}
