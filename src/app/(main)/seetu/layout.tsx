import { SeetuShell } from "@/components/seetu/seetu-shell";

export default function SeetuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SeetuShell>{children}</SeetuShell>;
}
