import { Suspense } from "react";
import { OwnedEventGate } from "@/components/account-gate";
import { FullScreenLoader } from "@/components/ui/kit";

export const instant = false;

// The slug is only known at request time, so the gate (which reads it with
// useParams) renders inside a Suspense boundary.
export default function OwnedEventLayout({ children }: LayoutProps<"/eventi/[slug]">) {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <OwnedEventGate>{children}</OwnedEventGate>
    </Suspense>
  );
}
