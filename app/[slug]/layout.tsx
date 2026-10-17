import { Suspense } from "react";
import { GuestShell } from "@/components/guest-shell";
import { FullScreenLoader } from "@/components/ui/kit";

// The album is loaded in the browser (Firebase), so navigations into it block
// on the client: opt out of instant validation.
export const instant = false;

// The slug is only known at request time, so the shell (which reads it with
// useParams) renders inside a Suspense boundary.
export default function AlbumLayout({ children }: LayoutProps<"/[slug]">) {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <GuestShell>{children}</GuestShell>
    </Suspense>
  );
}
